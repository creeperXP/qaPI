from fastapi import APIRouter, HTTPException
from typing import Optional, List
import os
from dotenv import load_dotenv
import pathlib
import json
import logging
import anyio
import time

# Official SDKs per provided docs
from google import genai
from openai import OpenAI

from app.models import (
    ComparisonResult,
    AIExplanationRequest,
    ReportAnalysisRequest,
    ReportAnalysis,
    AIExplanation,
    WorkflowPlan,
    WorkflowPlanRequest,
    TestCase,
    TestCaseGenerationRequest,
    TestCaseGenerationResponse,
    ChatRequest,
)

logger = logging.getLogger(__name__)

# Load .env from root directory
root_dir = pathlib.Path(__file__).parent.parent.parent
env_path = root_dir / ".env"
load_dotenv(dotenv_path=env_path)

router = APIRouter()

# Initialize SDK clients once
_gemini_client: Optional[genai.Client] = None
_nemo_client: Optional[OpenAI] = None
_response_cache: dict = {}
_CACHE_TTL = 300  # seconds
def init_clients() -> None:
    """Initialize SDK clients once using environment variables."""
    global _gemini_client, _nemo_client
    gemini_key = os.getenv("GEMINI_API_KEY")
    nemo_key = os.getenv("NEMOTRON_API_KEY")

    if gemini_key and gemini_key != "Change":
        try:
            _gemini_client = genai.Client(api_key=gemini_key)
            logger.info("Gemini client initialized")
        except Exception as e:
            logger.error("Failed to init Gemini client: %s", e)
            _gemini_client = None

    if nemo_key and nemo_key != "Change":
        try:
            _nemo_client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=nemo_key)
            logger.info("NeMo client initialized")
        except Exception as e:
            logger.error("Failed to init NeMo client: %s", e)
            _nemo_client = None


init_clients()


async def run_blocking(func, *args, **kwargs):
    """Run blocking SDK calls in a thread to avoid blocking the event loop."""
    return await anyio.to_thread.run_sync(lambda: func(*args, **kwargs))


@router.post("/workflow/plan", response_model=WorkflowPlan)
async def plan_workflow(request: WorkflowPlanRequest):
    """Plan workflow using NVIDIA NeMo (Nemotron) when available, else fallback."""
    if not _nemo_client:
        ordered = []
        for ep in request.endpoints:
            if '/create' in ep or '/post' in ep.lower():
                ordered.insert(0, ep)
            elif '/get' in ep or '/read' in ep.lower():
                ordered.append(ep)
            else:
                ordered.append(ep)
        return WorkflowPlan(endpoints_to_test=request.endpoints, execution_order=ordered or request.endpoints, estimated_duration=len(request.endpoints) * 5)

    differences_text = "\n".join(request.endpoints[:20])
    prompt = f"Analyze these endpoints and return a numbered workflow plan for testing in plain text:\n\n{differences_text}. It should be numbered 1. 2. 3. 4. with no asterics, SHORT bullet points"

    try:
        def call_nemo():
            # If the caller requested a fast response, reduce tokens and temperature
            if getattr(request, 'fast', False):
                return _nemo_client.chat.completions.create(
                    model="nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                    top_p=0.2,
                    max_tokens=256,
                    stream=False,
                )
            return _nemo_client.chat.completions.create(
                model="nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                top_p=0.5,
                max_tokens=512,
                stream=False,
            )

        completion = await run_blocking(call_nemo)

        text = ""
        try:
            if hasattr(completion, 'choices'):
                text = getattr(completion.choices[0].message, 'content', None) or getattr(completion.choices[0], 'message', '') or str(completion)
            else:
                text = str(completion)
        except Exception:
            text = str(completion)

        steps = [line.strip() for line in text.splitlines() if line.strip()]
        # Return the correct WorkflowPlan shape expected by the API (endpoints_to_test + execution_order)
        execution_order = steps or request.endpoints
        estimated_duration = max(1, len(execution_order)) * 2
        return WorkflowPlan(endpoints_to_test=request.endpoints, execution_order=execution_order, estimated_duration=estimated_duration)
    except Exception as e:
        logger.error("NeMo workflow error: %s", e)
        return WorkflowPlan(endpoints_to_test=request.endpoints, execution_order=request.endpoints, estimated_duration=len(request.endpoints) * 5)


