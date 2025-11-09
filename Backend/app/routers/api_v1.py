from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
from app.database import get_supabase
from fastapi import Body

router = APIRouter()

# Fallback in-memory store if Supabase not available
v1_data_store: Dict[str, Dict[str, Any]] = {}

def get_v1_store():
    """Get v1 data store - Supabase or in-memory fallback"""
    supabase = get_supabase()
    if supabase:
        return supabase.table("products_v1")
    return v1_data_store

@router.post("/create")
async def create_v1(data: Dict[str, Any]):
    """Create endpoint for API v1"""
    item_id = str(uuid.uuid4())
    item = {
        "id": item_id,
        **data,
        "created_at": datetime.now().isoformat(),
        "version": "v1",
        "status": "active",
        "due_date": "2024-12-31",  # v1 includes dueDate
        "discount_rate": 0.1,
        "loyalty_discount": 0.05
    }
    
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("products_v1").insert(item).execute()
            if response.data:
                return response.data[0]
            return item
        except Exception as e:
            print(f"⚠️  Supabase insert error: {e}")
            # Fallback to in-memory
            v1_data_store[item_id] = item
            return item
    else:
        v1_data_store[item_id] = item
        return item

@router.get("/get/{item_id}")
async def get_v1(item_id: str):
    """Get endpoint for API v1"""
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("products_v1").select("*").eq("id", item_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            raise HTTPException(status_code=404, detail="Item not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️  Supabase query error: {e}")
            # Fallback to in-memory
            if item_id not in v1_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            return v1_data_store[item_id]
    else:
        if item_id not in v1_data_store:
            raise HTTPException(status_code=404, detail="Item not found")
        return v1_data_store[item_id]

@router.get("/get")
async def get_all_v1():
    """Get all items for API v1"""
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("products_v1").select("*").execute()
            items = response.data if response.data else []
            return {"items": items, "count": len(items)}
        except Exception as e:
            print(f"⚠️  Supabase query error: {e}")
            # Fallback to in-memory
            return {"items": list(v1_data_store.values()), "count": len(v1_data_store)}
    else:
        return {"items": list(v1_data_store.values()), "count": len(v1_data_store)}

@router.put("/update/{item_id}")
async def update_v1(item_id: str, data: Dict[str, Any]):
    """Update endpoint for API v1"""
    supabase = get_supabase()
    if supabase:
        try:
            # Check if exists
            check = supabase.table("products_v1").select("id").eq("id", item_id).execute()
            if not check.data or len(check.data) == 0:
                raise HTTPException(status_code=404, detail="Item not found")
            
            data["updated_at"] = datetime.now().isoformat()
            response = supabase.table("products_v1").update(data).eq("id", item_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            # Fallback to in-memory
            if item_id not in v1_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            v1_data_store[item_id].update(data)
            v1_data_store[item_id]["updated_at"] = datetime.now().isoformat()
            return v1_data_store[item_id]
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️  Supabase update error: {e}")
            # Fallback to in-memory
            if item_id not in v1_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            v1_data_store[item_id].update(data)
            v1_data_store[item_id]["updated_at"] = datetime.now().isoformat()
            return v1_data_store[item_id]
    else:
        if item_id not in v1_data_store:
            raise HTTPException(status_code=404, detail="Item not found")
        v1_data_store[item_id].update(data)
        v1_data_store[item_id]["updated_at"] = datetime.now().isoformat()
        return v1_data_store[item_id]

@router.delete("/delete/{item_id}")
async def delete_v1(item_id: str):
    """Delete endpoint for API v1"""
    supabase = get_supabase()
    if supabase:
        try:
            # Get item before deleting
            check = supabase.table("products_v1").select("*").eq("id", item_id).execute()
            if not check.data or len(check.data) == 0:
                raise HTTPException(status_code=404, detail="Item not found")
            
            deleted_item = check.data[0]
            supabase.table("products_v1").delete().eq("id", item_id).execute()
            return {"message": "Item deleted", "item": deleted_item}
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️  Supabase delete error: {e}")
            # Fallback to in-memory
            if item_id not in v1_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            deleted_item = v1_data_store.pop(item_id)
            return {"message": "Item deleted", "item": deleted_item}
    else:
        if item_id not in v1_data_store:
            raise HTTPException(status_code=404, detail="Item not found")
        deleted_item = v1_data_store.pop(item_id)
        return {"message": "Item deleted", "item": deleted_item}


# Compatibility endpoints under /products (aliases) to match client expectations
@router.post("/products")
async def create_v1_products(data: Dict[str, Any]):
    return await create_v1(data)


@router.get("/products/{item_id}")
async def get_v1_products(item_id: str):
    return await get_v1(item_id)


@router.get("/products")
async def get_all_v1_products():
    return await get_all_v1()


@router.put("/products/{item_id}")
async def update_v1_products(item_id: str, data: Dict[str, Any]):
    return await update_v1(item_id, data)


@router.delete("/products/{item_id}")
async def delete_v1_products(item_id: str):
    return await delete_v1(item_id)

from fastapi import Body

# v1 aliases for /items to match client expectations
@router.post("/items")
async def create_v1_items(data: Dict[str, Any] = Body(...)):
    return await create_v1(data)

@router.get("/items/{item_id}")
async def get_v1_items(item_id: str):
    return await get_v1(item_id)

@router.get("/items")
async def get_all_v1_items():
    return await get_all_v1()

@router.put("/items/{item_id}")
async def update_v1_items(item_id: str, data: Dict[str, Any] = Body(...)):
    return await update_v1(item_id, data)

@router.delete("/items/{item_id}")
async def delete_v1_items(item_id: str):
    return await delete_v1(item_id)
from fastapi import Body

# v1 aliases for /items to match client expectations
@router.post("/items")
async def create_v1_items(data: Dict[str, Any] = Body(...)):
    return await create_v1(data)

@router.get("/items/{item_id}")
async def get_v1_items(item_id: str):
    return await get_v1(item_id)

@router.get("/items")
async def get_all_v1_items():
    return await get_all_v1()

@router.put("/items/{item_id}")
async def update_v1_items(item_id: str, data: Dict[str, Any] = Body(...)):
    return await update_v1(item_id, data)

@router.delete("/items/{item_id}")
async def delete_v1_items(item_id: str):
    return await delete_v1(item_id)
