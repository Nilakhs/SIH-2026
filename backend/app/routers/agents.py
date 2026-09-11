from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import AsyncGenerator
import json
import sys

sys.path.append(r"c:\SIH")
from agent.graph import create_graph

router = APIRouter(prefix="/api/agents", tags=["agents"])

class AgentRunRequest(BaseModel):
    message: str
    document_ids: list[str] = []

async def sse_event(type: str, data: dict) -> str:
    payload = {"type": type, **data}
    return f"data: {json.dumps(payload)}\n\n"

@router.post("/run")
async def run_agent(request: AgentRunRequest):
    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            graph = create_graph()
            initial_state = {
                "request": request.message,
                "step_count": 0,
                "messages": [],
                "plan": [],
                "retrieved_documents": [],
                "tool_results": [],
                "execution_events": [],
                "errors": []
            }
            
            # Since create_graph returns a compiled StateGraph
            async for event in graph.astream(initial_state):
                for node_name, state_update in event.items():
                    if node_name == "analyze_request":
                        yield await sse_event("agent_step", {"step": "Classifying request", "status": "completed"})
                    elif node_name == "planner":
                        yield await sse_event("agent_step", {"step": "Planning complete", "status": "completed"})
                    elif node_name == "tool_executor":
                        if state_update.get("tool_results"):
                            last_tool = state_update["tool_results"][-1]["tool"]
                            yield await sse_event("tool_call", {"tool": last_tool, "status": "running"})
                            yield await sse_event("tool_result", {"status": "completed"})
                    elif node_name == "finalizer":
                        final_res = state_update.get("final_response", "")
                        sources = state_update.get("sources", [])
                        yield await sse_event("final", {"answer": final_res, "sources": sources})
                    
                    if state_update.get("errors"):
                        for err in state_update["errors"]:
                            yield await sse_event("error", {"error": err})
                            
        except Exception as e:
            yield await sse_event("error", {"error": str(e)})

    return StreamingResponse(event_generator(), media_type="text/event-stream")
