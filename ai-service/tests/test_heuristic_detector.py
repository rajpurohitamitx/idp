import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import numpy as np
import cv2
from app.inference.heuristic_detector import HeuristicDetector
from app.postprocessing.format import to_json


def test_detector_runs_on_random_image():
    d = HeuristicDetector()
    img = (np.random.rand(480, 640, 3) * 255).astype('uint8')
    out = d.detect(img)
    assert isinstance(out, list)


def test_detects_fire_colored_region():
    d = HeuristicDetector()
    img = np.full((480, 640, 3), (40, 40, 40), dtype='uint8')
    cv2.rectangle(img, (200, 200), (400, 350), (10, 160, 220), -1)
    out = to_json(d.detect(img))
    assert any(x['type'] == 'FIRE' for x in out)


def test_bounding_boxes_are_well_formed():
    d = HeuristicDetector()
    img = np.full((480, 640, 3), (40, 40, 40), dtype='uint8')
    cv2.rectangle(img, (200, 200), (400, 350), (10, 160, 220), -1)
    out = to_json(d.detect(img))
    for det in out:
        bb = det['boundingBox']
        assert bb['width'] >= 0 and bb['height'] >= 0
        assert 0 <= det['confidence'] <= 1
