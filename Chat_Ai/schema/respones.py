from pydantic import BaseModel
from typing import Optional


class CreateChatBody(BaseModel):
    name: str
    model: Optional[str] = None

class SendBody(BaseModel):
    content: str
    model: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = 0.2