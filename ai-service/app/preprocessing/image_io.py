import numpy as np
import cv2
from fastapi import HTTPException

MAX_DIMENSION = 4096

def decode_image(raw: bytes) -> np.ndarray:
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image — unsupported or corrupt file")
    h, w = img.shape[:2]
    if max(h, w) > MAX_DIMENSION:
        raise HTTPException(status_code=400, detail=f"Image too large ({w}x{h}); max dimension is {MAX_DIMENSION}px")
    return img
