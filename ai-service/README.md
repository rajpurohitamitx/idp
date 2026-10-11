# Industrial Guardian — AI Service

Separate FastAPI microservice. The backend never embeds a model directly — it calls this
service over HTTP (`AI_SERVICE_URL`), so the model can be swapped without touching the backend.

## Run
```
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

## Endpoints
- `GET /health` — service + model status
- `POST /analyze` — multipart form: `image` (file), `imageId` (optional). Returns the detection
  contract the backend expects (see root `README.md` / hardware-integration docs).

## Swapping the model
Two detectors ship with the same `Detector` contract (`name`, `version`, `detect(image) -> list[Detection]`):
- `heuristic` (default): OpenCV HOG person detector + colour-based PPE/smoke/fire heuristics. No
  downloads required, runs out of the box, genuinely analyzes the real image — but is approximate.
- `yolo`: loads a trained ONNX model from `MODEL_PATH/model.onnx`. See `app/inference/yolo_detector.py`
  for exact requirements. Set `MODEL_BACKEND=yolo` in `.env` and `pip install onnxruntime`.

Add a third backend by implementing the same contract and wiring it into `app/inference/factory.py`.
