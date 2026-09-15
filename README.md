# SportsIQ — Cricket Analytics & Intelligence Engine

SportsIQ is a portfolio-ready cricket analytics platform built with FastAPI, Pandas, scikit-learn and a lightweight HTML/CSS/JS frontend.

## Features
- Player and team analytics
- Batting and bowling metrics
- Powerplay / middle-overs / death analysis
- Player similarity using cosine similarity
- Player archetypes using K-Means
- Context-aware SportsIQ Impact Score
- Anomaly detection
- Venue analytics
- AI Analyst endpoint (optional Gemini API)
- Demo data included so the app runs immediately

## Run

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000

## Optional AI
Set `GEMINI_API_KEY` in `.env`. Without it, the rest of SportsIQ works normally and the AI endpoint returns a helpful fallback.

## Data
The included demo dataset is synthetic and is intended for development/demo purposes. Replace it with a properly licensed ball-by-ball dataset when building a public version.
