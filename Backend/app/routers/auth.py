from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict
import os
from dotenv import load_dotenv
import pathlib
import httpx
from jose import jwt, JWTError
from datetime import datetime
from app.database import get_supabase, create_or_update_user

# Load .env from root directory
root_dir = pathlib.Path(__file__).parent.parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()
security = HTTPBearer()

async def get_jwks():
    """Fetch JWKS from Auth0"""
    auth0_domain = os.getenv("AUTH0_DOMAIN")
    if not auth0_domain or auth0_domain == "Change":
        return None
    jwks_url = f"https://{auth0_domain}/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        return response.json()

async def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict:
    """Verify Auth0 token and return user info"""
    auth0_domain = os.getenv("AUTH0_DOMAIN")
    auth0_audience = os.getenv("AUTH0_AUDIENCE")
    
    # If Auth0 is not configured, allow mock authentication for development
    if not auth0_domain or auth0_domain == "Change" or not auth0_audience or auth0_audience == "Change":
        return {"sub": "mock_user", "email": "dev@example.com"}
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    token = credentials.credentials
    try:
        jwks = await get_jwks()
        if not jwks:
            raise HTTPException(status_code=500, detail="Unable to fetch JWKS")
            
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break
        
        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token header"
            )
        
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=auth0_audience,
            issuer=f"https://{auth0_domain}/"
        )
        
        # Store or update user in Supabase (if configured)
        supabase = get_supabase()
        if supabase:
            try:
                create_or_update_user(
                    auth0_id=payload["sub"],
                    email=payload.get("email"),
                    name=payload.get("name")
                )
            except Exception as e:
                print(f"⚠️  Supabase user update error (continuing): {e}")
        
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
    except Exception as e:
        print(f"⚠️  Auth error: {e}")
        # If Auth0 is not configured, return mock user for development
        if not auth0_domain or auth0_domain == "Change":
            return {"sub": "mock_user", "email": "dev@example.com"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

@router.get("/me")
async def get_current_user(user: dict = Depends(verify_token)):
    """Get current authenticated user"""
    return user

@router.get("/login")
async def login():
    """Auth0 login endpoint"""
    auth0_domain = os.getenv("AUTH0_DOMAIN")
    auth0_client_id = os.getenv("AUTH0_CLIENT_ID")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    if not auth0_domain or auth0_domain == "Change":
        return {
            "message": "Auth0 not configured",
            "login_url": "Change: Configure AUTH0_DOMAIN and AUTH0_CLIENT_ID"
        }
    
    # Generate Auth0 login URL - make sure this matches your Auth0 dashboard settings
    login_url = f"https://{auth0_domain}/authorize?client_id={auth0_client_id}&response_type=code&redirect_uri={frontend_url}&scope=openid profile email&audience={os.getenv('AUTH0_AUDIENCE')}"
    return {"login_url": login_url}

@router.post("/logout")
async def logout():
    """Auth0 logout endpoint"""
    return {"message": "Logged out successfully"}
