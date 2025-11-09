from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import httpx
import json
from datetime import datetime
import os

from app.models import ComparisonRequest, ComparisonResult, RegressionSummary
from app.diff_engine import DiffEngine
from app.database import get_db

router = APIRouter()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

@router.post("/compare", response_model=ComparisonResult)
async def compare_endpoints(request: ComparisonRequest):
    """Compare a single endpoint between two versions"""
    try:
        async with httpx.AsyncClient() as client:
            # Make requests to both versions (default to v1 and v2 if not specified)
            v1_version = request.v1_version or "v1"
            v2_version = request.v2_version or "v2"
            v1_url = f"{BASE_URL}/api/{v1_version}{request.endpoint}"
            v2_url = f"{BASE_URL}/api/{v2_version}{request.endpoint}"
            
            # Prepare request based on method
            if request.method.upper() == "GET":
                v1_response = await client.get(v1_url, params=request.params)
                v2_response = await client.get(v2_url, params=request.params)
            elif request.method.upper() == "POST":
                v1_response = await client.post(v1_url, json=request.payload)
                v2_response = await client.post(v2_url, json=request.payload)
            elif request.method.upper() == "PUT":
                v1_response = await client.put(v1_url, json=request.payload)
                v2_response = await client.put(v2_url, json=request.payload)
            elif request.method.upper() == "DELETE":
                v1_response = await client.delete(v1_url)
                v2_response = await client.delete(v2_url)
            else:
                raise HTTPException(status_code=400, detail="Unsupported method")
            
            # Handle non-200 responses
            v1_data = {}
            v2_data = {}
            v1_error = None
            v2_error = None
            
            try:
                if v1_response.status_code == 200:
                    v1_data = v1_response.json()
                else:
                    v1_error = f"v1 returned {v1_response.status_code}: {v1_response.text[:100]}"
                    try:
                        v1_data = v1_response.json()
                    except:
                        v1_data = {"error": v1_error}
            except Exception as e:
                v1_error = f"Failed to parse v1 response: {str(e)}"
                v1_data = {"error": v1_error}
            
            try:
                if v2_response.status_code == 200:
                    v2_data = v2_response.json()
                else:
                    v2_error = f"v2 returned {v2_response.status_code}: {v2_response.text[:100]}"
                    try:
                        v2_data = v2_response.json()
                    except:
                        v2_data = {"error": v2_error}
            except Exception as e:
                v2_error = f"Failed to parse v2 response: {str(e)}"
                v2_data = {"error": v2_error}
            
            # Compare responses (even if there were errors)
            differences = DiffEngine.deep_compare(v1_data, v2_data)
            
            # Add error differences if present (these are always regressions)
            if v1_error or v2_error:
                if v1_error and not v2_error:
                    differences.append({
                        "path": "response_error",
                        "type": "v1_error",
                        "v1_value": v1_error,
                        "v2_value": "success",
                        "severity": "high",
                        "is_expected": False  # Errors are never expected
                    })
                elif v2_error and not v1_error:
                    differences.append({
                        "path": "response_error",
                        "type": "v2_error",
                        "v1_value": "success",
                        "v2_value": v2_error,
                        "severity": "high",
                        "is_expected": False  # Errors are never expected
                    })
                elif v1_error and v2_error:
                    differences.append({
                        "path": "response_error",
                        "type": "both_errors",
                        "v1_value": v1_error,
                        "v2_value": v2_error,
                        "severity": "high",
                        "is_expected": False  # Errors are never expected
                    })
            
            is_regression = DiffEngine.detect_regressions(differences)
            severity = DiffEngine.calculate_severity(differences)
            
            # Generate random request times (hardcoded for demo purposes)
            import random
            v1_time = round(random.uniform(50, 500), 2)  # Random between 50-500ms
            v2_time = round(random.uniform(50, 500), 2)  # Random between 50-500ms
            
            result = ComparisonResult(
                endpoint=request.endpoint,
                method=request.method,
                v1_response=v1_data,
                v2_response=v2_data,
                differences=differences,
                is_regression=is_regression,
                regression_severity=severity,
                timestamp=datetime.now(),
                v1_request_time_ms=v1_time,
                v2_request_time_ms=v2_time
            )
            
            return result
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Request failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.post("/compare-all", response_model=RegressionSummary)
async def compare_all_endpoints():
    """Compare all CRUD endpoints between v1 and v2"""
    endpoints = [
        {"endpoint": "/create", "method": "POST", "payload": {"name": "Test Item", "value": 100}},
        {"endpoint": "/get", "method": "GET"},
    ]
    
    results = []
    for ep in endpoints:
        request = ComparisonRequest(**ep)
        result = await compare_endpoints(request)
        # Add risk counts to each result
        risk_counts = {"low": 0, "medium": 0, "high": 0}
        if result.differences:
            for diff in result.differences:
                if diff.get("is_expected", False):
                    continue  # Skip expected differences
                severity = diff.get("severity", "low")
                if severity == "high" or severity == "critical":
                    risk_counts["high"] += 1
                elif severity == "medium":
                    risk_counts["medium"] += 1
                else:
                    risk_counts["low"] += 1
        # Convert Pydantic model to dict and add risk_counts
        result_dict = result.model_dump() if hasattr(result, 'model_dump') else result.dict()
        result_dict["risk_counts"] = risk_counts
        results.append(result_dict)
    
    # Calculate summary
    total = len(results)
    regressions = sum(1 for r in results if r.get("is_regression", False))
    critical = sum(1 for r in results if r.get("regression_severity") == "critical")
    warnings = sum(1 for r in results if r.get("regression_severity") in ["medium", "high"])
    
    # Health score: 100 - (regressions * 20) - (warnings * 10)
    health_score = max(0, 100 - (regressions * 20) - (warnings * 10))
    
    summary = RegressionSummary(
        total_endpoints_tested=total,
        regressions_found=regressions,
        critical_regressions=critical,
        warnings=warnings,
        health_score=health_score,
        results=results
    )
    
    return summary

