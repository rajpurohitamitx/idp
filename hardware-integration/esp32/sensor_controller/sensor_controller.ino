/*
  Industrial Guardian — ESP32 Sensor Controller (example client)
  No hazard/severity logic — the backend decides that.
  Libraries: WiFi.h, HTTPClient.h, ArduinoJson
*/
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "http://192.168.1.50:4000";
const char* DEVICE_ID = "ESP32-001";
const char* DEVICE_TOKEN = "igd_REPLACE_WITH_ISSUED_TOKEN";

const unsigned long HEARTBEAT_INTERVAL_MS = 30000;
const unsigned long SENSOR_UPLOAD_INTERVAL_MS = 5000;
const int MAX_BUFFERED_READINGS = 50;

struct BufferedReading { String sensorId; String sensorType; float value; String unit; time_t ts; String eventId; };
BufferedReading buffer[MAX_BUFFERED_READINGS];
int bufferCount = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastUpload = 0;
unsigned long eventCounter = 0;

String isoNow() {
  time_t now; time(&now);
  struct tm t; gmtime_r(&now, &t);
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &t);
  return String(buf);
}

String nextEventId(const char* prefix) {
  eventCounter++;
  return String(prefix) + "-" + String(DEVICE_ID) + "-" + String(millis()) + "-" + String(eventCounter);
}

bool httpPostJson(const String& path, const String& jsonBody, String& responseOut) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(BACKEND_URL) + path);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  http.setTimeout(8000);
  int code = http.POST(jsonBody);
  responseOut = http.getString();
  http.end();
  return code >= 200 && code < 300;
}

// ============================================================================
// SENSOR CALIBRATION — real formulas for commonly-bought modules. Every sensor
// still needs its own calibration against its datasheet / a known reference.
// See hardware-integration/esp32/calibration/sensor_calibration.ino for a
// standalone, no-backend-required sketch to derive YOUR real constants first.
// ============================================================================
const float ADC_VREF = 3.3;
const float ADC_MAX  = 4095.0;

const float MQ_RL = 10.0;
float MQ_Ro = 10.0; // << REPLACE: run sensor_calibration.ino once in clean air, hardcode the printed value here
const float MQ_CURVE_A = 116.6020682;
const float MQ_CURVE_B = -2.769034857;
float mqRs(int pin) {
  float v = (analogRead(pin) / ADC_MAX) * ADC_VREF;
  if (v < 0.01) v = 0.01;
  return MQ_RL * (ADC_VREF - v) / v;
}
float readGasPpm() {
  float ratio = mqRs(34) / MQ_Ro;
  return MQ_CURVE_A * pow(ratio, MQ_CURVE_B);
}

float readTemperatureC() {
  float v = (analogRead(35) / ADC_MAX) * ADC_VREF;
  return v * 100.0; // LM35: 10mV/°C
}

const float ACS_ZERO_V = 1.65;     // << REPLACE: measure at the ESP32 pin with zero current flowing
const float ACS_MV_PER_AMP = 66.0; // 30A module variant; use 100/185 for 20A/5A variants
float readElectricalAmps() {
  float v = (analogRead(32) / ADC_MAX) * ADC_VREF;
  return (v - ACS_ZERO_V) / (ACS_MV_PER_AMP / 1000.0);
}

void bufferReading(const char* sensorId, const char* sensorType, float value, const char* unit) {
  if (bufferCount >= MAX_BUFFERED_READINGS) {
    for (int i = 1; i < MAX_BUFFERED_READINGS; i++) buffer[i - 1] = buffer[i];
    bufferCount--;
  }
  buffer[bufferCount++] = { sensorId, sensorType, value, unit, time(nullptr), nextEventId("EVT") };
}

void flushBufferedReadings() {
  if (bufferCount == 0) return;
  StaticJsonDocument<4096> doc;
  doc["deviceId"] = DEVICE_ID;
  JsonArray readings = doc.createNestedArray("readings");
  for (int i = 0; i < bufferCount; i++) {
    JsonObject r = readings.createNestedObject();
    r["eventId"] = buffer[i].eventId;
    r["sensorId"] = buffer[i].sensorId;
    r["sensorType"] = buffer[i].sensorType;
    r["value"] = buffer[i].value;
    r["unit"] = buffer[i].unit;
    char ts[25]; struct tm t; gmtime_r(&buffer[i].ts, &t);
    strftime(ts, sizeof(ts), "%Y-%m-%dT%H:%M:%SZ", &t);
    r["timestamp"] = ts;
  }
  String body; serializeJson(doc, body);
  String resp;
  if (httpPostJson("/api/v1/sensors/readings", body, resp)) {
    bufferCount = 0;
  }
}

void sendHeartbeat() {
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = isoNow();
  doc["firmwareVersion"] = "1.0.0";
  doc["uptimeSeconds"] = millis() / 1000;
  doc["signalStrength"] = WiFi.RSSI();
  String body; serializeJson(doc, body);
  String resp;
  httpPostJson("/api/devices/heartbeat", body, resp);
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi connected");
  configTime(0, 0, "pool.ntp.org");
  sendHeartbeat();
}

void loop() {
  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) { sendHeartbeat(); lastHeartbeat = now; }
  if (now - lastUpload >= SENSOR_UPLOAD_INTERVAL_MS) {
    bufferReading("GAS-001", "GAS", readGasPpm(), "ppm");
    bufferReading("TEMP-001", "TEMPERATURE", readTemperatureC(), "C");
    bufferReading("ELEC-001", "ELECTRICAL", readElectricalAmps(), "A");
    flushBufferedReadings();
    lastUpload = now;
  }
  delay(100);
}