@router.post("/explain", response_model=AIExplanation)
async def explain_regression(request: AIExplanationRequest):
    """Explain regressions using Gemini (genai) when available, else fallback."""
    if not _gemini_client:
        differences_summary = ", ".join([d.get("path", "unknown") for d in request.comparison_result.differences[:3]])
        explanation = f"Regression detected in {request.comparison_result.endpoint}. Key differences: {differences_summary}."
        return AIExplanation(explanation=explanation, suggested_fix="Review differences and update v2 to match v1.", confidence_score=0.7, impact_assessment="Unknown")

    # Limit number of diffs to keep prompts small and latency low
    differences_text = "\n".join([
        f"- {d.get('path', 'unknown')}: {d.get('type', 'unknown')} (v1: {d.get('v1_value', 'N/A')}, v2: {d.get('v2_value', 'N/A')})"
        for d in request.comparison_result.differences[:5]
    ])

    # Instruct Gemini to return VERY CONDENSED bullet points only (each starting with '-').
    # Keep bullets short (<=12 words) to maximize speed. Include explicit bullet keys.
    prompt = (
        "You are an API regression analysis expert. Respond ONLY with VERY CONDENSED bullet points (each line starting with '-'). "
        "Each bullet should be at most 12 words. Do NOT write paragraphs or numbered lists. Use bullets for: 'What changed', 'Why it matters', 'Suggested fix', 'Impact assessment', and 'Confidence' (0-1).\n\n"
        f"Endpoint: {request.comparison_result.endpoint} ({request.comparison_result.method})\n"
        f"Severity: {request.comparison_result.regression_severity}\n\n"
        f"Differences found:\n{differences_text}\n\n"
        f"{('User question: ' + request.user_question) if request.user_question else ''}"
    )

    try:
        def call_genie():
            return _gemini_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)

        # enforce a shorter timeout since we request very condensed output
        with anyio.fail_after(6):
            resp = await run_blocking(call_genie)
        text = getattr(resp, 'text', str(resp))

        cleaned = text.strip()
        if "```json" in cleaned:
            s = cleaned.find("```json") + 7
            e = cleaned.find("```", s)
            cleaned = cleaned[s:e].strip()

        # Try JSON parse first
        try:
            parsed = json.loads(cleaned)
            return AIExplanation(
                explanation=parsed.get('explanation', cleaned),
                suggested_fix=parsed.get('suggested_fix', ''),
                confidence_score=float(parsed.get('confidence_score', 0.8)),
                impact_assessment=parsed.get('impact_assessment', '')
            )
        except Exception:
            # Parse bullet points into fields. Expect lines like:
            # - What changed: ...
            # - Why it matters: ...
            # - Suggested fix: ...
            # - Impact assessment: ...
            # - Confidence: 0.8
            lines = [ln.strip() for ln in cleaned.splitlines() if ln.strip().startswith('-')]
            def extract(prefix):
                for ln in lines:
                    low = ln.lower()
                    if low.startswith(f"- {prefix.lower()}") or low.startswith(f"-{prefix.lower()}"):
                        parts = ln.split(':', 1)
                        if len(parts) > 1:
                            return parts[1].strip()
                return None

            what_changed = extract('what changed')
            why = extract('why it matters') or extract('why')
            suggested = extract('suggested fix') or extract('suggestion')
            impact = extract('impact assessment') or extract('impact')
            conf = extract('confidence')

            try:
                confidence_score = float(conf) if conf is not None else 0.75
            except Exception:
                confidence_score = 0.75

            explanation_text = what_changed or ('\n'.join([ln.lstrip('- ').strip() for ln in lines]) if lines else cleaned)
            return AIExplanation(
                explanation=explanation_text,
                suggested_fix=suggested or "See explanation above.",
                confidence_score=confidence_score,
                impact_assessment=impact or "See explanation above."
            )
    except Exception as e:
        logger.error("Gemini explain error: %s", e)
        differences_summary = ", ".join([d.get("path", "unknown") for d in request.comparison_result.differences[:3]])
        explanation = f"Regression detected in {request.comparison_result.endpoint}. Key differences: {differences_summary}."
        return AIExplanation(explanation=explanation, suggested_fix="Review differences and update v2 to match v1.", confidence_score=0.7, impact_assessment="Unknown")


