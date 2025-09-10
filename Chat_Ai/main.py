# main.py
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from chat.chat_methods import (
    create_chat,
    provide_chat,
    chat_once_stream,
    list_models,
    history_chat as chats,
)
from schema.respones import CreateChatBody, SendBody

app = FastAPI(title="Chat_Ai API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/web", StaticFiles(directory="web"), name="web")


@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = Path(__file__).parent / "web" / "index.html"
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


# توافق خلفي (كان GET /chats/create?name=...)
@app.post("/chats/create")
def create_chat_endpoint(body: dict):
    ok, payload = create_chat(body.get("name"))
    if not ok:
        raise HTTPException(400, payload["message"])
    return payload


# جلب محتوى محادثة كاملة بصيغة JSONL (نص خام)
@app.post("/chats/open_chat")
def open_chat(body: dict):
    print(body.get("name"))
    content = provide_chat(body.get("name"))
    if content is None:
        raise HTTPException(404, "Chat not found")
    return {"name": body, "jsonl": content}


# إرسال رسالة مع خيار البث
@app.post("/chats/send")
async def send(name: str, body: SendBody, stream: bool = Query(default=True)):
    if stream:
        gen = chat_once_stream(
            chat_name=name,
            user_text=body.content,
            model=body.model,
            system_prompt=body.system_prompt,
            temperature=body.temperature or 0.2,
        )
        return StreamingResponse(gen, media_type="text/plain")
    else:
        # اجمع البث إلى نص واحد (نفس الجنريتور)
        chunks = []
        async for tok in chat_once_stream(
            chat_name=name,
            user_text=body.content,
            model=body.model,
            system_prompt=body.system_prompt,
            temperature=body.temperature or 0.2,
        ):
            chunks.append(tok)
        return {"content": "".join(chunks)}


@app.get("/models")
def models():
    return {"models": list_models()}

@app.get("/history_chat")
def history_chat():
    list_chat = chats()
    if list_chat is None:
        return {"chats": None}
    return {"chats": list_chat}