from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from datetime import datetime
import uuid
from app.database import get_supabase
from fastapi import Body

router = APIRouter()

# Fallback in-memory store if Supabase not available
v2_data_store: Dict[str, Dict[str, Any]] = {}

@router.post("/create")
async def create_v2(data: Dict[str, Any]):
    """Create endpoint for API v2 - INTENTIONALLY DIFFERENT from v1"""
    item_id = str(uuid.uuid4())
    item = {
        "id": item_id,
        **data,
        "created_at": datetime.now().isoformat(),
        "version": "v2",
        "status": "active"
        # v2 REMOVES: dueDate, discountRate, loyaltyDiscount (regressions!)
    }
    
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("products_v2").insert(item).execute()
            if response.data:
                return response.data[0]
            return item
        except Exception as e:
            print(f"⚠️  Supabase insert error: {e}")
            # Fallback to in-memory
            v2_data_store[item_id] = item
            return item
    else:
        v2_data_store[item_id] = item
        return item

@router.get("/get/{item_id}")
async def get_v2(item_id: str):
    """Get endpoint for API v2"""
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("products_v2").select("*").eq("id", item_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            raise HTTPException(status_code=404, detail="Item not found")
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️  Supabase query error: {e}")
            # Fallback to in-memory
            if item_id not in v2_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            return v2_data_store[item_id]
    else:
        if item_id not in v2_data_store:
            raise HTTPException(status_code=404, detail="Item not found")
        return v2_data_store[item_id]

@router.get("/get")
async def get_all_v2():
    """Get all items for API v2"""
    supabase = get_supabase()
    if supabase:
        try:
            response = supabase.table("products_v2").select("*").execute()
            items = response.data if response.data else []
            return {"items": items, "count": len(items)}
        except Exception as e:
            print(f"⚠️  Supabase query error: {e}")
            # Fallback to in-memory
            return {"items": list(v2_data_store.values()), "count": len(v2_data_store)}
    else:
        return {"items": list(v2_data_store.values()), "count": len(v2_data_store)}

@router.put("/update/{item_id}")
async def update_v2(item_id: str, data: Dict[str, Any]):
    """Update endpoint for API v2"""
    supabase = get_supabase()
    if supabase:
        try:
            # Check if exists
            check = supabase.table("products_v2").select("id").eq("id", item_id).execute()
            if not check.data or len(check.data) == 0:
                raise HTTPException(status_code=404, detail="Item not found")
            
            data["updated_at"] = datetime.now().isoformat()
            response = supabase.table("products_v2").update(data).eq("id", item_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            # Fallback to in-memory
            if item_id not in v2_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            v2_data_store[item_id].update(data)
            v2_data_store[item_id]["updated_at"] = datetime.now().isoformat()
            return v2_data_store[item_id]
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️  Supabase update error: {e}")
            # Fallback to in-memory
            if item_id not in v2_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            v2_data_store[item_id].update(data)
            v2_data_store[item_id]["updated_at"] = datetime.now().isoformat()
            return v2_data_store[item_id]
    else:
        if item_id not in v2_data_store:
            raise HTTPException(status_code=404, detail="Item not found")
        v2_data_store[item_id].update(data)
        v2_data_store[item_id]["updated_at"] = datetime.now().isoformat()
        return v2_data_store[item_id]

@router.delete("/delete/{item_id}")
async def delete_v2(item_id: str):
    """Delete endpoint for API v2"""
    supabase = get_supabase()
    if supabase:
        try:
            # Get item before deleting
            check = supabase.table("products_v2").select("*").eq("id", item_id).execute()
            if not check.data or len(check.data) == 0:
                raise HTTPException(status_code=404, detail="Item not found")
            
            deleted_item = check.data[0]
            supabase.table("products_v2").delete().eq("id", item_id).execute()
            return {"message": "Item deleted", "item": deleted_item}
        except HTTPException:
            raise
        except Exception as e:
            print(f"⚠️  Supabase delete error: {e}")
            # Fallback to in-memory
            if item_id not in v2_data_store:
                raise HTTPException(status_code=404, detail="Item not found")
            deleted_item = v2_data_store.pop(item_id)
            return {"message": "Item deleted", "item": deleted_item}
    else:
        if item_id not in v2_data_store:
            raise HTTPException(status_code=404, detail="Item not found")
        deleted_item = v2_data_store.pop(item_id)
        return {"message": "Item deleted", "item": deleted_item}


# Compatibility endpoints under /products (aliases) to match client expectations
@router.post("/products")
async def create_v2_products(data: Dict[str, Any]):
    return await create_v2(data)


@router.get("/products/{item_id}")
async def get_v2_products(item_id: str):
    return await get_v2(item_id)


@router.get("/products")
async def get_all_v2_products():
    return await get_all_v2()


@router.put("/products/{item_id}")
async def update_v2_products(item_id: str, data: Dict[str, Any]):
    return await update_v2(item_id, data)


@router.delete("/products/{item_id}")
async def delete_v2_products(item_id: str):
    return await delete_v2(item_id)
# Assuming you have similar functions for v2: create_v2, get_v2, etc.
@router.post("/items")
async def create_v2_items(data: Dict[str, Any] = Body(...)):
    return await create_v2(data)

@router.get("/items/{item_id}")
async def get_v2_items(item_id: str):
    return await get_v2(item_id)

@router.get("/items")
async def get_all_v2_items():
    return await get_all_v2()

@router.put("/items/{item_id}")
async def update_v2_items(item_id: str, data: Dict[str, Any] = Body(...)):
    return await update_v2(item_id, data)

@router.delete("/items/{item_id}")
async def delete_v2_items(item_id: str):
    return await delete_v2(item_id)
