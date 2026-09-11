from abc import ABC, abstractmethod
from typing import AsyncGenerator
from pydantic import BaseModel
from enum import Enum

class TaskType(str, Enum):
    GENERAL_REASONING = "general_reasoning"
    DOCUMENT_ANALYSIS = "document_analysis"
    CODING_DATA_ANALYSIS = "coding_data_analysis"
    IMAGE_VISION = "image_vision"
    DOCUMENT_GENERATION = "document_generation"

class ModelInfo(BaseModel):
    name: str
    size: str | None = None
    quantization: str | None = None
    family: str | None = None
    parameter_size: str | None = None
    modified_at: str | None = None

class ChatMessage(BaseModel):
    role: str  # 'user', 'assistant', 'system'
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str | None = None
    task_type: TaskType | None = None
    temperature: float = 0.7
    max_tokens: int | None = None
    stream: bool = True

class ChatResponse(BaseModel):
    content: str
    model: str
    task_type: TaskType | None = None
    done: bool = False
    total_duration: int | None = None
    eval_count: int | None = None
    sources: list[dict] = []

class ModelProvider(ABC):
    @abstractmethod
    async def list_models(self) -> list[ModelInfo]:
        ...
    
    @abstractmethod
    async def chat(self, request: ChatRequest) -> ChatResponse:
        ...
    
    @abstractmethod
    async def chat_stream(self, request: ChatRequest) -> AsyncGenerator[ChatResponse, None]:
        ...
    
    @abstractmethod
    async def is_available(self) -> bool:
        ...
    
    @abstractmethod
    async def get_status(self) -> dict:
        ...
