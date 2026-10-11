from dataclasses import dataclass
from typing import List, Protocol
import numpy as np


@dataclass
class BoundingBox:
    x: int
    y: int
    width: int
    height: int


@dataclass
class Detection:
    type: str
    confidence: float
    boundingBox: BoundingBox


class Detector(Protocol):
    name: str
    version: str

    def detect(self, image: "np.ndarray") -> List[Detection]: ...
