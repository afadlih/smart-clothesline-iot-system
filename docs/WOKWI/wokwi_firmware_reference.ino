#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ==============================
// WIFI & MQTT CONFIG
// ==============================
const char* ssid = "Wokwi-GUEST";
const char* password = "";

const char* mqtt_server = "YOUR_MQTT_HOST";
const int mqtt_port = 8883;
const char* mqtt_user = "YOUR_MQTT_USERNAME";
const char* mqtt_pass = "YOUR_MQTT_PASSWORD";

const char* device_id = "wokwi-default";
const char* deviceName = "Wokwi Clothesline";

const char* topic_sensor = "smart-clothesline/sensor";
const char* topic_command = "smart-clothesline/command";
const char* topic_status = "smart-clothesline/status";
const char* topic_discovery = "smart-clothesline/pairing/discovery";

// ==============================
// PIN CONFIG
// ==============================
#define DHTPIN 15
#define DHTTYPE DHT22
const int rainPin = 34;
const int ldrPin = 35;
const int servoPin = 18;

// ==============================
// SERVO & LIGHT CONFIG
// ==============================
#define SERVO_OPEN 90
#define SERVO_CLOSE 0
const int LIGHT_NORMALIZED_MIN = 0;
const int LIGHT_NORMALIZED_MAX = 10000;
const int LIGHT_DARK_THRESHOLD = 3000;

WiFiClientSecure espClient;
PubSubClient client(espClient);
Servo myservo;
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

int currentPos = SERVO_OPEN;
String currentStatus = "OPEN";
String controlMode = "AUTO";
String lastCommand = "AUTO";

unsigned long lastSensorPublish = 0;
unsigned long lastDiscoveryPublish = 0;
const long sensorInterval = 3000;
const long discoveryInterval = 5000;

int normalizeLightFromRaw(int rawAdc) {
  // Wokwi LDR: bright -> low ADC, dark -> high ADC
  // We want: higher light = brighter
  long normalized = map(rawAdc, 4095, 0, LIGHT_NORMALIZED_MIN, LIGHT_NORMALIZED_MAX);
  return constrain((int)normalized, LIGHT_NORMALIZED_MIN, LIGHT_NORMALIZED_MAX);
}

void setup_wifi() {
  WiFi.begin(ssid, password);
  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void updateLCD(float temp, float hum) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(currentStatus);
  lcd.print(" ");
  lcd.print(controlMode);
  lcd.setCursor(0, 1);
  lcd.print("T:");
  lcd.print((int)temp);
  lcd.print(" H:");
  lcd.print((int)hum);
}

// ==============================
// MQTT HELPERS
// ==============================
bool publishJson(const char* topic, const char* payload, bool retained = false) {
  if (!client.connected()) {
    Serial.print("[MQTT_SKIP] not connected, topic=");
    Serial.println(topic);
    return false;
  }

  bool ok = client.publish(topic, payload, retained);
  if (!ok) {
    Serial.print("[MQTT_FAIL] topic=");
    Serial.println(topic);
  }
  return ok;
}

void publishPairingDiscovery() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = device_id;
  doc["deviceName"] = deviceName;
  doc["pairingCode"] = "123456";
  doc["status"] = "pairable";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["source"] = "wokwi";
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  publishJson(topic_discovery, buffer);
}

void publishStatus(const char* source = "DEVICE") {
  StaticJsonDocument<192> doc;
  doc["deviceId"] = device_id;
  doc["status"] = currentStatus;
  doc["mode"] = controlMode;
  doc["lastCommand"] = lastCommand;
  doc["source"] = source;
  doc["timestamp"] = millis();

  char buffer[192];
  serializeJson(doc, buffer);
  publishJson(topic_status, buffer);

  Serial.print("[STATUS] source=");
  Serial.print(source);
  Serial.print(" data=");
  Serial.println(buffer);
}

void moveServoOpen(const char* source = "DEVICE", bool forcePublish = false) {
  bool alreadyOpen = (currentStatus == "OPEN");
  myservo.write(SERVO_OPEN);
  currentPos = SERVO_OPEN;
  currentStatus = "OPEN";
  if (!alreadyOpen || forcePublish) {
    publishStatus(source);
  }
}

