import os
from dotenv import load_dotenv
import pathlib

# Load .env from root directory
root_dir = pathlib.Path(__file__).parent.parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

# Supabase client
# Try DATABASE_URL first (Supabase connection string), then SUPABASE_URL
database_url = os.getenv("DATABASE_URL")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
print("SUPABASE_URL:", "SUPABASE_URL")  # for debugging

if supabase_url and supabase_key and supabase_url != "Change" and supabase_key != "Change":
    try:
        from supabase import create_client, Client
        
        supabase_client: Client = create_client(supabase_url, supabase_key)
        print("✅ Supabase client initialized successfully")
    except Exception as e:
        print(f"⚠️  Supabase initialization error: {e}")
        print("⚠️  Continuing without database - using in-memory storage")
        supabase_client = None
else:
    print("⚠️  Supabase not configured - using in-memory storage")
    print("   Set SUPABASE_URL and SUPABASE_KEY (or DATABASE_URL) in .env file")

# Firestore initialization (for comparison history - optional)
def init_firestore():
    """Initialize Firestore database connection"""
    try:
        firebase_creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        firebase_project_id = os.getenv("FIREBASE_PROJECT_ID")
        
        if firebase_creds_path and firebase_project_id and firebase_creds_path != "Change":
            import firebase_admin
            from firebase_admin import credentials, firestore
            
            if not firebase_admin._apps:
                cred = credentials.Certificate(firebase_creds_path)
                firebase_admin.initialize_app(cred, {
                    'projectId': firebase_project_id
                })
            
            db = firestore.client()
            return db
        else:
            print("⚠️  Firestore not configured - using in-memory storage")
            return None
    except Exception as e:
        print(f"⚠️  Firestore initialization error: {e}")
        return None

def get_supabase():
    """Get Supabase client"""
    return supabase_client

def get_db():
    """Get database - returns Supabase client or None"""
    return supabase_client

def init_db():
    """Initialize databases"""
    if supabase_client:
        try:
            # Test connection and create tables if they don't exist
            try:
                response = supabase_client.table("users").select("count").limit(1).execute()
                print("✅ Supabase 'users' table verified")
            except Exception as e:
                print(f"⚠️  'users' table not found: {e}")
            
            try:
                response = supabase_client.table("products_v1").select("count").limit(1).execute()
                print("✅ Supabase 'products_v1' table verified")
            except Exception as e:
                print(f"⚠️  'products_v1' table not found - will be created on first use")
            
            try:
                response = supabase_client.table("products_v2").select("count").limit(1).execute()
                print("✅ Supabase 'products_v2' table verified")
            except Exception as e:
                print(f"⚠️  'products_v2' table not found - will be created on first use")
                
            print("✅ Supabase database connection verified")
        except Exception as e:
            print(f"⚠️  Supabase connection test failed: {e}")
            print("   Make sure your Supabase tables exist")
    
    init_firestore()

# Helper functions for user management
def get_user_by_auth0_id(auth0_id: str):
    """Get user by Auth0 ID"""
    if not supabase_client:
        return None
    try:
        response = supabase_client.table("users").select("*").eq("auth0_id", auth0_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"⚠️  Error getting user: {e}")
        return None

def create_or_update_user(auth0_id: str, email: str = None, name: str = None):
    """Create or update user in Supabase"""
    if not supabase_client:
        return None
    try:
        # Check if user exists
        existing = get_user_by_auth0_id(auth0_id)
        
        from datetime import datetime
        user_data = {
            "auth0_id": auth0_id,
            "email": email,
            "name": name,
            "last_login": datetime.utcnow().isoformat()
        }
        
        if existing:
            # Update existing user
            response = supabase_client.table("users").update(user_data).eq("auth0_id", auth0_id).execute()
            return response.data[0] if response.data and len(response.data) > 0 else existing
        else:
            # Create new user
            user_data["created_at"] = datetime.utcnow().isoformat()
            response = supabase_client.table("users").insert(user_data).execute()
            return response.data[0] if response.data and len(response.data) > 0 else None
    except Exception as e:
        print(f"⚠️  Error creating/updating user: {e}")
        return None