@router.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    """Chat-style query to Gemini about a comparison result."""
    if not request.context:
        raise HTTPException(status_code=400, detail="Missing context")

    if not _gemini_client:
        explanation = await explain_regression(AIExplanationRequest(comparison_result=request.context, user_question=request.question))
        return {"response": explanation.explanation}

    differences_text = "\n".join([
        f"- {d.get('path', 'unknown')}: {d.get('type', 'unknown')} (v1: {str(d.get('v1_value', 'N/A'))[:50]}, v2: {str(d.get('v2_value', 'N/A'))[:50]})"
        for d in request.context.differences[:10]
    ])

    prompt = (
        "API Response Analysis Context:\n\n"
        f"API Response Differences:\n{differences_text}\n\n"
        f"Question: {request.question}\n\n"
        "Please answer ONLY with VERY CONDENSED bullet points (each starting with '-'; <=12 words). No paragraphs."
    )

    try:
        def call_genie():
            return _gemini_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)

        # very short timeout for condensed chat responses
        with anyio.fail_after(4):
            resp = await run_blocking(call_genie)
        text = getattr(resp, 'text', str(resp))
        return {"response": text.strip()}
    except Exception as e:
        logger.error("Gemini chat error: %s", e)
        explanation = await explain_regression(AIExplanationRequest(comparison_result=request.context, user_question=request.question))
        return {"response": explanation.explanation}