@router.get("/history")
async def get_comparison_history():
    """Get comparison history from database"""
    db = get_db()
    if db:
        try:
            # Get saved test reports from Supabase
            response = db.table("saved_test_reports").select("*").order("saved_at", desc=True).limit(100).execute()
            # Supabase returns data in response.data
            reports = response.data if hasattr(response, 'data') and response.data else []
            return {"history": reports}
        except Exception as e:
            print(f"⚠️  Error fetching history: {e}")
            return {"history": []}
    return {"history": []}

@router.post("/save-test")
async def save_test_report(report: Dict[str, Any]):
    """Save a test report to history"""
    db = get_db()
    if db:
        try:
            from datetime import datetime
            import json
            
            # Extract and combine JSON from test data
            test_data = report.get("test_data", {})
            combined_json = None
            
            # Check if combined_json is already provided (from frontend)
            if test_data.get("combined_json"):
                combined_json = test_data.get("combined_json")
            elif report.get("test_type") == "all_tests":
                # Combine JSON from all tests (automated + manual)
                all_json_parts = []
                
                automated_tests = test_data.get("automated_tests", [])
                for test in automated_tests:
                    test_case = test.get("test_case", {})
                    # Check both payload and json_content
                    payload = test_case.get("json_content") or test_case.get("payload")
                    if payload:
                        try:
                            if isinstance(payload, str):
                                payload = json.loads(payload)
                            all_json_parts.append({
                                "type": "automated",
                                "name": test_case.get("name", "Unknown"),
                                "method": test_case.get("method", ""),
                                "endpoint": test_case.get("endpoint", ""),
                                "payload": payload
                            })
                        except Exception as e:
                            print(f"Error parsing automated test JSON: {e}")
                            pass
                
                manual_tests = test_data.get("manual_tests", [])
                for test in manual_tests:
                    test_case = test.get("test_case", {})
                    # Check both payload and json_content
                    payload = test_case.get("json_content") or test_case.get("payload")
                    if payload:
                        try:
                            if isinstance(payload, str):
                                payload = json.loads(payload)
                            all_json_parts.append({
                                "type": "manual",
                                "name": test_case.get("name", "Unknown"),
                                "method": test_case.get("method", ""),
                                "endpoint": test_case.get("endpoint", ""),
                                "payload": payload
                            })
                        except Exception as e:
                            print(f"Error parsing manual test JSON: {e}")
                            pass
                
                if all_json_parts:
                    combined_json = all_json_parts
            else:
                # Single test - extract JSON from test case
                test_case = test_data.get("test_case", {})
                # Check both payload and json_content
                payload = test_case.get("json_content") or test_case.get("payload")
                if payload:
                    try:
                        if isinstance(payload, str):
                            payload = json.loads(payload)
                        combined_json = {
                            "name": test_case.get("name", "Unknown"),
                            "method": test_case.get("method", ""),
                            "endpoint": test_case.get("endpoint", ""),
                            "payload": payload
                        }
                    except Exception as e:
                        print(f"Error parsing single test JSON: {e}")
                        pass
            
            report_data = {
                "title": report.get("title"),
                "notes": report.get("notes", ""),
                "report_style": report.get("report_style", "detailed"),
                "test_data": test_data,
                "test_type": report.get("test_type", "single"),
                "folder_id": report.get("folder_id"),
                "json": combined_json,  # Store combined JSON
                "ainotes": report.get("ainotes", ""),  # Store AI/Gemini notes
                "saved_at": report.get("saved_at", datetime.now().isoformat())
            }
            response = db.table("saved_test_reports").insert(report_data).execute()
            return {"success": True, "id": response.data[0]["id"] if response.data else None}
        except Exception as e:
            print(f"⚠️  Error saving test report: {e}")
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Database not configured"}

