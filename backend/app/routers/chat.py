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

    # Multimodal image detection
    has_image = any(getattr(m, 'images', None) for m in request.messages) or bool(getattr(request, 'images', None))
    if getattr(request, 'images', None) and request.messages:
        for m in reversed(request.messages):
            if m.role == 'user':
                if not m.images:
                    m.images = request.images
                break

    # Classification and model routing
    last_user_msg = next((m.content for m in reversed(request.messages) if m.role == 'user'), "")
    if (not request.task_type or has_image) and request.messages:
        request.task_type, _ = router.classify(last_user_msg, has_image=has_image)
            
    if has_image:
        available_models = await provider.list_models()
        model_names = [m.name for m in available_models]
        vision_model = router.get_model_for_task(request.task_type, model_names)
        if vision_model:
            request.model = vision_model
        else:
            raise HTTPException(
                status_code=400,
                detail="No local vision model found in Ollama. Please run 'ollama pull moondream' in your terminal to enable local image analysis."
            )
        try:
            from audit import log_audit_event
            log_audit_event(
                event_type="IMAGE_VISION",
                task_type="image_vision",
                model=request.model,
                image_filename="attached_image",
                status="COMPLETED",
                summary=f"Analyzed local image with prompt: {last_user_msg[:100]}"
            )
        except Exception as e:
            print(f"[Audit Log Warning] {e}")
    elif not request.model and request.task_type:
        available_models = await provider.list_models()
        model_names = [m.name for m in available_models]
        recommended = router.get_model_for_task(request.task_type, model_names)
        if recommended:
            request.model = recommended

    # Local RAG — activate for document and data analysis tasks (when not vision)
    sources = []
    if not has_image and request.task_type in ("document_analysis", "coding_data_analysis"):
        from app.dependencies import get_rag_service
        rag_service = get_rag_service()
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
                        print(f"[RAG] Successfully retrieved {len(context_parts)} context chunks from Qdrant.")
                        system_prompt = (
                            f"You are a helpful assistant for the Sovereign AI Workbench. "
                            f"Answer the user's question directly using the provided retrieved context from their uploaded documents.\n\n"
                            f"Retrieved Document Data:\n{context_str}\n\n"
                            f"Instructions: Use the specific numbers, names, and facts from the data above to answer."
                        )
                        from models.provider import ChatMessage
                        request.messages.insert(0, ChatMessage(role="system", content=system_prompt))
            except Exception as e:
                print(f"[RAG Error] Failed to retrieve context: {e}")

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