@router.post("/analyze-report", response_model=ReportAnalysis)
async def analyze_report(request: ReportAnalysisRequest):
    """Comprehensive analysis of a saved test report from multiple perspectives"""
    if not _gemini_client:
        return ReportAnalysis(
            developer_perspective="Gemini not configured. Developer perspective: Review code changes and API contracts.",
            user_perspective="Gemini not configured. User perspective: Check if API changes affect user experience.",
            business_perspective="Gemini not configured. Business perspective: Assess impact on business metrics.",
            regression_analysis="Gemini not configured. Analyze differences between v1 and v2.",
            predicted_failures="Gemini not configured. Review similar endpoints for potential issues.",
            ethical_concerns="Gemini not configured. Review ethical implications of API changes."
        )
    
    report = request.report
    logger.info(f"📊 Analyzing report. Report ID: {report.get('id')}, Report keys: {list(report.keys())}")
    test_data = report.get("test_data", {})

    # Some saved reports store `test_data` as a stringified JSON blob.
    # Normalize here so downstream code can safely treat it as a dict.
    if isinstance(test_data, str):
        try:
            test_data = json.loads(test_data)
            report["test_data"] = test_data
        except Exception:
            # Attempt a tolerant double-unquote/unescape parse as a fallback
            try:
                cleaned = test_data.strip().replace('\n', '')
                if cleaned.startswith('"') and cleaned.endswith('"'):
                    cleaned = cleaned[1:-1]
                cleaned = cleaned.replace('\\"', '"')
                test_data = json.loads(cleaned)
                report["test_data"] = test_data
            except Exception:
                # If parsing fails, fall back to an empty dict to avoid attribute errors
                test_data = {}
                report["test_data"] = test_data
    
    # Extract regression information
    regressions = []
    if report.get("test_type") == "all_tests":
        automated = test_data.get("automated_tests", [])
        manual = test_data.get("manual_tests", [])
        for test in automated + manual:
            if test.get("result", {}).get("result", {}).get("is_regression"):
                regressions.append(test.get("result", {}).get("result"))
    else:
        result = test_data.get("result", {}).get("result")
        if result and result.get("is_regression"):
            regressions.append(result)
    
    # Build comprehensive prompt
    regression_summary = ""
    if regressions:
        for reg in regressions[:3]:  # Limit to first 3 regressions
            diff_count = len(reg.get("differences", []))
            severity = reg.get("regression_severity", "unknown")
            endpoint = reg.get("endpoint", "unknown")
            regression_summary += f"\n- {endpoint}: {diff_count} difference(s), severity: {severity}"
    
    differences_text = ""
    if regressions and len(regressions) > 0:
        differences_text = "\n".join([
            f"- {d.get('path', 'unknown')}: {d.get('type', 'unknown')} (v1: {str(d.get('v1_value', 'N/A'))[:50]}, v2: {str(d.get('v2_value', 'N/A'))[:50]})"
            for d in regressions[0].get("differences", [])[:10]
        ])
    
    # Get user notes and AI notes for context
    user_notes = report.get("notes", "")
    ai_notes = report.get("ainotes", "")
    
    prompt = (
        "You are an expert API regression analyst. Provide a COMPREHENSIVE analysis of this test report. "
        "This is CRITICAL - analyze thoroughly from multiple perspectives.\n\n"
        "IMPORTANT: USER PERSPECTIVE is the MOST IMPORTANT section. Focus heavily on how regressions impact end users.\n\n"
        "Provide detailed analysis in JSON format with these exact keys (all 6 fields are required):\n\n"
        "1. developer_perspective: Technical deep-dive into the regression. What code changes likely caused this? "
        "What debugging steps should developers take? What are the technical implications? "
        "Include specific code patterns, API contract violations, and technical fixes needed. (4-6 sentences)\n\n"
        "2. user_perspective: THIS IS MOST IMPORTANT - Detailed analysis of user impact. How do these regressions "
        "affect end users? What user-facing errors or broken features will users experience? "
        "What workflows will break? What data might users lose? How will this impact user trust and satisfaction? "
        "Be specific about user pain points and real-world scenarios. (5-7 sentences)\n\n"
        "3. business_perspective: Business and strategic impact. Revenue implications, customer churn risk, "
        "operational costs, compliance issues, competitive disadvantages, and strategic risks. "
        "Quantify potential business impact where possible. (4-6 sentences)\n\n"
        "4. regression_analysis: What changes need to be made before using v2? What fixes are required "
        "in either v1 or v2? What code changes, API contract updates, or configuration changes are needed? "
        "Be specific about what must be changed, why, and in which version. This is about actionable changes "
        "that need to be implemented. (5-7 sentences)\n\n"
        "5. predicted_failures: Based on the regression patterns observed, predict which OTHER endpoints, "
        "features, or scenarios might fail in similar ways when switching to v2. What's wrong with each prediction? "
        "What issues will occur? Think about: related CRUD operations, similar data structures, dependent features, "
        "edge cases, and cascading failures. Be specific about which endpoints or features are at risk, why they'll fail, "
        "and what problems will occur. (5-7 sentences)\n\n"
        "6. ethical_concerns: Analyze ethical implications of these regressions. Consider: data privacy violations, "
        "discrimination or bias in API responses, accessibility issues, user consent and transparency, fairness in "
        "treatment of different user groups, potential for harm to vulnerable populations, and compliance with ethical "
        "guidelines. What ethical risks do these regressions pose? How might they impact trust, equity, or user rights? "
        "(4-6 sentences)\n\n"
        f"Report Context:\n"
        f"- Title: {report.get('title', 'Unknown')}\n"
        f"- Test Type: {report.get('test_type', 'unknown')}\n"
        f"- Regressions Found: {len(regressions)}\n"
        f"- Regression Summary: {regression_summary}\n"
        f"- User Notes: {user_notes[:200] if user_notes else 'None'}\n"
        f"- Previous AI Analysis: {ai_notes[:300] if ai_notes else 'None'}\n\n"
        f"Key Differences:\n{differences_text}\n\n"
        "Respond ONLY with valid JSON. No markdown, no explanations outside JSON. "
        "Each field should be a detailed paragraph with specific, actionable insights.\n\n"
        "CRITICAL: You MUST include all 6 fields: developer_perspective, user_perspective, business_perspective, "
        "regression_analysis, predicted_failures, and ethical_concerns. Do not omit any field. "
        "If a field seems unclear, provide your best analysis based on the available information."
    )
    
    try:
        def call_genie():
            return _gemini_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        
        with anyio.fail_after(30):  # Increased timeout for comprehensive analysis
            resp = await run_blocking(call_genie)
        text = getattr(resp, 'text', str(resp)).strip()
        
        logger.info(f"Gemini analysis response length: {len(text)}")
        
        # Try to parse JSON response
        cleaned = text.strip()
        if "```json" in cleaned:
            s = cleaned.find("```json") + 7
            e = cleaned.find("```", s)
            cleaned = cleaned[s:e].strip()
        elif "```" in cleaned:
            s = cleaned.find("```") + 3
            e = cleaned.find("```", s)
            if e > s:
                cleaned = cleaned[s:e].strip()
        
        try:
            parsed = json.loads(cleaned)
            logger.info("Successfully parsed JSON response from Gemini")
            # Try multiple key variations for robustness
            return ReportAnalysis(
                developer_perspective=parsed.get("developer_perspective") or parsed.get("developer") or "Analysis unavailable",
                user_perspective=parsed.get("user_perspective") or parsed.get("user") or "Analysis unavailable",
                business_perspective=parsed.get("business_perspective") or parsed.get("business") or "Analysis unavailable",
                regression_analysis=parsed.get("regression_analysis") or parsed.get("changes") or parsed.get("regression") or "Analysis unavailable",
                predicted_failures=parsed.get("predicted_failures") or parsed.get("predictions") or parsed.get("prediction") or "Analysis unavailable",
                ethical_concerns=parsed.get("ethical_concerns") or parsed.get("ethical") or "Ethical analysis unavailable"
            )
        except json.JSONDecodeError as je:
            logger.warning(f"JSON parse error: {je}, trying fallback parsing")
            # Fallback: try to extract sections from text
            sections = {
                "developer_perspective": "",
                "user_perspective": "",
                "business_perspective": "",
                "regression_analysis": "",
                "predicted_failures": "",
                "ethical_concerns": ""
            }
            
            # Try to parse structured text - look for JSON-like patterns
            # First try to find JSON object boundaries
            if "{" in cleaned and "}" in cleaned:
                start = cleaned.find("{")
                end = cleaned.rfind("}") + 1
                try:
                    parsed = json.loads(cleaned[start:end])
                    return ReportAnalysis(
                        developer_perspective=parsed.get("developer_perspective") or parsed.get("developer") or "Analysis unavailable",
                        user_perspective=parsed.get("user_perspective") or parsed.get("user") or "Analysis unavailable",
                        business_perspective=parsed.get("business_perspective") or parsed.get("business") or "Analysis unavailable",
                        regression_analysis=parsed.get("regression_analysis") or parsed.get("changes") or parsed.get("regression") or "Analysis unavailable",
                        predicted_failures=parsed.get("predicted_failures") or parsed.get("predictions") or parsed.get("prediction") or "Analysis unavailable",
                        ethical_concerns=parsed.get("ethical_concerns") or parsed.get("ethical") or "Ethical analysis unavailable"
                    )
                except:
                    pass
            
            # Try to parse structured text by section headers
            lines = cleaned.split('\n')
            current_section = None
            for line in lines:
                line_lower = line.lower().strip()
                if '"developer_perspective"' in line_lower or 'developer_perspective' in line_lower:
                    current_section = "developer_perspective"
                    # Extract value if it's a JSON line
                    if ":" in line:
                        value = line.split(":", 1)[1].strip().strip('"').strip(',')
                        if value:
                            sections["developer_perspective"] = value
                    continue
                elif '"user_perspective"' in line_lower or 'user_perspective' in line_lower:
                    current_section = "user_perspective"
                    if ":" in line:
                        value = line.split(":", 1)[1].strip().strip('"').strip(',')
                        if value:
                            sections["user_perspective"] = value
                    continue
                elif '"business_perspective"' in line_lower or 'business_perspective' in line_lower:
                    current_section = "business_perspective"
                    if ":" in line:
                        value = line.split(":", 1)[1].strip().strip('"').strip(',')
                        if value:
                            sections["business_perspective"] = value
                    continue
                elif '"regression_analysis"' in line_lower or 'regression_analysis' in line_lower or '"changes"' in line_lower or 'changes' in line_lower:
                    current_section = "regression_analysis"
                    if ":" in line:
                        value = line.split(":", 1)[1].strip().strip('"').strip(',')
                        if value:
                            sections["regression_analysis"] = value
                    continue
                elif '"predicted_failures"' in line_lower or 'predicted_failures' in line_lower or '"predictions"' in line_lower or 'predictions' in line_lower or '"prediction"' in line_lower:
                    current_section = "predicted_failures"
                    if ":" in line:
                        value = line.split(":", 1)[1].strip().strip('"').strip(',')
                        if value:
                            sections["predicted_failures"] = value
                    continue
                elif '"ethical_concerns"' in line_lower or 'ethical_concerns' in line_lower:
                    current_section = "ethical_concerns"
                    if ":" in line:
                        value = line.split(":", 1)[1].strip().strip('"').strip(',')
                        if value:
                            sections["ethical_concerns"] = value
                    continue
                elif current_section and line.strip() and not line.strip().startswith('{') and not line.strip().startswith('}'):
                    # Append to current section, removing quotes and commas
                    clean_line = line.strip().strip('"').strip(',').strip()
                    if clean_line:
                        sections[current_section] += clean_line + " "
            
            # If we got any sections, use them; otherwise use the raw text
            if any(sections.values()):
                analysis_result = ReportAnalysis(
                    developer_perspective=sections["developer_perspective"] or "Technical analysis unavailable. Review code changes and API contracts.",
                    user_perspective=sections["user_perspective"] or "User impact analysis unavailable. Assess how regressions affect end users.",
                    business_perspective=sections["business_perspective"] or "Business impact analysis unavailable. Evaluate revenue and operational risks.",
                    regression_analysis=sections["regression_analysis"] or "Regression analysis unavailable. Review differences between v1 and v2.",
                    predicted_failures=sections["predicted_failures"] or "Failure prediction unavailable. Review similar endpoints for potential issues.",
                    ethical_concerns=sections["ethical_concerns"] or "Ethical analysis unavailable. Review ethical implications of API changes."
                )
            else:
                # Last resort: return the raw text split across sections
                text_len = len(cleaned)
                chunk_size = text_len // 6
                analysis_result = ReportAnalysis(
                    developer_perspective=cleaned[:chunk_size] if text_len > 0 else "Analysis unavailable",
                    user_perspective=cleaned[chunk_size:chunk_size*2] if text_len > chunk_size else "Analysis unavailable",
                    business_perspective=cleaned[chunk_size*2:chunk_size*3] if text_len > chunk_size*2 else "Analysis unavailable",
                    regression_analysis=cleaned[chunk_size*3:chunk_size*4] if text_len > chunk_size*3 else "Analysis unavailable",
                    predicted_failures=cleaned[chunk_size*4:chunk_size*5] if text_len > chunk_size*4 else "Analysis unavailable",
                    ethical_concerns=cleaned[chunk_size*5:] if text_len > chunk_size*5 else "Ethical analysis unavailable"
                )
    except Exception as e:
        logger.error("Gemini analysis error: %s", e)
        import traceback
        logger.error(traceback.format_exc())
        analysis_result = ReportAnalysis(
            developer_perspective=f"Analysis error: {str(e)}. Please check Gemini configuration.",
            user_perspective=f"Analysis error: {str(e)}. Please check Gemini configuration.",
            business_perspective=f"Analysis error: {str(e)}. Please check Gemini configuration.",
            regression_analysis=f"Analysis error: {str(e)}. Please check Gemini configuration.",
            predicted_failures=f"Analysis error: {str(e)}. Please check Gemini configuration.",
            ethical_concerns=f"Analysis error: {str(e)}. Please check Gemini configuration."
        )
    
    # Save analysis to database
    report_id = report.get("id")
    if report_id:
        try:
            from app.database import get_db
            db = get_db()
            if db:
                analysis_data = {
                    "report_id": report_id,
                    "developer": analysis_result.developer_perspective,
                    "user": analysis_result.user_perspective,
                    "business": analysis_result.business_perspective,
                    "prediction": analysis_result.predicted_failures,
                    "changes": analysis_result.regression_analysis,  # Using regression_analysis as "changes"
                    "ethical": analysis_result.ethical_concerns
                }
                
                # Check if analysis already exists for this report_id
                existing = db.table("analysis").select("*").eq("report_id", report_id).order("created_at", desc=True).limit(1).execute()
                
                if existing.data and len(existing.data) > 0:
                    # Update existing analysis
                    response = db.table("analysis").update(analysis_data).eq("id", existing.data[0]["id"]).execute()
                    logger.info(f"✅ Updated existing analysis in database with ID: {existing.data[0]['id']}")
                else:
                    # Insert new analysis
                    response = db.table("analysis").insert(analysis_data).execute()
                    logger.info(f"✅ Saved new analysis to database with ID: {response.data[0]['id'] if response.data else 'unknown'}")
                    
        except Exception as e:
            logger.error(f"⚠️  Error saving analysis to database: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Continue even if save fails
    else:
        logger.warning(f"⚠️  Cannot save analysis: report has no ID. Report keys: {list(report.keys())}")
    
    return analysis_result

@router.post("/generate-test-cases", response_model=TestCaseGenerationResponse)
async def generate_test_cases(request: TestCaseGenerationRequest):
    """Generate test cases using Gemini; fallback to defaults if unavailable."""
    if not _gemini_client:
        return TestCaseGenerationResponse(test_cases=get_default_test_cases(request.service_description))


    num = getattr(request, 'num_test_cases', 5) or 5
    case_filter = getattr(request, 'case_filter', None)
    prompt_parts = [
        "You are a test case generation expert. Generate the requested number of test cases in JSON array format. ",
        "Return ONLY valid JSON array, no markdown, no explanations.",
        f"\n\nService Description: {request.service_description or 'CRUD API service'}\n\n",
        "Each test case should have: name (string), method (string), endpoint (string), payload (string|null), expected_fields (array of strings), description (string).",
    ]
    if case_filter:
        prompt_parts.append(f"\n\nFocus on these specific test-area keywords: {case_filter}.")
    prompt_parts.append(f"\n\nPlease generate exactly {num} test cases if possible.")
    prompt = "".join(prompt_parts)

    try:
        # If a NeMo (Nemotron) client is available prefer it and force a strict JSON array
        # where each test case's payload follows the project schema described by the user.
        if _nemo_client:
            def call_nemo_for_tests():
                # Build a prompt that requires only valid JSON array output.
                nemo_prompt = (
                    "Return ONLY a valid JSON array of test-case objects. No markdown, no text.\n"
                    "Each test-case object must contain: name, method, endpoint, payload, expected_fields, description.\n"
                    "The payload must be an object with the following possible keys (only `id` is required):\n"
                    "  - id (PK, string), name (string), value (number), created_at (timestampz), updated_at (timestampz),\n"
                    "  status (string), due_date (date or timestamp), discount_rate (number),\n"
                    "  - loyalty_discount (number), extra_data (object|null)\n"
                    "Make entries varied and random across test-cases (different names, values, dates, statuses),\n"
                    "but ensure id is present for each payload. Use ISO-8601 timestamps for created_at/updated_at.\n"
                    f"Service Description: {request.service_description or 'CRUD API service'}\n"
                    f"Generate exactly {num} test cases when possible.\n"
                )

                # Use a conservative, faster config to keep latency down
                return _nemo_client.chat.completions.create(
                    model="nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
                    messages=[{"role": "user", "content": nemo_prompt}],
                    temperature=0.3,
                    top_p=0.3,
                    max_tokens=512,
                    stream=False,
                )

            with anyio.fail_after(10):
                resp = await run_blocking(call_nemo_for_tests)

            text = ""
            try:
                # resp may have different shapes depending on SDK; attempt to extract message content
                if hasattr(resp, 'choices') and len(resp.choices) > 0:
                    text = getattr(resp.choices[0].message, 'content', None) or getattr(resp.choices[0], 'message', '') or str(resp)
                else:
                    text = str(resp)
            except Exception:
                text = str(resp)

            text = text.strip()
            # strip any code fences
            if "```json" in text:
                s = text.find("```json") + 7
                e = text.find("```", s)
                text = text[s:e].strip()
            elif "```" in text:
                s = text.find("```") + 3
                e = text.find("```", s)
                text = text[s:e].strip()

            data = json.loads(text)
            test_cases = []
            for tc in data:
                if not isinstance(tc, dict):
                    continue
                # Normalize payload: if dict -> dump to string, if already string keep it
                payload = tc.get('payload')
                if isinstance(payload, dict):
                    # ensure id exists; if not, generate a placeholder (shouldn't happen if prompt followed)
                    if 'id' not in payload:
                        payload['id'] = f"auto-{int(time.time()*1000)}"
                    payload_str = json.dumps(payload)
                elif payload is None:
                    payload_str = None
                else:
                    payload_str = str(payload)

                # Build TestCase-compatible dict, prefer existing fields
                tc_dict = {
                    'name': tc.get('name', 'unnamed'),
                    'method': tc.get('method', 'POST'),
                    'endpoint': tc.get('endpoint', '/api/v1/create'),
                    'payload': payload_str,
                    'expected_fields': tc.get('expected_fields', []),
                    'description': tc.get('description', ''),
                }
                try:
                    test_cases.append(TestCase(**tc_dict))
                except Exception:
                    # as a fallback, ensure required shape minimally
                    test_cases.append(TestCase(name=tc_dict['name'], method=tc_dict['method'], endpoint=tc_dict['endpoint'], payload=tc_dict['payload'], expected_fields=tc_dict['expected_fields'], description=tc_dict['description']))

            return TestCaseGenerationResponse(test_cases=test_cases)

        # Fallback to Gemini when NeMo not available
        def call_genie():
            return _gemini_client.models.generate_content(model="gemini-2.5-flash", contents=prompt)

        # use a slightly shorter timeout to keep generation snappy
        with anyio.fail_after(10):
            resp = await run_blocking(call_genie)
        text = getattr(resp, 'text', str(resp)).strip()

        if "```json" in text:
            s = text.find("```json") + 7
            e = text.find("```", s)
            text = text[s:e].strip()
        elif "```" in text:
            s = text.find("```") + 3
            e = text.find("```", s)
            text = text[s:e].strip()

        data = json.loads(text)
        test_cases = []
        for tc in data:
            if not isinstance(tc, dict):
                continue
            payload = tc.get('payload')
            if isinstance(payload, dict):
                payload = json.dumps(payload)
            test_cases.append(TestCase(**{**tc, 'payload': payload}))
        return TestCaseGenerationResponse(test_cases=test_cases)
    except Exception as e:
        logger.error("Test case generation error: %s", e)
        return TestCaseGenerationResponse(test_cases=get_default_test_cases(request.service_description))


def get_default_test_cases(service_description: Optional[str] = None) -> List[TestCase]:
    default_cases: List[TestCase] = [
        TestCase(name="Create Item", method="POST", endpoint="/api/v1/create", payload='{"name": "Test Item", "value": 100}', expected_fields=["id", "name", "value", "createdAt"], description="Test creating a new item"),
        TestCase(name="Get All Items", method="GET", endpoint="/api/v1/get", payload=None, expected_fields=["items", "count"], description="Test retrieving all items"),
        TestCase(name="Get Single Item", method="GET", endpoint="/api/v1/get/{id}", payload=None, expected_fields=["id", "name", "value"], description="Test retrieving a single item by ID"),
        TestCase(name="Update Item", method="PUT", endpoint="/api/v1/update/{id}", payload='{"name": "Updated Item", "value": 200}', expected_fields=["id", "name", "value", "updatedAt"], description="Test updating an existing item"),
        TestCase(name="Delete Item", method="DELETE", endpoint="/api/v1/delete/{id}", payload=None, expected_fields=["message"], description="Test deleting an item"),
    ]

    if service_description:
        desc_lower = service_description.lower()
        if "user" in desc_lower:
            default_cases = [
                TestCase(name="Create User", method="POST", endpoint="/api/v1/users", payload='{"email": "test@example.com", "name": "Test User"}', expected_fields=["id", "email", "name", "createdAt"], description="Test creating a new user"),
                TestCase(name="Get Users", method="GET", endpoint="/api/v1/users", payload=None, expected_fields=["users", "count"], description="Test retrieving all users"),
                TestCase(name="Update User", method="PUT", endpoint="/api/v1/users/{id}", payload='{"name": "Updated User"}', expected_fields=["id", "email", "name", "updatedAt"], description="Test updating a user"),
                TestCase(name="Delete User", method="DELETE", endpoint="/api/v1/users/{id}", payload=None, expected_fields=["message"], description="Test deleting a user"),
            ]

    return default_cases
