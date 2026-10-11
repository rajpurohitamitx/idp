#!/usr/bin/env python3
"""Mock hardware client — simulates sensor/RFID/image uploads over the real HTTP contract."""
import argparse
import random
import time
import uuid
from datetime import datetime, timezone

import requests


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def event_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12].upper()}"


class MockDevice:
    def __init__(self, backend: str, token: str, device_id: str):
        self.backend = backend.rstrip("/")
        self.headers = {"Authorization": f"Bearer {token}"}
        self.device_id = device_id
        self.buffer = []

    def heartbeat(self):
        body = {"deviceId": self.device_id, "timestamp": iso_now(), "firmwareVersion": "1.0.0-mock", "uptimeSeconds": int(time.time()), "signalStrength": -55}
        r = requests.post(f"{self.backend}/api/devices/heartbeat", json=body, timeout=8)
        print("heartbeat ->", r.status_code, r.json() if r.ok else r.text)

    def queue_reading(self, sensor_id: str, sensor_type: str, value: float, unit: str):
        self.buffer.append({"eventId": event_id("EVT"), "sensorId": sensor_id, "sensorType": sensor_type, "value": round(value, 2), "unit": unit, "timestamp": iso_now()})

    def flush_readings(self):
        if not self.buffer:
            return
        body = {"deviceId": self.device_id, "readings": self.buffer}
        try:
            r = requests.post(f"{self.backend}/api/v1/sensors/readings", json=body, timeout=8, headers=self.headers)
            if r.ok:
                print(f"flushed {len(self.buffer)} readings ->", r.json())
                self.buffer = []
            else:
                print("flush failed, will retry:", r.status_code, r.text)
        except requests.RequestException as e:
            print("network error, buffering for retry:", e)

    def send_rfid_event(self, rfid_uid: str, reader_id: str = "RFID-001"):
        body = {"eventId": event_id("RFIDEVT"), "deviceId": self.device_id, "readerId": reader_id, "rfidUid": rfid_uid, "timestamp": iso_now()}
        r = requests.post(f"{self.backend}/api/v1/access-events", json=body, timeout=8, headers=self.headers)
        print("rfid event ->", r.status_code, r.json() if r.ok else r.text)

    def upload_image(self, camera_id: str, image_path: str, location: str):
        with open(image_path, "rb") as f:
            files = {"image": (image_path, f, "image/jpeg")}
            data = {"cameraId": camera_id, "timestamp": iso_now(), "location": location}
            r = requests.post(f"{self.backend}/api/images/analyze", files=files, data=data, timeout=15, headers=self.headers)
        print("image analyze ->", r.status_code, r.json() if r.ok else r.text)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--backend", default="http://localhost:4000")
    p.add_argument("--token", required=True)
    p.add_argument("--device-id", required=True)
    p.add_argument("--gas-sensor-id", default="GAS-001")
    p.add_argument("--rfid-uid", default=None)
    p.add_argument("--image", default=None)
    p.add_argument("--camera-id", default="CAMERA-04")
    p.add_argument("--location", default="Production Floor A")
    p.add_argument("--cycles", type=int, default=5)
    args = p.parse_args()

    dev = MockDevice(args.backend, args.token, args.device_id)
    dev.heartbeat()

    if args.rfid_uid:
        dev.send_rfid_event(args.rfid_uid)
        return
    if args.image:
        dev.upload_image(args.camera_id, args.image, args.location)
        return

    for i in range(args.cycles):
        dev.queue_reading(args.gas_sensor_id, "GAS", 20 + random.random() * 10, "ppm")
        dev.queue_reading("TEMP-001", "TEMPERATURE", 28 + random.random() * 4, "C")
        dev.flush_readings()
        time.sleep(2)


if __name__ == "__main__":
    main()
