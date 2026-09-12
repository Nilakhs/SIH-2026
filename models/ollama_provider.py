import json
import logging
from typing import AsyncGenerator
import httpx

from .provider import ModelProvider, ModelInfo, ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

class OllamaProvider(ModelProvider):
    def __init__(self, host: str = 'http://localhost:11434'):
        self.host = host.rstrip('/')
    
    async def list_models(self) -> list[ModelInfo]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.host}/api/tags", timeout=10.0)
                response.raise_for_status()
                data = response.json()
                models = []
                for model in data.get('models', []):
                    details = model.get('details', {})
                    models.append(ModelInfo(
                        name=model.get('name', 'unknown'),
                        size=str(model.get('size', '')),
                        quantization=details.get('quantization_level'),
                        family=details.get('family'),
                        parameter_size=details.get('parameter_size'),
                        modified_at=model.get('modified_at')
                    ))
                return models
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    async def chat(self, request: ChatRequest) -> ChatResponse:
        try:
            async with httpx.AsyncClient() as client:
                payload = {
                    "model": request.model or "unknown",
                    "messages": [msg.model_dump() for msg in request.messages],
                    "stream": False,
                    "options": {
                        "temperature": request.temperature,
                    }
                }
                if request.max_tokens:
                    payload["options"]["num_predict"] = request.max_tokens
                
                response = await client.post(f"{self.host}/api/chat", json=payload, timeout=300.0)
                response.raise_for_status()
                data = response.json()
                
                return ChatResponse(
                    content=data.get('message', {}).get('content', ''),
                    model=data.get('model', request.model),
                    done=data.get('done', True),
                    total_duration=data.get('total_duration'),
                    eval_count=data.get('eval_count')
                )
        except Exception as e:
            logger.error(f"Error in chat: {e}")
            raise Exception(f"Chat failed: {e}")
    
    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[ChatResponse, None]:
        payload = {
            "model": request.model or "unknown",
            "messages": [msg.model_dump() for msg in request.messages],
            "stream": True,
            "options": {
                "temperature": request.temperature,
            }
        }
        if request.max_tokens:
            payload["options"]["num_predict"] = request.max_tokens
            
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream("POST", f"{self.host}/api/chat", json=payload, timeout=300.0) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        try:
                            data = json.loads(line)
                            yield ChatResponse(
                                content=data.get('message', {}).get('content', ''),
                                model=data.get('model', request.model),
                                done=data.get('done', False),
                                total_duration=data.get('total_duration'),
                                eval_count=data.get('eval_count')
                            )
                        except json.JSONDecodeError:
                            logger.error(f"Failed to decode stream line: {line}")
                            continue
        except Exception as e:
            logger.error(f"Error in stream chat: {e}")
            raise Exception(f"Stream chat failed: {e}")
    
    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.host}/api/version", timeout=5.0)
                return response.status_code == 200
        except Exception:
            return False
            
    async def get_status(self) -> dict:
        is_avail = await self.is_available()
        version = None
        models_loaded = 0
        if is_avail:
            try:
                async with httpx.AsyncClient() as client:
                    version_res = await client.get(f"{self.host}/api/version", timeout=5.0)
                    if version_res.status_code == 200:
                        version = version_res.json().get('version')
                    
                    ps_res = await client.get(f"{self.host}/api/ps", timeout=5.0)
                    if ps_res.status_code == 200:
                        models_loaded = len(ps_res.json().get('models', []))
            except Exception as e:
                logger.error(f"Error getting extended status: {e}")
        
        return {
            "available": is_avail,
            "host": self.host,
            "version": version,
            "models_loaded": models_loaded
        }