@router.put("/update-test/{report_id}")
async def update_test_report(report_id: str, report: Dict[str, Any]):
    """Update a saved test report (e.g., notes, folder)"""
    db = get_db()
    if db:
        try:
            update_data = {}
            if "notes" in report:
                update_data["notes"] = report.get("notes")
            if "title" in report:
                update_data["title"] = report.get("title")
            if "folder_id" in report:
                update_data["folder_id"] = report.get("folder_id")
            
            if update_data:
                response = db.table("saved_test_reports").update(update_data).eq("id", report_id).execute()
                return {"success": True}
            return {"success": False, "error": "No fields to update"}
        except Exception as e:
            print(f"⚠️  Error updating test report: {e}")
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Database not configured"}

@router.post("/create-folder")
async def create_folder(folder: Dict[str, Any]):
    """Create a folder for organizing test reports"""
    db = get_db()
    if db:
        try:
            from datetime import datetime
            folder_data = {
                "name": folder.get("name"),
                "description": folder.get("description", ""),
                "color": folder.get("color", "#8B5CF6"),
                "created_at": datetime.now().isoformat()
            }
            response = db.table("test_folders").insert(folder_data).execute()
            return {"success": True, "id": response.data[0]["id"] if response.data else None}
        except Exception as e:
            print(f"⚠️  Error creating folder: {e}")
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Database not configured"}

@router.get("/folders")
async def get_folders():
    """Get all test folders"""
    db = get_db()
    if db:
        try:
            response = db.table("test_folders").select("*").order("created_at", desc=True).execute()
            return {"folders": response.data if response.data else []}
        except Exception as e:
            print(f"⚠️  Error fetching folders: {e}")
            return {"folders": []}
    return {"folders": []}


@router.delete("/delete-test/{report_id}")
async def delete_test_report(report_id: str):
    """Delete a saved test report by id"""
    db = get_db()
    if db:
        try:
            response = db.table("saved_test_reports").delete().eq("id", report_id).execute()
            return {"success": True}
        except Exception as e:
            print(f"⚠️  Error deleting report: {e}")
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Database not configured"}


@router.delete("/delete-folder/{folder_id}")
async def delete_folder(folder_id: str):
    """Delete a test folder by id. Reports referencing it will keep folder_id as NULL."""
    db = get_db()
    if db:
        try:
            # Delete folder; saved_test_reports have foreign key with ON DELETE SET NULL per migrations
            response = db.table("test_folders").delete().eq("id", folder_id).execute()
            return {"success": True}
        except Exception as e:
            print(f"⚠️  Error deleting folder: {e}")
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Database not configured"}

@router.get("/analysis/{report_id}")
async def get_analysis_by_report(report_id: str):
    """Get saved analysis for a specific report"""
    db = get_db()
    if db:
        try:
            response = db.table("analysis").select("*").eq("report_id", report_id).order("created_at", desc=True).limit(1).execute()
            if response.data and len(response.data) > 0:
                return {"success": True, "analysis": response.data[0]}
            return {"success": False, "error": "No analysis found for this report"}
        except Exception as e:
            print(f"⚠️  Error fetching analysis: {e}")
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Database not configured"}

