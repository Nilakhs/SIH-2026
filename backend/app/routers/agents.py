from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import AsyncGenerator, Optional
import json
import sys
import importlib

sys.path.append(r"c:\SIH")
import agent.graph
from agent.graph import create_graph

router = APIRouter(prefix="/api/agents", tags=["agents"])

class AgentRunRequest(BaseModel):
    message: Optional[str] = None
    prompt: Optional[str] = None
    document_ids: list[str] = []

async def sse_event(type: str, data: dict) -> str:
    payload = {"type": type, **data}
    return f"data: {json.dumps(payload)}\n\n"

@router.post("/run")
async def run_agent(request: AgentRunRequest):
    user_prompt = request.prompt or request.message or ""
    
    # Reload agent.graph module dynamically to pick up any updates immediately
    importlib.reload(agent.graph)
    from agent.graph import create_graph
    
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            graph = create_graph()
            initial_state = {
                "request": user_prompt,
                "selected_model": "qwen2.5:7b-instruct-q4_K_M",
                "step_count": 0,
                "messages": [],
                "plan": [],
                "retrieved_documents": [],
                "tool_results": [],
                "execution_events": [],
                "errors": []
            }
            
            async for event in graph.astream(initial_state):
                for node_name, state_update in event.items():
                    if node_name == "analyze_request":
                        yield await sse_event("agent_step", {"step": "Classifying request type and intent", "status": "completed"})
                    elif node_name == "planner":
                        yield await sse_event("agent_step", {"step": "Creating execution plan", "status": "completed"})
                    elif node_name == "tool_selector":
                        if state_update.get("execution_events"):
                            last_evt = state_update["execution_events"][-1]
                            tool_name = last_evt.get("tool")
                            tool_args = last_evt.get("args", {})
                            code_str = tool_args.get("code")
                            yield await sse_event("tool_call", {
                                "tool": tool_name,
                                "code": code_str,
                                "status": "running"
                            })
                        else:
                            yield await sse_event("agent_step", {"step": "Plan completed, proceeding to final answer", "status": "completed"})
                    elif node_name == "tool_executor":
                        if state_update.get("tool_results"):
                            last_res = state_update["tool_results"][-1]
                            last_tool = last_res.get("tool")
                            raw_res = last_res.get("result")
                            
                            stdout_text = ""
                            stderr_text = ""
                            exit_code = 0
                            if isinstance(raw_res, str):
                                try:
                                    parsed = json.loads(raw_res)
                                    if isinstance(parsed, dict):
                                        stdout_text = parsed.get("stdout", "")
                                        stderr_text = parsed.get("stderr", "")
                                        exit_code = parsed.get("exit_code", 0)
                                except Exception:
                                    stdout_text = raw_res
                            elif isinstance(raw_res, dict):
                                stdout_text = raw_res.get("stdout", "")
                                stderr_text = raw_res.get("stderr", "")
                                exit_code = raw_res.get("exit_code", 0)

                            yield await sse_event("tool_result", {
                                "tool": last_tool,
                                "status": "completed",
                                "stdout": stdout_text,
                                "stderr": stderr_text,
                                "exit_code": exit_code
                            })
                    elif node_name == "finalizer":
                        final_res = state_update.get("final_response", "")
                        sources = state_update.get("sources", [])
                        yield await sse_event("final", {"answer": final_res, "sources": sources})
                        
        except Exception as e:
            yield await sse_event("error", {"error": str(e)})

    return StreamingResponse(event_generator(), media_type="text/event-stream")
