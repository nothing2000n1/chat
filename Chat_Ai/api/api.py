# from chat.chat_methods import provide_chat, create_chat
# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/")
# async def root():
#     return {"message": "Hello World"}

# @app.get("/chats/open_chat")
# def open_chat(name: str):
#     return provide_chat(name)

# @app.get("/chats/create")
# def create(name: str):
#     result = create_chat(name)
#     if result["status"] == "success":
#         return {"status": "success", "id": result["id"], "name": result["name"]}
#     else:
#         return {"status": "error", "message": result["message"]}
    
