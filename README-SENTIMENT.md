# Sentiment Lab — Offline Twitter-RoBERTa Integration

The **Sentiment Lab** page analyzes user-submitted posts with the pretrained
[cardiffnlp/twitter-roberta-base-sentiment](https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment)
model running **fully offline on CPU**. Predictions are returned by a local
Python (FastAPI) service, stored in MongoDB via the Express backend, and shown
in the analysis history. The 10,000 synthetic tweets and their original
sentiment labels are not modified.

## Architecture

```
React (Sentiment Lab page)
   -> POST /api/analyzed-posts  (Express backend, :5000)
        -> POST /predict        (Python FastAPI service, :8001)
             -> local model in models/twitter-roberta-base-sentiment
        <- { sentiment, confidence, scores, model, inferenceTimeMs }
   <- saved document in MongoDB collection `analyzedposts`
```

## One-time setup

Requires **Python 3.13** (PyTorch wheels; 3.14 is not yet supported).

1. Create the virtual environment and install dependencies:

   ```bat
   cd sentiment_service
   py -3.13 -m venv .venv
   .venv\Scripts\python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
   .venv\Scripts\python -m pip install transformers huggingface_hub fastapi uvicorn
   ```

2. Download the model into `models/twitter-roberta-base-sentiment`
   (~500 MB; internet needed only for this step):

   ```bat
   .venv\Scripts\python download_model.py
   ```

   Files downloaded: `pytorch_model.bin`, `config.json`, `vocab.json`,
   `merges.txt`, `special_tokens_map.json`.

## Running (Windows)

Three terminals:

| Service          | Command                                                        |
|------------------|----------------------------------------------------------------|
| Inference service | `sentiment_service\start.bat` (or `.venv\Scripts\python app.py` inside `sentiment_service`) |
| Backend           | `cd backend && npm run dev` (or `npm start` for the built `dist/`) |
| Frontend          | `cd frontend && npm run dev` → http://localhost:3000 |

The backend connects to MongoDB via `MONGO_URI`
(default `mongodb://127.0.0.1:27017/twitter_analyzer`, see `backend/.env`).
The backend reaches the Python service via `SENTIMENT_SERVICE_URL`
(default `http://127.0.0.1:8001`).

## Offline behavior

- The service loads the model with `local_files_only=True` from the local
  directory; no network calls happen at inference time.
- Loading was verified with `HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1`.
- If the Python service is down, `POST /api/analyzed-posts` returns **503**
  and nothing is saved — no fake results are ever produced.

## API

### POST /api/analyzed-posts

```json
{ "text": "I absolutely love this project!", "hashtag": "#DataViz" }
```

Response (201):

```json
{
  "success": true,
  "data": {
    "_id": "6ad30d036a2132fc2ee37d06",
    "text": "I absolutely love this project, the visualizations are beautiful!",
    "hashtag": "dataviz",
    "sentiment": "positive",
    "confidence": 0.9923,
    "scores": { "negative": 0.0023, "neutral": 0.0054, "positive": 0.9923 },
    "model": "cardiffnlp/twitter-roberta-base-sentiment",
    "inferenceTimeMs": 64,
    "createdAt": "2026-10-17T05:52:03.328Z"
  }
}
```

Validation: text must be 1–512 chars (non-blank), hashtag 1–64 chars
(normalized to lowercase without the leading `#`).

Other endpoints:

- `GET /api/analyzed-posts?page=1&limit=20&hashtag=dataviz` — history with pagination + filter
- `GET /api/analyzed-posts/:id` — single analysis
- `GET /api/sentiment/health` — `503` when the Python service is unreachable

## MongoDB collection (`analyzedposts`)

Indexes: `{ createdAt: -1 }` and `{ hashtag: 1, createdAt: -1 }`.

## Tests

```bat
cd backend && npm test
```

The new suite (`analyzedPostController.test.ts`) mocks the Python service and
covers: saving real predictions, hashtag normalization, empty/too-long text,
missing hashtag, no record saved when inference fails, listing + filtering,
and invalid/missing ids.
