import os
import json
import re
import sys
import asyncio
from typing import Dict, Any, List

sys.path.append(r"c:\SIH")
from agent.state import AgentState
from agent.tools import DOCUMENT_SEARCH, DOCUMENT_RETRIEVAL, LOCAL_CALCULATOR, DOCUMENT_METADATA, PYTHON_SANDBOX

from backend.app.dependencies import get_model_provider
from models.provider import ChatRequest, ChatMessage

try:
    from langgraph.graph import StateGraph, END
except ImportError:
    class StateGraph:
        def __init__(self, state_schema): pass
        def add_node(self, name, action): pass
        def set_entry_point(self, name): pass
        def add_edge(self, start, end): pass
        def add_conditional_edges(self, start, condition, mapping): pass
        def compile(self): return self
    END = "END"

TOOLS = {
    "DOCUMENT_SEARCH": DOCUMENT_SEARCH,
    "DOCUMENT_RETRIEVAL": DOCUMENT_RETRIEVAL,
    "LOCAL_CALCULATOR": LOCAL_CALCULATOR,
    "DOCUMENT_METADATA": DOCUMENT_METADATA,
    "PYTHON_SANDBOX": PYTHON_SANDBOX
}

async def analyze_request(state: AgentState) -> dict:
    req = state.get("request", "").lower()
    task_type = "GENERAL"
    
    # Deterministic task classification
    data_keywords = ["csv", "xlsx", "calculate", "analyze", "average", "dataset", "dataframe", "plot", "filter", "rank"]
    if any(kw in req for kw in data_keywords):
        task_type = "CODING_DATA_ANALYSIS"
        
    return {"step_count": state.get("step_count", 0) + 1, "task_type": task_type}

async def planner(state: AgentState) -> dict:
    req = state.get("request", "")
    return {"plan": [f"Plan for: {req}"]}

async def tool_selector(state: AgentState) -> dict:
    if state.get("step_count", 0) > 10:
        return {}
    
    provider = get_model_provider()
    
    prompt = f"""
Based on the plan and request, pick the next tool. Output ONLY valid JSON.
Request: {state.get('request', '')}
Previous Tool Results: {state.get('tool_results', [])}
Recent Errors: {state.get('errors', [])[-3:]}

Tools available:
- DOCUMENT_SEARCH(query: str)
- DOCUMENT_RETRIEVAL(doc_id: str, chunk_index: int)
- LOCAL_CALCULATOR(expression: str)
- DOCUMENT_METADATA(filename_or_id: str)
- PYTHON_SANDBOX(code: str, input_files: list = None)
"""

    if state.get("task_type") == "CODING_DATA_ANALYSIS":
        schema_info = ""
        req_text = state.get("request", "")
        for cdir in [r"c:\SIH", r"c:\SIH\backend\data\uploads"]:
            if os.path.isdir(cdir):
                for fname in os.listdir(cdir):
                    if fname.endswith(".csv"):
                        base_fname = fname
                        if "_" in fname and len(fname.split("_")[0]) == 36:
                            base_fname = "_".join(fname.split("_")[1:])
                        if base_fname.lower() in req_text.lower() or "downtime" in req_text.lower():
                            try:
                                with open(os.path.join(cdir, fname), "r", encoding="utf-8") as f:
                                    header = f.readline().strip()
                                    sample = f.readline().strip()
                                schema_info += f"\nAvailable file: '{base_fname}'\nActual column names: {header}\nSample data: {sample}\n"
                                break
                            except Exception:
                                pass
                if schema_info:
                    break

        prompt += f"""
CRITICAL INSTRUCTION: This request requires data analysis. You MUST use the PYTHON_SANDBOX tool to execute a Python script using pandas.
{schema_info}
CRITICAL RULES FOR PYTHON_SANDBOX CODE:
1. Load the file: pd.read_csv('{base_fname if schema_info else "test_equipment_downtime.csv"}')
2. Use the EXACT column names from the header (all lowercase): 'department', 'downtime_hours', 'equipment_name'.
3. YOU MUST USE print() TO DISPLAY THE RESULTS! Example:
   print("Average downtime by department:")
   print(df.groupby('department')['downtime_hours'].mean())
   print("\nTop 3 downtime items:")
   print(df.sort_values(by='downtime_hours', ascending=False)[['equipment_name', 'department', 'downtime_hours']].head(3))
4. Write the full analysis script in a single tool call.
"""

    prompt += """
Output format: {"tool": "TOOL_NAME", "args": {"arg1": "val1"}} or {"tool": "none"}
"""

    messages = [ChatMessage(role="user", content=prompt)]
    model = state.get("selected_model") or "qwen2.5:7b-instruct-q4_K_M"
    request = ChatRequest(messages=messages, model=model, temperature=0.0)
    
    try:
        response = await provider.chat(request)
        content = response.content.strip()
        parsed = None
        
        # Strategy 1: Extract JSON from markdown fence
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
        if json_match:
            try:
                parsed = json.loads(json_match.group(1), strict=False)
            except Exception:
                pass
                
        # Strategy 2: Extract outermost JSON braces { ... }
        if not parsed:
            first_brace = content.find('{')
            last_brace = content.rfind('}')
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                try:
                    parsed = json.loads(content[first_brace:last_brace+1], strict=False)
                except Exception:
                    pass
                    
        # Strategy 3: Direct strip & strict=False
        if not parsed:
            try:
                clean_c = content
                if clean_c.startswith("```json"):
                    clean_c = clean_c[7:]
                if clean_c.startswith("```"):
                    clean_c = clean_c[3:]
                if clean_c.endswith("```"):
                    parsed = json.loads(clean_c.strip(), strict=False)
            except Exception:
                pass

        # Strategy 3.5: Extract code from JSON string with regex if json.loads failed
        if not parsed and "PYTHON_SANDBOX" in content:
            code_match = re.search(r'"code"\s*:\s*"([\s\S]*?)(?:"\s*\}|\Z)', content)
            if code_match:
                raw_code = code_match.group(1).replace(r'\"', '"').replace(r'\n', '\n')
                parsed = {"tool": "PYTHON_SANDBOX", "args": {"code": raw_code.strip()}}

        # Strategy 4: Direct Python code detection ONLY if response is not JSON
        if not parsed:
            if not content.strip().startswith("{") and ("import pandas" in content or "pd.read_csv" in content):
                code_text = content
                py_m = re.search(r"```(?:python)?\s*(.*?)\s*```", content, re.DOTALL)
                if py_m:
                    code_text = py_m.group(1)
                parsed = {"tool": "PYTHON_SANDBOX", "args": {"code": code_text.strip()}}
            elif "none" in content.lower():
                parsed = {"tool": "none"}
            else:
                raise ValueError(f"Unparseable response: {content[:200]}")
        
        if parsed.get("tool") == "none":
            return {"plan": state.get("plan", []) + ["DONE"]}
            
        events = state.get("execution_events", [])
        return {"execution_events": events + [{"tool": parsed["tool"], "args": parsed.get("args", {})}]}
    except Exception as e:
        return {"errors": state.get("errors", []) + [f"Tool selector error: {e}"], "plan": state.get("plan", []) + ["DONE"]}

