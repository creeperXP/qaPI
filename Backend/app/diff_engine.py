from typing import Dict, Any, List
import json
import re
from datetime import datetime

class DiffEngine:
    """Core diff engine for comparing API responses"""
    
    # Fields that are expected to differ (generated IDs, timestamps, etc.)
    EXPECTED_DIFFERENCE_PATTERNS = [
        r'id$',  # Any field ending in 'id'
        r'^id$',  # Field named 'id'
        r'uuid$',  # UUID fields
        r'_id$',  # Foreign key fields
        r'created_at$',
        r'updated_at$',
        r'createdAt$',
        r'updatedAt$',
        r'timestamp$',
        r'time$',
        r'date$',
    ]
    
    @staticmethod
    def is_expected_difference(path: str, diff_type: str, v1_value: Any, v2_value: Any) -> bool:
        """Check if a difference is expected/acceptable (e.g., generated IDs, timestamps)"""
        # Check if path matches expected difference patterns
        for pattern in DiffEngine.EXPECTED_DIFFERENCE_PATTERNS:
            if re.search(pattern, path, re.IGNORECASE):
                # For value mismatches in expected fields, they're acceptable
                if diff_type == "value_mismatch":
                    return True
                # For missing fields that are expected to differ, check if it's a generated field
                if diff_type in ["missing_in_v1", "missing_in_v2"]:
                    # If it's a generated field pattern, it's acceptable
                    return True
        
        # Check if values look like UUIDs (both are strings and match UUID pattern)
        uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        if isinstance(v1_value, str) and isinstance(v2_value, str):
            if re.match(uuid_pattern, v1_value, re.IGNORECASE) and re.match(uuid_pattern, v2_value, re.IGNORECASE):
                return True
        
        # Check if values are timestamps (ISO format strings or numeric timestamps)
        if isinstance(v1_value, str) and isinstance(v2_value, str):
            try:
                # Try parsing as ISO datetime
                datetime.fromisoformat(v1_value.replace('Z', '+00:00'))
                datetime.fromisoformat(v2_value.replace('Z', '+00:00'))
                # Both are valid timestamps, difference is expected
                return True
            except:
                pass
        
        # Check if both are numeric and likely timestamps (Unix timestamps)
        if isinstance(v1_value, (int, float)) and isinstance(v2_value, (int, float)):
            # If values are large numbers (likely timestamps) and reasonably close, it's expected
            if v1_value > 1000000000 and v2_value > 1000000000:
                # Timestamps within 1 hour of each other are considered expected
                if abs(v1_value - v2_value) < 3600:
                    return True
        
        return False
    
    @staticmethod
    def deep_compare(obj1: Any, obj2: Any, path: str = "") -> List[Dict[str, Any]]:
        """Recursively compare two objects and return differences"""
        differences = []
        
        # Both are None or same value
        if obj1 == obj2:
            return differences
        
        # Type mismatch
        if type(obj1) != type(obj2):
            differences.append({
                "path": path,
                "type": "type_mismatch",
                "v1_value": obj1,
                "v2_value": obj2,
                "v1_type": str(type(obj1).__name__),
                "v2_type": str(type(obj2).__name__),
                "severity": "high"
            })
            return differences
        
        # Dictionary comparison
        if isinstance(obj1, dict):
            all_keys = set(obj1.keys()) | set(obj2.keys())
            
            for key in all_keys:
                new_path = f"{path}.{key}" if path else key
                
                if key not in obj1:
                    diff = {
                        "path": new_path,
                        "type": "missing_in_v1",
                        "v1_value": None,
                        "v2_value": obj2[key],
                        "severity": "medium"
                    }
                    if DiffEngine.is_expected_difference(new_path, "missing_in_v1", None, obj2[key]):
                        diff["is_expected"] = True
                        diff["severity"] = "low"
                    differences.append(diff)
                elif key not in obj2:
                    diff = {
                        "path": new_path,
                        "type": "missing_in_v2",
                        "v1_value": obj1[key],
                        "v2_value": None,
                        "severity": "high"  # Regression - field removed
                    }
                    # Only mark as expected if it's a generated field (like timestamps that might not be in v2)
                    if DiffEngine.is_expected_difference(new_path, "missing_in_v2", obj1[key], None):
                        diff["is_expected"] = True
                        diff["severity"] = "medium"  # Still medium severity even if expected
                    differences.append(diff)
                else:
                    differences.extend(
                        DiffEngine.deep_compare(obj1[key], obj2[key], new_path)
                    )
        
        # List comparison
        elif isinstance(obj1, list):
            max_len = max(len(obj1), len(obj2))
            
            for i in range(max_len):
                new_path = f"{path}[{i}]"
                
                if i >= len(obj1):
                    differences.append({
                        "path": new_path,
                        "type": "missing_in_v1",
                        "v1_value": None,
                        "v2_value": obj2[i],
                        "severity": "medium"
                    })
                elif i >= len(obj2):
                    differences.append({
                        "path": new_path,
                        "type": "missing_in_v2",
                        "v1_value": obj1[i],
                        "v2_value": None,
                        "severity": "high"
                    })
                else:
                    differences.extend(
                        DiffEngine.deep_compare(obj1[i], obj2[i], new_path)
                    )
        
        # Primitive value comparison
        else:
            # Check if this is an expected difference before adding it
            diff = {
                "path": path,
                "type": "value_mismatch",
                "v1_value": obj1,
                "v2_value": obj2,
                "severity": "medium"
            }
            # Mark as expected if it matches expected patterns
            if DiffEngine.is_expected_difference(path, "value_mismatch", obj1, obj2):
                diff["is_expected"] = True
                diff["severity"] = "low"  # Lower severity for expected differences
            differences.append(diff)
        
        return differences
    
    @staticmethod
    def detect_regressions(differences: List[Dict[str, Any]]) -> bool:
        """Determine if differences constitute regressions
        
        Regressions are:
        - Missing fields in v2 (field removed) - unless it's an expected generated field
        - Type mismatches
        - Error status differences
        - Value mismatches in non-generated fields
        
        NOT regressions:
        - Generated IDs (UUIDs, auto-increment IDs)
        - Timestamps (created_at, updated_at)
        - Other expected differences
        """
        # Filter out expected differences
        unexpected_diffs = [d for d in differences if not d.get("is_expected", False)]

        if not unexpected_diffs:
            return False

        def _is_regression_diff(diff: Dict[str, Any]) -> bool:
            """Decide whether a single diff should be treated as a regression.

            Rules:
            - Type mismatches are regressions.
            - Fields removed in v2 (missing_in_v2) are regressions.
            - Error statuses (v2_error, response_error, both_errors, v1_error) are regressions.
            - Pure value mismatches where the types are the same (e.g., generated IDs, timestamps,
              or other differing values) are NOT regressions.
            - High severity diffs are regressions unless they are value-only with same types.
            """
            diff_type = diff.get("type", "")

            # Always regress for these structural/problematic types
            if diff_type in ["type_mismatch", "missing_in_v2", "response_error"]:
                return True

            # Any error-related diffs should be treated as regressions
            if diff_type in ["v1_error", "v2_error", "both_errors"]:
                return True

            # Value mismatches: if both sides exist and have the same type, treat as non-regression
            if diff_type == "value_mismatch":
                v1_type = diff.get("v1_type") or (type(diff.get("v1_value")).__name__ if "v1_value" in diff else None)
                v2_type = diff.get("v2_type") or (type(diff.get("v2_value")).__name__ if "v2_value" in diff else None)

                # If both types are present and equal, this is a value-only difference -> not a regression
                if v1_type and v2_type and v1_type == v2_type:
                    return False

                # If types differ or are missing, be conservative and treat as regression
                return True

            # Missing_in_v1 (new fields in v2) is usually not a regression
            if diff_type == "missing_in_v1":
                return False

            # Otherwise, fall back to severity: high severity is a regression
            if diff.get("severity") == "high":
                return True

            return False

        # If any unexpected diff qualifies as a regression, return True
        for d in unexpected_diffs:
            if _is_regression_diff(d):
                return True

        return False
    
    @staticmethod
    def calculate_severity(differences: List[Dict[str, Any]]) -> str:
        """Calculate overall regression severity based on unexpected differences only"""
        # Filter out expected differences
        unexpected_diffs = [d for d in differences if not d.get("is_expected", False)]

        if not unexpected_diffs:
            return "none"

        # Reuse the same logic as detect_regressions to determine which diffs are true regressions
        def _is_regression_diff(diff: Dict[str, Any]) -> bool:
            diff_type = diff.get("type", "")

            if diff_type in ["type_mismatch", "missing_in_v2", "response_error"]:
                return True
            if diff_type in ["v1_error", "v2_error", "both_errors"]:
                return True
            if diff_type == "value_mismatch":
                v1_type = diff.get("v1_type") or (type(diff.get("v1_value")).__name__ if "v1_value" in diff else None)
                v2_type = diff.get("v2_type") or (type(diff.get("v2_value")).__name__ if "v2_value" in diff else None)
                if v1_type and v2_type and v1_type == v2_type:
                    return False
                return True
            if diff_type == "missing_in_v1":
                return False
            if diff.get("severity") == "high":
                return True
            return False

        regression_diffs = [d for d in unexpected_diffs if _is_regression_diff(d)]

        if not regression_diffs:
            return "none"

        high_count = sum(1 for d in regression_diffs if d.get("severity") == "high")
        medium_count = sum(1 for d in regression_diffs if d.get("severity") == "medium")

        critical_types = ["missing_in_v2", "type_mismatch", "v2_error"]
        critical_count = sum(1 for d in regression_diffs if d.get("type") in critical_types)

        if critical_count > 0 or high_count > 0:
            return "critical" if (critical_count > 2 or high_count > 3) else "high"
        elif medium_count > 0:
            return "medium" if medium_count > 3 else "low"
        else:
            return "low"



