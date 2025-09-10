# chat/chat_methods.py
import os
import re
import uuid
import json
import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import AsyncGenerator, List, Optional, Tuple

import dotenv
dotenv.load_dotenv()

# ===== Paths =====
DATA_DIR = Path(os.getenv("DATA_DIR", "./data")).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ===== Provider (Groq optional) =====
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
USE_GROQ = bool(GROQ_API_KEY)
if USE_GROQ:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception:  # library missing at dev time
        USE_GROQ = False
        groq_client = None
else:
    groq_client = None

# Default models (يمكنك تعديلها بسهولة)
GROQ_MODELS = [
    os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
]

TZ = timezone(timedelta(hours=3), name="AST")

NAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")

def _slug_or_none(name: str) -> Optional[str]:
    return name if NAME_RE.match(name or "") else None

# ===== JSONL helpers =====

def _chat_path(name: str) -> Path:
    return DATA_DIR / f"{name}.jsonl"

def _append_jsonl(path: Path, obj: dict) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")

# ===== Public API used by FastAPI layer =====

def list_models() -> List[str]:
    return GROQ_MODELS

def create_chat(name: str, model: Optional[str] = None) -> Tuple[bool, dict]:
    slug = _slug_or_none(name)
    if not slug:
        return False, {"message": "Invalid chat name. Use letters, digits, '_', '-' only."}
    path = _chat_path(slug)
    if path.exists():
        return False, {"message": "Chat already exists"}
    riyadh_tz = timezone(timedelta(hours=3))
    dt_riyadh = datetime.now(riyadh_tz).strftime("%Y-%m-%d %H:%M:%S")
    info = {
        "info":{
        "id": uuid.uuid4().hex[:6],
        "name": name,
        "created_at": dt_riyadh
        }
    }
    _append_jsonl(path, info)
    return True, {"id": info["info"]["id"], "name": slug, "created_at": info["info"]["created_at"]}


def provide_chat(name: str) -> Optional[str]:
    slug = _slug_or_none(name)
    if not slug:
        return None
    path = _chat_path(slug)
    if not path.exists():
        return None
    print(path.read_text(encoding="utf-8"))
    return path.read_text(encoding="utf-8")

def history_chat():
    list_chat = []
    for file in os.listdir("./data"):
        list_chat.append(file.split(".")[0])
    return list_chat

# ===== Core chat (non-stream + stream) =====
async def _stream_from_provider(messages: List[dict], model: str, temperature: float = 0.2) -> AsyncGenerator[str, None]:
    if USE_GROQ and groq_client:
        # Groq compatible streaming
        stream = groq_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            stream=True,
        )
        for chunk in stream:
            delta = getattr(chunk.choices[0].delta, "content", None)
            if delta:
                yield delta
        return
    # Fallback dev streamer
    text = "(local dev) You said: " + next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    for ch in text:
        yield ch
        await asyncio.sleep(0.01)

