import json
from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import StreamingResponse
from models.provider import ChatRequest, ChatResponse, ModelProvider
from app.dependencies import get_model_provider, get_task_router
from models.router import TaskRouter

router = APIRouter(tags=["chat"])

@router.post("/")
async def chat(
    request: ChatRequest,
    provider: ModelProvider = Depends(get_model_provider),
    router: TaskRouter = Depends(get_task_router)
):
    if not await provider.is_available():
        raise HTTPException(
            status_code=503, 
            detail={
                "error": "Ollama is not running or unreachable.", 
                "suggestion": "Install Ollama from ollama.com or start the service."
            }
        )

    # Classification and model routing
    if not request.task_type and request.messages:
        # Use last user message to classify
        last_user_msg = next((m.content for m in reversed(request.messages) if m.role == 'user'), "")
        if last_user_msg:
            request.task_type, _ = router.classify(last_user_msg)
            
    if not request.model and request.task_type:
        available_models = await provider.list_models()
        model_names = [m.name for m in available_models]
        recommended = router.get_model_for_task(request.task_type, model_names)
        if recommended:
            request.model = recommended

    # Local RAG
    sources = []
    if request.task_type == "document_analysis":
        from app.dependencies import get_rag_service
        rag_service = get_rag_service()
        last_user_msg = next((m.content for m in reversed(request.messages) if m.role == 'user'), "")
        if last_user_msg:
            try:
                results = rag_service.search(last_user_msg)
                if results:
                    context_parts = []
                    for res in results:
                        payload = res.get("payload", {})
                        content = payload.get("content", "")
                        sources.append(payload)
                        if content:
                            context_parts.append(content)
                    
                    if context_parts:
                        context_str = "\n\n---\n\n".join(context_parts)
                        system_prompt = f"Answer using the provided retrieved context. If the context does not contain enough information, say that the available documents do not provide enough information.\n\nContext:\n{context_str}"
                        # Prepend fake first message or system message
                        from models.provider import ChatMessage
                        request.messages.insert(0, ChatMessage(role="system", content=system_prompt))
            except Exception as e:
                print(f"RAG search error: {e}")

    if request.stream:
        async def stream_generator():
            try:
                async for chunk in provider.chat_stream(request):
                    if chunk.done and sources:
                        chunk.sources = sources
                    data = chunk.model_dump_json()
                    yield f"data: {data}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                # Handle mid-stream error gracefully if possible
                error_msg = json.dumps({"error": str(e)})
                yield f"data: {error_msg}\n\n"

        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        try:
            resp = await provider.chat(request)
            if sources:
                resp.sources = sources
            return resp
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