void moveServoClose(const char* source = "DEVICE", bool forcePublish = false) {
  bool alreadyClosed = (currentStatus == "CLOSED");
  myservo.write(SERVO_CLOSE);
  currentPos = SERVO_CLOSE;
  currentStatus = "CLOSED";
  if (!alreadyClosed || forcePublish) {
    publishStatus(source);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != topic_command) return;

  Serial.println("[CMD_RECEIVED_ON_TOPIC]");

  // Safe copy for logging
  char rawPayload[length + 1];
  memcpy(rawPayload, payload, length);
  rawPayload[length] = '\0';
  Serial.print("[CMD_RAW] ");
  Serial.println(rawPayload);

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.println("[CMD_ERROR] JSON parse failed");
    return;
  }

  const char* incomingDeviceId = doc["deviceId"];
  if (incomingDeviceId && strcmp(incomingDeviceId, device_id) != 0) {
    Serial.print("[CMD_IGNORED_DEVICE] incoming=");
    Serial.print(incomingDeviceId);
    Serial.print(" expected=");
    Serial.println(device_id);
    return;
  }

  const char* command = doc["command"];
  if (!command) return;

  Serial.print("[CMD] ");
  Serial.println(command);

  if (strcmp(command, "OPEN") == 0) {
    controlMode = "MANUAL";
    lastCommand = "OPEN";
    moveServoOpen("COMMAND", true); // Force ACK with COMMAND source
  } else if (strcmp(command, "CLOSE") == 0) {
    controlMode = "MANUAL";
    lastCommand = "CLOSE";
    moveServoClose("COMMAND", true); // Force ACK with COMMAND source
  } else if (strcmp(command, "AUTO") == 0) {
    controlMode = "AUTO";
    lastCommand = "AUTO";
    publishStatus("COMMAND");
  } else if (strcmp(command, "MANUAL") == 0) {
    controlMode = "MANUAL";
    lastCommand = "MANUAL";
    publishStatus("COMMAND");
  } else if (strcmp(command, "RESTART") == 0) {
    currentStatus = "RESTARTING";
    lastCommand = "RESTART";
    publishStatus("COMMAND");
    delay(500);
    currentStatus = "OPEN";
    controlMode = "AUTO";
    publishStatus("DEVICE");
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "WOKWI-" + String(device_id);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      client.subscribe(topic_command);
      publishStatus("DEVICE");
      publishPairingDiscovery();
    } else {
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  myservo.attach(servoPin);
  myservo.write(SERVO_OPEN);

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Init System");

  setup_wifi();
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  client.setBufferSize(768);
  client.setKeepAlive(30);
  client.setSocketTimeout(10);

  currentStatus = "OPEN";
  controlMode = "AUTO";
  lastCommand = "AUTO";
  publishStatus("DEVICE");
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();

  if (now - lastDiscoveryPublish >= discoveryInterval) {
    lastDiscoveryPublish = now;
    publishPairingDiscovery();
  }

  if (now - lastSensorPublish >= sensorInterval) {
    lastSensorPublish = now;

    int rainVal = analogRead(rainPin);
    int ldrRaw = analogRead(ldrPin);
    int lightNormalized = normalizeLightFromRaw(ldrRaw);
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    
    bool isRaining = rainVal < 2000;
    bool isDark = lightNormalized < LIGHT_DARK_THRESHOLD;

    if (isnan(temp) || isnan(hum)) {
       temp = 0; hum = 0;
    }

    if (controlMode == "AUTO") {
      if ((isRaining || isDark) && currentStatus != "CLOSED") {
        lastCommand = "AUTO";
        moveServoClose("AUTO", false);
      } else if (!isRaining && !isDark && currentStatus != "OPEN") {
        lastCommand = "AUTO";
        moveServoOpen("AUTO", false);
      }
    }

    StaticJsonDocument<320> doc;
    doc["deviceId"] = device_id;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["light"] = lightNormalized;
    doc["lightRaw"] = ldrRaw;
    doc["lightThreshold"] = LIGHT_DARK_THRESHOLD;
    doc["rain"] = isRaining;
    doc["rainVal"] = rainVal;
    doc["rainRaw"] = rainVal;
    doc["status"] = currentStatus;
    doc["mode"] = controlMode;
    doc["lastCommand"] = lastCommand;
    doc["source"] = "DEVICE";
    doc["timestamp"] = millis();
    doc["heartbeat"] = millis();

    char buffer[320];
    serializeJson(doc, buffer);
    publishJson(topic_sensor, buffer);

    Serial.print("[LIGHT] raw=");
    Serial.print(ldrRaw);
    Serial.print(" normalized=");
    Serial.print(lightNormalized);
    Serial.print(" dark=");
    Serial.println(isDark ? "true" : "false");

    Serial.print("[RAIN] raw=");
    Serial.print(rainVal);
    Serial.print(" raining=");
    Serial.println(isRaining ? "true" : "false");

    Serial.print("[SENSOR] ");
    Serial.println(buffer);

    // Periodic status heartbeat
    publishStatus("DEVICE");
    updateLCD(temp, hum);
  }
}