async def chat_once_stream(
    chat_name: str,
    user_text: str,
    model: Optional[str] = None,
    system_prompt: Optional[str] = None,
    temperature: float = 0.2,
) -> AsyncGenerator[str, None]:
    slug = _slug_or_none(chat_name)
    if not slug:
        yield "[error] invalid chat name"; return

    path = _chat_path(slug)
    if not path.exists():
        ok, _ = create_chat(slug, model=model)
        if not ok:
            yield "[error] cannot create chat"; return

    # Load history (last N to control context)
    lines = []
    try:
        with path.open("r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        pass

    history: List[dict] = []
    for ln in lines:
        try:
            obj = json.loads(ln)
        except Exception:
            continue
        if obj.get("type") == "meta":
            continue
        if obj.get("role") in ("user", "assistant", "system"):
            history.append({"role": obj["role"], "content": obj["content"]})

    if system_prompt:
        history = [{"role": "system", "content": system_prompt}] + history

    # Append user message to file
    id = uuid.uuid4().hex[:4]
    # _append_jsonl(path, {
    #     "chats":{
    #         "chat_id": id,
    #         "model": model,
    #         "created_at": datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S"),
    #         "time_zone": "Asia/Riyadh",
    #         "messages": [
    #         {"role": "user", "content": user_text}, 
    #         {"role": "assistant", "content": system_prompt}]
    #     }
    # })

    # Stream assistant
    collected: List[str] = []
    model_name = model or GROQ_MODELS[0]
    async for token in _stream_from_provider(history + [{"role": "user", "content": user_text}], model_name, temperature):
        collected.append(token)
        yield token

    # Persist assistant full message
    _append_jsonl(path, {
        "chats":{
            "chat_id": id,
            "model": model_name,
            "created_at": datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S"),
            "time_zone": "Asia/Riyadh",
            "messages": [
            {"role": "user", "content": user_text}, 
            {"role": "assistant", "content": "".join(collected)}]
        }
    })











# import uuid
# from groq import Groq
# import dotenv
# import os
# import json
# from datetime import datetime, timezone, timedelta
# from zoneinfo import ZoneInfo
# dotenv.load_dotenv()

# api_key = os.getenv("GROQ_API_KEY")


# client = Groq(
#     api_key=(api_key),
# )
# def chat(prompt:str, file_path: str, create_chat: bool = False):
#     if create_chat:
#         create_chat(file_path)



#     chat_completion = client.chat.completions.create(
#         messages=[
#             {
#                 "role": "user",
#                 "content": prompt,
#             }
#         ],
#         model="llama-3.3-70b-versatile",
#     )
#     riyadh_tz = timezone(timedelta(hours=3))
#     dt_riyadh = datetime.fromtimestamp(chat_completion.created, tz=riyadh_tz).strftime("%Y-%m-%d %H:%M:%S")
    
#     data = {
#         "chats":{
#             "chat_id": chat_completion.id,
#             "model": chat_completion.model,
#             "created_at": dt_riyadh,
#             "time_zone": "Asia/Riyadh",
#             "messages": [
#             {"role": "user", "content": prompt}, 
#             {"role": "assistant", "content": chat_completion.choices[0].message.content}]
#         }
#     }
    
#     with open(file_path, "a", encoding="utf-8") as f:
#         f.write(json.dumps(data, ensure_ascii=False) + "\n")
#     return chat_completion



# def create_chat(name: str):
#     name = _slug_or_none(name)
#     if not name:
#         return False, {"message": "اسم محادثة غير صالح. استخدم الحروف والأرقام و '_' و '-' فقط."}
    
#     path = _chat_path(name)
#     if os.path.exists(f"../data/{name}.jsonl"):
#         return False, {"message": "Chat already exists"}
    
#     riyadh_tz = timezone(timedelta(hours=3))
#     dt_riyadh = datetime.now(riyadh_tz).strftime("%Y-%m-%d %H:%M:%S")
#     chat_info = {
#         "info":{
#         "id": uuid.uuid4().hex[:6],
#         "name": name,
#         "created_at": dt_riyadh
#         }
#     }
#     with open(f"/data/{name}.jsonl", "a+", encoding="utf-8") as f:
#         f.write(json.dumps(chat_info, ensure_ascii=False) + "\n")
#     return {"status": "success", "id": chat_info["info"]["id"], "name": chat_info["info"]["name"]}


# def provide_chat(name: str):
#     if not os.path.exists(f"../data/{name}.jsonl"):
#         return "Chat not found"
#     with open(f"../data/{name}.jsonl", "r", encoding="utf-8") as f:
#         return f.read()

# def history_chat():
#     list_chat = []
#     for file in os.listdir("../data"):
#         list_chat.append(file)
#     return list_chat

# if "_main" == __name__:
#     print(chat("How are you?", "/data/test.jsonl"))