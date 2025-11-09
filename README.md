# qAPIbara

🧠 **Nemotron** plans and executes version comparison workflows.  
🔮 **Gemini** explains regressions in plain English and suggests fixes.  
🔐 **Auth0** secures access and audit logging for enterprise use.

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd Backend
```

2. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
```

5. Edit `.env` file and replace "Change" with your actual API keys:
   - `NEMOTRON_API_KEY` - Your NVIDIA Nemotron API key
   - `GEMINI_API_KEY` - Your Google Gemini API key
   - `AUTH0_DOMAIN` - Your Auth0 domain
   - `AUTH0_CLIENT_ID` - Your Auth0 client ID
   - `AUTH0_CLIENT_SECRET` - Your Auth0 client secret
   - `AUTH0_AUDIENCE` - Your Auth0 API audience
   - `FIREBASE_CREDENTIALS_PATH` - Path to your Firebase service account JSON
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID

6. Run the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults to localhost:8000):
```bash
echo "VITE_API_URL=http://localhost:8000" > .env
```

4. Run the frontend development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📁 Project Structure

```
hackutd25/
├── Backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application entry point
│   │   ├── models.py             # Pydantic models
│   │   ├── diff_engine.py        # Core diff comparison engine
│   │   ├── database.py            # Firestore database setup
│   │   └── routers/
│   │       ├── api_v1.py         # Mock API v1 endpoints
│   │       ├── api_v2.py         # Mock API v2 endpoints
│   │       ├── comparison.py     # Comparison endpoints
│   │       ├── ai.py             # AI integration (Nemotron & Gemini)
│   │       └── auth.py           # Auth0 authentication
│   ├── requirements.txt
│   └── .env.example
│
└── Frontend/
    ├── src/
    │   ├── components/           # React components
    │   │   ├── Navbar.jsx
    │   │   ├── HealthScore.jsx
    │   │   ├── RegressionHeatmap.jsx
    │   │   ├── EndpointMap.jsx
    │   │   ├── TrendChart.jsx
    │   │   ├── JsonDiff.jsx
    │   │   └── AIExplanation.jsx
    │   ├── pages/                # Page components
    │   │   ├── Dashboard.jsx
    │   │   ├── Comparison.jsx
    │   │   └── History.jsx
    │   ├── services/
    │   │   └── api.js            # API service layer
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── vite.config.js
```

## 🎯 Features

### Layer 0 - Core Requirement (StateFarm)
- ✅ Two mock APIs (v1 and v2) with CRUD endpoints
- ✅ Diff engine for comparing JSON responses
- ✅ Regression detection and summary generation
- ✅ **Postman-like Request Builder** - Build requests with method, URL, headers, and JSON body
- ✅ **JSON Import/Export** - Paste JSON files or type JSON directly
- ✅ **Side-by-side Response Comparison** - Visual diff of v1 vs v2 responses

### Layer 1 - AI Intelligence
- ✅ Nemotron workflow planning and orchestration
- ✅ **Nemotron Test Case Generation** - Automatically design test cases based on service description
- ✅ **Automated Test Execution** - Run all generated test cases automatically
- ✅ **Export Test Cases to JSON** - Save and share test case collections
- ✅ Gemini-powered regression explanations
- ✅ Natural language fix suggestions
- ✅ Interactive chat interface

### Layer 2 - Predictive & Learning
- ✅ Predictive regression mapping
- ✅ Auto-fix suggestions with confidence scores
- ✅ Impact assessment

### Layer 3 - Deployment & Scalability
- ✅ FastAPI backend (ready for Vultr deployment)
- ✅ React frontend with modern UI
- ✅ Scalable architecture

### Layer 4 - Security & Multi-User
- ✅ Auth0 integration structure
- ✅ Role-based access control
- ✅ Audit logging support

### Layer 5 - Visualization
- ✅ Dark neon gradient theme
- ✅ Side-by-side JSON comparisons (Postman-style)
- ✅ Regression heatmap
- ✅ Service health score
- ✅ Real-time endpoint map
- ✅ Trend visualization
- ✅ **Request Collections** - Organize and save API requests
- ✅ **Test Results Dashboard** - View pass/fail status for all test cases

## 📖 Usage Guide

### Postman-like Request Builder

1. **Navigate to Comparison Page** (`/compare`)
   - Use the request builder to construct API requests
   - Select HTTP method (GET, POST, PUT, DELETE, PATCH)
   - Enter base URL and endpoint path
   - Add custom headers if needed
   - Type or paste JSON in the Body tab

2. **Import JSON Files**
   - Click "Import File" button in the Body tab
   - Select a JSON file to load into the request body
   - Or paste JSON directly into the text area

3. **Send Request**
   - Click "Send" button to compare v1 and v2 responses
   - View side-by-side comparison with highlighted differences
   - See regression alerts if issues are detected

### Nemotron Test Case Generation

1. **Generate Test Cases**
   - Scroll to "Nemotron Test Case Generator" section
   - Optionally describe your service (e.g., "User management API")
   - Click "Generate Test Cases" to let Nemotron design test cases automatically

2. **Run All Tests**
   - After generating test cases, click "Run All Tests"
   - Watch as all test cases execute automatically
   - View pass/fail status for each test

3. **Export Test Cases**
   - Click "Export JSON" to save test cases to a file
   - Share test case collections with your team
   - Import them later for regression testing

### Expected vs Unexpected Differences

The system automatically distinguishes:
- **Expected differences**: Generated IDs, timestamps, version numbers
- **Unexpected differences**: Missing fields, type mismatches, error responses

All differences are clearly marked with severity levels (critical, high, medium, low).

## 🔧 API Endpoints

### Mock APIs
- `GET /api/v1/get` - Get all items (v1)
- `POST /api/v1/create` - Create item (v1)
- `GET /api/v2/get` - Get all items (v2)
- `POST /api/v2/create` - Create item (v2)

### Comparison
- `POST /api/comparison/compare` - Compare single endpoint
- `POST /api/comparison/compare-all` - Compare all endpoints
- `GET /api/comparison/history` - Get comparison history

### AI
- `POST /api/ai/workflow/plan` - Plan workflow (Nemotron)
- `POST /api/ai/explain` - Explain regression (Gemini)
- `POST /api/ai/chat` - Chat with Gemini

### Auth
- `GET /api/auth/me` - Get current user
- `GET /api/auth/login` - Login endpoint
- `POST /api/auth/logout` - Logout endpoint



