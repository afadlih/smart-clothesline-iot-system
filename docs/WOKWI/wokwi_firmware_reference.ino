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

const char* mqtt_server = "ba30f548c6ba4db2a6eae072d0a0ab18.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "fabiqnn";
const char* mqtt_pass = "WmGgym2vPTa7dR.";

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
// SERVO CONFIG
// ==============================
#define SERVO_OPEN 90
#define SERVO_CLOSE 0

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
  client.publish(topic_discovery, buffer);
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
  client.publish(topic_status, buffer);

  Serial.print("[STATUS] ");
  Serial.println(buffer);
}

void moveServoOpen() {
  if (currentStatus == "OPEN") return;
  myservo.write(SERVO_OPEN);
  currentPos = SERVO_OPEN;
  currentStatus = "OPEN";
  publishStatus("DEVICE");
}

void moveServoClose() {
  if (currentStatus == "CLOSED") return;
  myservo.write(SERVO_CLOSE);
  currentPos = SERVO_CLOSE;
  currentStatus = "CLOSED";
  publishStatus("DEVICE");
}

void callback(char* topic, byte* payload, unsigned int length) {
  if (String(topic) != topic_command) return;

  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) return;

  const char* incomingDeviceId = doc["deviceId"];
  if (incomingDeviceId && strcmp(incomingDeviceId, device_id) != 0) return;

  const char* command = doc["command"];
  if (!command) return;

  Serial.print("[CMD] ");
  Serial.println(command);

  if (strcmp(command, "OPEN") == 0) {
    controlMode = "MANUAL";
    lastCommand = "OPEN";
    moveServoOpen();
  } else if (strcmp(command, "CLOSE") == 0) {
    controlMode = "MANUAL";
    lastCommand = "CLOSE";
    moveServoClose();
  } else if (strcmp(command, "AUTO") == 0) {
    controlMode = "AUTO";
    lastCommand = "AUTO";
    publishStatus("DEVICE");
  } else if (strcmp(command, "MANUAL") == 0) {
    controlMode = "MANUAL";
    lastCommand = "MANUAL";
    publishStatus("DEVICE");
  } else if (strcmp(command, "RESTART") == 0) {
    currentStatus = "RESTARTING";
    lastCommand = "RESTART";
    publishStatus("DEVICE");
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
    int ldrVal = analogRead(ldrPin);
    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    if (isnan(temp) || isnan(hum)) return;

    bool isRaining = rainVal < 2000;
    bool isDark = ldrVal > 3000;

    if (controlMode == "AUTO") {
      if ((isRaining || isDark) && currentStatus != "CLOSED") {
        lastCommand = "AUTO";
        moveServoClose();
      } else if (!isRaining && !isDark && currentStatus != "OPEN") {
        lastCommand = "AUTO";
        moveServoOpen();
      }
    }

    StaticJsonDocument<320> doc;
    doc["deviceId"] = device_id;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["light"] = ldrVal;
    doc["rain"] = isRaining;
    doc["status"] = currentStatus;
    doc["mode"] = controlMode;
    doc["lastCommand"] = lastCommand;
    doc["source"] = "DEVICE";
    doc["timestamp"] = millis();
    doc["heartbeat"] = millis();

    char buffer[320];
    serializeJson(doc, buffer);
    client.publish(topic_sensor, buffer);

    Serial.print("[SENSOR] ");
    Serial.println(buffer);

    // Periodic status heartbeat
    publishStatus("DEVICE");
    updateLCD(temp, hum);
  }
}
