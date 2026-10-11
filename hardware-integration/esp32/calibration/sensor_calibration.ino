/*
  Industrial Guardian — STANDALONE sensor calibration sketch.
  No WiFi, no backend, no device token needed.

  Wiring (standard ESP32 DevKit, NOT the camera board):
    MQ-2 gas sensor:  VCC->5V, GND->GND, AO->GPIO34
    LM35 temperature: VCC->3.3V, GND->GND, Vout->GPIO35
    ACS712 current:   VCC->5V, GND->GND, OUT through a 2:1 divider (two 10k resistors) -> GPIO32

  Open Serial Monitor at 115200 baud after flashing.
*/
const int GAS_PIN = 34;
const int TEMP_PIN = 35;
const int ELEC_PIN = 32;
const float ADC_VREF = 3.3;
const float ADC_MAX = 4095.0;
const float MQ_RL = 10.0;

float pinVoltage(int pin) { return (analogRead(pin) / ADC_MAX) * ADC_VREF; }

float mqRs(int pin) {
  float v = pinVoltage(pin);
  if (v < 0.01) v = 0.01;
  return MQ_RL * (ADC_VREF - v) / v;
}

unsigned long lastPrint = 0;
float rsRunningSum = 0; int rsSamples = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== Industrial Guardian sensor calibration ===");
  Serial.println("Let the MQ-2 warm up for several minutes before trusting readings.");
  Serial.println("Columns: GAS(raw,V,Rs)  TEMP(raw,V,C)  ELEC(raw,V)");
}

void loop() {
  unsigned long now = millis();
  if (now - lastPrint < 1000) return;
  lastPrint = now;

  int gasRaw = analogRead(GAS_PIN);
  float gasV = pinVoltage(GAS_PIN);
  float rs = mqRs(GAS_PIN);
  rsRunningSum += rs; rsSamples++;

  int tempRaw = analogRead(TEMP_PIN);
  float tempV = pinVoltage(TEMP_PIN);
  float tempC = tempV * 100.0;

  int elecRaw = analogRead(ELEC_PIN);
  float elecV = pinVoltage(ELEC_PIN);

  Serial.printf("GAS: raw=%4d  V=%.3f  Rs=%.2fk  |  TEMP: raw=%4d  V=%.3f  C=%.1f  |  ELEC: raw=%4d  V=%.3f\n",
                gasRaw, gasV, rs, tempRaw, tempV, tempC, elecRaw, elecV);

  if (rsSamples >= 30) {
    float avgRs = rsRunningSum / rsSamples;
    Serial.printf(">>> If this is clean air right now: suggested MQ_Ro = %.2f\n", avgRs / 9.8);
    Serial.printf(">>> If this ELEC reading is with ZERO current flowing: suggested ACS_ZERO_V = %.3f\n", elecV);
    rsRunningSum = 0; rsSamples = 0;
  }
}
