import json
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
    # Dummy mock if not present
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
    return {"step_count": state.get("step_count", 0) + 1, "task_type": "analysis"}

async def planner(state: AgentState) -> dict:
    req = state.get("request", "")
    return {"plan": [f"Plan for: {req}"]}

async def tool_selector(state: AgentState) -> dict:
    if state.get("step_count", 0) > 10:
        return {}
    
    provider = get_model_provider()
    
    prompt = f"""
Based on the plan and request, pick the next tool. Output ONLY valid JSON.
Plan: {state.get('plan', [])}
Request: {state.get('request', '')}
Tools available:
- DOCUMENT_SEARCH(query: str)
- DOCUMENT_RETRIEVAL(doc_id: str, chunk_index: int)
- LOCAL_CALCULATOR(expression: str)
- DOCUMENT_METADATA(filename_or_id: str)
- PYTHON_SANDBOX(code: str, input_files: list = None)

Output format: {{"tool": "TOOL_NAME", "args": {{"arg1": "val1"}}}} or {{"tool": "none"}}
    """
    
    messages = [ChatMessage(role="user", content=prompt)]
    model = state.get("selected_model") or "llama3"
    request = ChatRequest(messages=messages, model=model, temperature=0.0)
    try:
        response = await provider.chat(request)
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()
        
        parsed = json.loads(content)
        
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
            if tool_name == "PYTHON_SANDBOX" and isinstance(result, str) and ("failed" in result.lower() or "error" in result.lower()):
                retry_count = state.get("sandbox_retry_count", 0)
                if retry_count < 2:
                    return {"sandbox_retry_count": retry_count + 1, "errors": state.get("errors", []) + [f"PYTHON_SANDBOX failed: {result}. Retrying..."]}
            return {"tool_results": state.get("tool_results", []) + [{"tool": tool_name, "result": result}], "sandbox_retry_count": 0}
        except Exception as e:
            return {"errors": state.get("errors", []) + [f"Error executing {tool_name}: {e}"]}
    else:
        return {"errors": state.get("errors", []) + [f"Unknown tool {tool_name}"]}

async def evaluator(state: AgentState) -> dict:
    return {"step_count": state.get("step_count", 0) + 1}

async def finalizer(state: AgentState) -> dict:
    provider = get_model_provider()
    prompt = f"Provide a final response for the user request based on these tool results: {state.get('tool_results', [])}\nRequest: {state.get('request', '')}"
    messages = [ChatMessage(role="user", content=prompt)]
    model = state.get("selected_model") or "llama3"
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
    if state.get("step_count", 0) > 10:
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
