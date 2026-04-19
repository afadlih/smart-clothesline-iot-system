const mqtt = require("mqtt");

const BROKER_URL = "mqtt://broker.hivemq.com";
const TOPIC = process.env.MQTT_TOPIC || "smart-clothesline/sensor";
const SOURCE_ID = process.env.SENSOR_SOURCE_ID || "smart-clothesline-simulator";

function parseInterval() {
    const value = Number(process.env.PUBLISH_INTERVAL_MS || 5000);
    if (Number.isFinite(value) && value >= 1000) {
        return value;
    }
    return 5000;
}

const PUBLISH_INTERVAL_MS = parseInterval();

const client = mqtt.connect(BROKER_URL, {
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    clean: true,
});

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createPayload() {
    return {
        temperature: randomInt(25, 35),
        humidity: randomInt(60, 90),
        light: randomInt(0, 500),
        rain: Math.random() < 0.35,
        sourceId: SOURCE_ID,
    };
}

function publishSensorData() {
    const payload = createPayload();
    const message = JSON.stringify(payload);

    client.publish(TOPIC, message, { qos: 0 }, (error) => {
        if (error) {
            console.error("[SIMULATOR] Publish failed:", error.message);
            return;
        }

        console.log(`[SIMULATOR] Published to ${TOPIC}:`, payload);
    });
}

let timer = null;

client.on("connect", () => {
    console.log("[SIMULATOR] Connected to broker");
    console.log(`[SIMULATOR] Topic: ${TOPIC}`);
    console.log(`[SIMULATOR] Source ID: ${SOURCE_ID}`);
    console.log(`[SIMULATOR] Publish interval: ${PUBLISH_INTERVAL_MS} ms`);
    publishSensorData();
    timer = setInterval(publishSensorData, PUBLISH_INTERVAL_MS);
});

client.on("reconnect", () => {
    console.log("[SIMULATOR] Reconnecting...");
});

client.on("error", (error) => {
    console.error("[SIMULATOR] MQTT error:", error.message);
});

client.on("offline", () => {
    console.warn("[SIMULATOR] Client offline");
});

process.on("SIGINT", () => {
    console.log("\n[SIMULATOR] Shutting down...");

    if (timer) {
        clearInterval(timer);
    }

    client.end(false, () => {
        console.log("[SIMULATOR] Disconnected");
        process.exit(0);
    });
});
