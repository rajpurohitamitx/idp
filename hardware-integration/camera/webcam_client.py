#!/usr/bin/env python3
"""Stream a laptop/USB webcam into the real camera pipeline, for testing without ESP32-CAM."""
import argparse
import time
from datetime import datetime, timezone

import cv2
import requests


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--backend", default="http://localhost:4000")
    p.add_argument("--token", required=True)
    p.add_argument("--camera-id", required=True)
    p.add_argument("--location", default="Production Floor A")
    p.add_argument("--source", default=0)
    p.add_argument("--interval", type=float, default=5.0)
    p.add_argument("--jpeg-quality", type=int, default=85)
    args = p.parse_args()

    source = int(args.source) if str(args.source).isdigit() else args.source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        raise SystemExit(f"Could not open video source {source!r}")

    headers = {"Authorization": f"Bearer {args.token}"}
    print(f"Streaming {source} -> {args.backend}/api/images/analyze every {args.interval}s. Ctrl+C to stop.")

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Frame grab failed, retrying in 1s...")
                time.sleep(1)
                continue
            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, args.jpeg_quality])
            if not ok:
                print("JPEG encode failed, skipping frame")
                time.sleep(args.interval)
                continue
            files = {"image": ("frame.jpg", buf.tobytes(), "image/jpeg")}
            data = {"cameraId": args.camera_id, "timestamp": iso_now(), "location": args.location}
            try:
                r = requests.post(f"{args.backend}/api/images/analyze", files=files, data=data, headers=headers, timeout=15)
                if r.ok:
                    body = r.json().get("data", {})
                    print(f"[{iso_now()}] analyzed -> {body.get('overallResult')} (hazards created: {body.get('hazardsCreated')})")
                else:
                    print(f"[{iso_now()}] upload failed: {r.status_code} {r.text[:200]}")
            except requests.RequestException as e:
                print(f"[{iso_now()}] network error: {e}")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        cap.release()


if __name__ == "__main__":
    main()
