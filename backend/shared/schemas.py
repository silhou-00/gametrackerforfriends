from pydantic import BaseModel
from typing import TypeVar, Generic, Optional, Any

T = TypeVar("T")


class ErrorDetail(BaseModel):
    code: str
    message: str


class SuccessResponse(BaseModel, Generic[T]):
    data: T
    error: Optional[ErrorDetail] = None


class HealthResponse(BaseModel):
    data: dict[str, str]
    error: Optional[ErrorDetail] = None
