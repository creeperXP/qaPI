from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum

class EndpointType(str, Enum):
    CREATE = "create"
    GET = "get"
    UPDATE = "update"
    DELETE = "delete"

class ComparisonRequest(BaseModel):
    endpoint: str
    method: str
    payload: Optional[Dict[str, Any]] = None
    params: Optional[Dict[str, Any]] = None
    v1_version: Optional[str] = "v1"
    v2_version: Optional[str] = "v2"

class ComparisonResult(BaseModel):
    endpoint: str
    method: str
    v1_response: Dict[str, Any]
    v2_response: Dict[str, Any]
    differences: List[Dict[str, Any]]
    is_regression: bool
    regression_severity: Optional[str] = None
    timestamp: datetime
    v1_request_time_ms: Optional[float] = None
    v2_request_time_ms: Optional[float] = None

class RegressionSummary(BaseModel):
    total_endpoints_tested: int
    regressions_found: int
    critical_regressions: int
    warnings: int
    health_score: float
    results: List[Dict[str, Any]]  # Changed to Dict to allow risk_counts field

class AIExplanationRequest(BaseModel):
    comparison_result: ComparisonResult
    user_question: Optional[str] = None

class AIExplanation(BaseModel):
    explanation: str
    suggested_fix: Optional[str] = None
    confidence_score: float
    impact_assessment: str

class ReportAnalysisRequest(BaseModel):
    report: Dict[str, Any]  # The full saved test report

class ReportAnalysis(BaseModel):
    developer_perspective: str
    user_perspective: str
    business_perspective: str
    regression_analysis: str
    predicted_failures: str
    ethical_concerns: str

class WorkflowPlanRequest(BaseModel):
    endpoints: List[str]
    # If true, use quicker, lower-token model settings for faster responses
    fast: Optional[bool] = False

class WorkflowPlan(BaseModel):
    endpoints_to_test: List[str]
    execution_order: List[str]
    estimated_duration: Optional[int] = None

class TestCase(BaseModel):
    name: str
    method: str
    endpoint: str
    payload: Optional[str] = None
    expected_fields: Optional[List[str]] = None
    description: Optional[str] = None
    role: Optional[str] = "user"  # user, admin, etc.
    failure_reason: Optional[str] = None

class TestCaseGenerationRequest(BaseModel):
    service_description: str
    # Optional: request a specific number of test cases (default: 5)
    num_test_cases: Optional[int] = 5
    # Optional free-text filter or search describing which specific test cases to include
    case_filter: Optional[str] = None

class TestCaseGenerationResponse(BaseModel):
    test_cases: List[TestCase]

class ChatRequest(BaseModel):
    question: str
    context: Optional[ComparisonResult] = None

class SavedTestReport(BaseModel):
    id: Optional[str] = None
    title: str
    notes: Optional[str] = None
    report_style: str = "detailed"  # detailed, summary, minimal
    test_data: Dict[str, Any]
    saved_at: datetime
    test_type: str = "single"  # single, all_tests
    folder_id: Optional[str] = None  # Folder organization

class TestFolder(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    created_at: datetime
    color: Optional[str] = None  # For UI color coding

class SavedAnalysis(BaseModel):
    id: Optional[str] = None
    report_id: str
    developer: str
    user: str
    business: str
    prediction: str
    changes: str
    ethical: str
    created_at: Optional[datetime] = None

