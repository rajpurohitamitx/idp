/*
  Industrial Guardian — ESP32-CAM Camera Node (example client)
  Library: esp_camera.h (ESP32-CAM / AI-Thinker module).
*/
#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* BACKEND_URL = "http://192.168.1.50:4000";
const char* DEVICE_ID = "CAMERA-NODE-001";
const char* CAMERA_ID = "CAMERA-04";
const char* DEVICE_TOKEN = "igd_REPLACE_WITH_ISSUED_TOKEN";
const char* LOCATION = "Production Floor A";

unsigned long captureIntervalMs = 10000;
unsigned long lastCapture = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastCommandPoll = 0;

String isoNow();

// AI-Thinker ESP32-CAM pin map
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM; config.pin_d1 = Y3_GPIO_NUM; config.pin_d2 = Y4_GPIO_NUM; config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM; config.pin_d5 = Y7_GPIO_NUM; config.pin_d6 = Y8_GPIO_NUM; config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM; config.pin_pclk = PCLK_GPIO_NUM; config.pin_vsync = VSYNC_GPIO_NUM; config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM; config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM; config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  if (psramFound()) { config.frame_size = FRAMESIZE_SVGA; config.jpeg_quality = 12; config.fb_count = 2; }
  else { config.frame_size = FRAMESIZE_VGA; config.jpeg_quality = 15; config.fb_count = 1; }
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) { Serial.printf("Camera init failed: 0x%x\n", err); return false; }
  return true;
}

bool captureAndUpload() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) { Serial.println("Camera capture failed"); return false; }

  HTTPClient http;
  http.begin(String(BACKEND_URL) + "/api/images/analyze");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  String boundary = "IGBoundary7MA4YWxkTrZu0gW";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  String head = "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"cameraId\"\r\n\r\n" + String(CAMERA_ID) + "\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"deviceId\"\r\n\r\n" + String(DEVICE_ID) + "\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"timestamp\"\r\n\r\n" + isoNow() + "\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"location\"\r\n\r\n" + String(LOCATION) + "\r\n"
    "--" + boundary + "\r\n"
    "Content-Disposition: form-data; name=\"image\"; filename=\"frame.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  int totalLen = head.length() + fb->len + tail.length();
  uint8_t* body = (uint8_t*)malloc(totalLen);
  memcpy(body, head.c_str(), head.length());
  memcpy(body + head.length(), fb->buf, fb->len);
  memcpy(body + head.length() + fb->len, tail.c_str(), tail.length());

  int code = http.POST(body, totalLen);
  bool ok = code >= 200 && code < 300;
  if (!ok) Serial.printf("Upload failed, HTTP %d: %s\n", code, http.getString().c_str());

  free(body);
  http.end();
  esp_camera_fb_return(fb);
  return ok;
}

void pollCommands() {
  HTTPClient http;
  http.begin(String(BACKEND_URL) + "/api/devices/" + DEVICE_ID + "/commands");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.GET();
  if (code == 200) {
    String resp = http.getString();
    StaticJsonDocument<1024> doc;
    if (deserializeJson(doc, resp) == DeserializationError::Ok) {
      JsonArray arr = doc["data"].as<JsonArray>();
      for (JsonObject cmd : arr) {
        if (String((const char*)cmd["command"]) == "CAPTURE_IMAGE") {
          captureAndUpload();
          StaticJsonDocument<256> ack;
          ack["commandId"] = cmd["commandId"];
          ack["deviceId"] = DEVICE_ID;
          ack["status"] = "COMPLETED";
          String ackBody; serializeJson(ack, ackBody);
          HTTPClient ackHttp;
          ackHttp.begin(String(BACKEND_URL) + "/api/devices/commands/ack");
          ackHttp.addHeader("Content-Type", "application/json");
          ackHttp.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
          ackHttp.POST(ackBody);
          ackHttp.end();
        }
      }
    }
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  if (!initCamera()) { Serial.println("Halting — fix camera wiring/power and reset."); while (true) delay(1000); }
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nCamera node ready, WiFi connected.");
}

void loop() {
  unsigned long now = millis();
  if (now - lastCapture >= captureIntervalMs) { captureAndUpload(); lastCapture = now; }
  if (now - lastCommandPoll >= 2000) { pollCommands(); lastCommandPoll = now; }
  delay(50);
}
