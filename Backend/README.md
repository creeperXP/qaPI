# SentinelTwin Backend

FastAPI backend for SentinelTwin - AI Digital Twin for Service Evolution

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
   - Copy `.env.example` to `.env`
   - Replace "Change" with your actual API keys and credentials

3. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Key Components

- **diff_engine.py**: Core comparison logic
- **routers/api_v1.py & api_v2.py**: Mock APIs with intentional differences
- **routers/comparison.py**: Comparison endpoints
- **routers/ai.py**: AI integration (Nemotron & Gemini)
- **routers/auth.py**: Auth0 authentication