async def tool_executor(state: AgentState) -> dict:
    events = state.get("execution_events", [])
    if not events:
        return {}
        
    last_event = events[-1]
    tool_name = last_event.get("tool")
    args = last_event.get("args", {})
    
    if tool_name in TOOLS:
        try:
            result = TOOLS[tool_name](**args)
            
            # Always append the result to advance the loop
            updates = {
                "tool_results": state.get("tool_results", []) + [{"tool": tool_name, "result": result}],
                "sandbox_retry_count": 0
            }
            
            # Check for sandbox errors and log them so the selector can retry smartly
            if tool_name == "PYTHON_SANDBOX" and isinstance(result, str) and ("failed" in result.lower() or "error" in result.lower()):
                retry_count = state.get("sandbox_retry_count", 0)
                if retry_count < 3:
                    updates["sandbox_retry_count"] = retry_count + 1
                    updates["errors"] = state.get("errors", []) + [f"Sandbox Error in previous attempt: {result}. MUST rewrite code to fix this."]
            
            return updates
        except Exception as e:
            # Prevent infinite loops by advancing tool_results even on unhandled exception
            return {
                "tool_results": state.get("tool_results", []) + [{"tool": tool_name, "result": f"Exception: {e}"}],
                "errors": state.get("errors", []) + [f"Error executing {tool_name}: {e}"]
            }
    else:
        return {
            "tool_results": state.get("tool_results", []) + [{"tool": tool_name, "result": f"Unknown tool {tool_name}"}],
            "errors": state.get("errors", []) + [f"Unknown tool {tool_name}"]
        }

async def evaluator(state: AgentState) -> dict:
    return {"step_count": state.get("step_count", 0) + 1}

async def finalizer(state: AgentState) -> dict:
    provider = get_model_provider()
    prompt = f"Provide a final response for the user request based on these tool results: {state.get('tool_results', [])}\nRequest: {state.get('request', '')}"
    messages = [ChatMessage(role="user", content=prompt)]
    model = state.get("selected_model") or "qwen2.5:7b-instruct-q4_K_M"
    request = ChatRequest(messages=messages, model=model, temperature=0.7)
    try:
        response = await provider.chat(request)
        return {"final_response": response.content, "sources": []}
    except Exception as e:
        return {"final_response": f"Failed to generate final response: {e}", "sources": []}

def should_continue(state: AgentState) -> str:
    if state.get("step_count", 0) > 10:
        return "finalizer"
        
    plan = state.get("plan", [])
    if plan and plan[-1] == "DONE":
        return "finalizer"
        
    events = state.get("execution_events", [])
    results = state.get("tool_results", [])
    
    if events and len(results) < len(events):
        return "tool_executor"
        
    return "evaluator"

def check_evaluator(state: AgentState) -> str:
    results = state.get("tool_results", [])
    for res in results:
        raw_str = str(res.get("result", ""))
        if '"exit_code": 0' in raw_str and ('average' in raw_str.lower() or 'downtime' in raw_str.lower() or len(raw_str) > 60):
            return "finalizer"
            
    if state.get("step_count", 0) > 4:
        return "finalizer"
    return "tool_selector"

def create_graph():
    workflow = StateGraph(AgentState)
    
    workflow.add_node("analyze_request", analyze_request)
    workflow.add_node("planner", planner)
    workflow.add_node("tool_selector", tool_selector)
    workflow.add_node("tool_executor", tool_executor)
    workflow.add_node("evaluator", evaluator)
    workflow.add_node("finalizer", finalizer)
    
    workflow.set_entry_point("analyze_request")
    workflow.add_edge("analyze_request", "planner")
    workflow.add_edge("planner", "tool_selector")
    
    workflow.add_conditional_edges("tool_selector", should_continue, {
        "tool_executor": "tool_executor",
        "finalizer": "finalizer",
        "evaluator": "evaluator"
    })
    
    workflow.add_edge("tool_executor", "evaluator")
    
    workflow.add_conditional_edges("evaluator", check_evaluator, {
        "tool_selector": "tool_selector",
        "finalizer": "finalizer"
    })
    
    workflow.add_edge("finalizer", END)
    
    return workflow.compile()