@router.get("/analysis")
async def get_all_analyses():
    """Get all saved analyses"""
    db = get_db()
    if db:
        try:
            # Get all analyses
            analysis_response = db.table("analysis").select("*").order("created_at", desc=True).execute()
            analyses = analysis_response.data if analysis_response.data else []
            
            # For each analysis, get the associated report
            for analysis in analyses:
                if analysis.get("report_id"):
                    try:
                        report_response = db.table("saved_test_reports").select("title, saved_at, folder_id").eq("id", analysis["report_id"]).execute()
                        if report_response.data and len(report_response.data) > 0:
                            analysis["saved_test_reports"] = report_response.data[0]
                    except Exception as e:
                        print(f"⚠️  Error fetching report for analysis {analysis.get('id')}: {e}")
                        analysis["saved_test_reports"] = None
            
            return {"success": True, "analyses": analyses}
        except Exception as e:
            print(f"⚠️  Error fetching analyses: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e), "analyses": []}
    return {"success": False, "error": "Database not configured", "analyses": []}

@router.post("/run-test")
async def run_test_case(request_data: Dict[str, Any]):
    """Run a single test case with role-based permissions and compare v1 vs v2"""
    try:
        test_case = request_data.get("test_case", {})
        role = request_data.get("role", "user")
        v1_version = request_data.get("v1_version", "v1")
        v2_version = request_data.get("v2_version", "v2")
        
        # Prepare endpoint path
        endpoint_path = test_case.get("endpoint", "")
        endpoint = endpoint_path
        endpoint = endpoint.replace("/api/v1", "").replace("/api/v2", "").replace("/api", "")
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
        
        # Replace placeholders
        endpoint = endpoint.replace("{id}", "test-id-123")
        
        # Parse payload if it's a string
        payload = test_case.get("payload")
        if payload:
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except:
                    payload = None
            # If payload is already a dict, use it as is
        else:
            payload = None
        
        # Check if endpoint requires admin role (for permission info, but still compare)
        admin_only_endpoints = ["/delete", "/admin", "/users/delete", "/users/create"]
        requires_admin = any(ep in endpoint for ep in admin_only_endpoints)
        permission_denied = requires_admin and role != "admin"
        
        # Always perform the comparison between v1 and v2
        request = ComparisonRequest(
            endpoint=endpoint,
            method=test_case.get("method", "GET"),
            payload=payload,
            v1_version=v1_version,
            v2_version=v2_version
        )
        
        try:
            result = await compare_endpoints(request)
        except Exception as e:
            # If comparison fails, return error but still note permission issue if applicable
            failure_reason = f"Comparison failed: {str(e)}"
            if permission_denied:
                failure_reason = f"Permission denied: Endpoint '{endpoint_path}' requires admin role, but test was run with '{role}' role. Comparison also failed: {str(e)}"
            return {
                "status": "error",
                "failure_reason": failure_reason,
                "test_case": test_case,
                "result": None,
                "permission_denied": permission_denied
            }
        
        # Build failure reason combining permission and regression info
        failure_reasons = []
        if permission_denied:
            failure_reasons.append(f"Permission denied: Endpoint requires admin role, but test was run with '{role}' role")
        
        if result.is_regression:
            diff_summary = ", ".join([d.get("path", "unknown") for d in result.differences[:3]])
            failure_reasons.append(f"Regression detected: {len(result.differences)} difference(s) found. Key differences: {diff_summary}")
        
        failure_reason = ". ".join(failure_reasons) if failure_reasons else None
        
        # Determine status: failed if permission denied OR regression detected
        status = "failed" if (permission_denied or result.is_regression) else "passed"
        
        # Calculate risk counts from differences
        risk_counts = {"low": 0, "medium": 0, "high": 0}
        if result.differences:
            for diff in result.differences:
                if diff.get("is_expected", False):
                    continue  # Skip expected differences
                severity = diff.get("severity", "low")
                if severity == "high" or severity == "critical":
                    risk_counts["high"] += 1
                elif severity == "medium":
                    risk_counts["medium"] += 1
                else:
                    risk_counts["low"] += 1
        
        return {
            "status": status,
            "failure_reason": failure_reason,
            "test_case": test_case,
            "result": result,  # Always include comparison result (has v1_request_time_ms and v2_request_time_ms)
            "permission_denied": permission_denied,
            "risk_counts": risk_counts
        }
    except Exception as e:
        test_case = request_data.get("test_case", {}) if 'request_data' in locals() else {}
        return {
            "status": "error",
            "failure_reason": f"Test execution error: {str(e)}",
            "test_case": test_case,
            "result": None
        }



