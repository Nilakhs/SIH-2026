from typing import TypedDict, Any

class AgentState(TypedDict):
    request: str
    task_type: str | None
    selected_model: str | None
    messages: list[dict]
    plan: list[str]
    current_step: int
    retrieved_documents: list[dict]
    tool_results: list[dict]
    execution_events: list[dict]
    step_count: int
    final_response: str | None
    sources: list[dict]
    errors: list[str]
