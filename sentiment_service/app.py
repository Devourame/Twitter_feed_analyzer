"""Local sentiment inference service for TweetPulse.

Loads the Cardiff NLP Twitter-RoBERTa sentiment classifier from the local
model directory (never from the network) and serves predictions over HTTP.

Run:  .venv\\Scripts\\python.exe app.py   (or use start.bat)
"""

import logging
import time
from pathlib import Path

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("sentiment_service")

MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "twitter-roberta-base-sentiment"
MODEL_ID = "cardiffnlp/twitter-roberta-base-sentiment"
# Official label mapping for this checkpoint (config id2label: 0=negative, 1=neutral, 2=positive)
LABELS = ["negative", "neutral", "positive"]
MAX_TEXT_LENGTH = 512

app = FastAPI(title="TweetPulse Sentiment Inference Service")

tokenizer = None
model = None


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH)


class PredictResponse(BaseModel):
    sentiment: str
    confidence: float
    scores: dict
    model: str
    inferenceTimeMs: int


@app.on_event("startup")
def load_model() -> None:
    global tokenizer, model
    if not MODEL_DIR.exists() or not any(MODEL_DIR.iterdir()):
        raise RuntimeError(
            f"Model directory is missing or empty: {MODEL_DIR}. "
            "Download it first (see README-SENTIMENT.md)."
        )
    logger.info("Loading model from %s", MODEL_DIR)
    start = time.perf_counter()
    # local_files_only=True guarantees no network access at load time
    tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), local_files_only=True)
    model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_DIR), local_files_only=True)
    model.eval()  # CPU inference only; no GPU required
    logger.info("Model loaded in %.1fs", time.perf_counter() - start)


def _require_model():
    if tokenizer is None or model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")


@app.get("/health")
def health():
    _require_model()
    return {"status": "ok", "model": MODEL_ID}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    _require_model()
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text must not be empty or whitespace-only.")

    start = time.perf_counter()
    with torch.no_grad():
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=MAX_TEXT_LENGTH)
        logits = model(**inputs).logits[0]
    inference_ms = int((time.perf_counter() - start) * 1000)

    # Softmax over logits -> normalized class probabilities
    probs = torch.softmax(logits, dim=-1).tolist()
    scores = {LABELS[i]: round(float(p), 4) for i, p in enumerate(probs)}
    best = max(scores, key=scores.get)

    return PredictResponse(
        sentiment=best,
        confidence=scores[best],
        scores=scores,
        model=MODEL_ID,
        inferenceTimeMs=inference_ms,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8001)
