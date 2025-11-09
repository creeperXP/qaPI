#!/bin/bash

echo "🚀 Setting up SentinelTwin..."

# Backend setup
echo "📦 Setting up backend..."
cd Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# AI API Keys
NEMOTRON_API_KEY=Change
GEMINI_API_KEY=Change

# Auth0 Configuration
AUTH0_DOMAIN=Change
AUTH0_CLIENT_ID=Change
AUTH0_CLIENT_SECRET=Change
AUTH0_AUDIENCE=Change

# Firestore Configuration
FIREBASE_CREDENTIALS_PATH=Change
FIREBASE_PROJECT_ID=Change

# Server Configuration
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Created .env file - please update with your API keys"
else
    echo "⚠️  .env file already exists"
fi

cd ..

# Frontend setup
echo "📦 Setting up frontend..."
cd Frontend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "VITE_API_URL=http://localhost:8000" > .env
fi

cd ..

echo "✅ Setup complete!"
echo ""
echo "To run the application:"
echo "1. Backend: cd Backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo "2. Frontend: cd Frontend && npm run dev"
echo ""
echo "Don't forget to update Backend/.env with your API keys!"



