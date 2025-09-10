from core.config import GROQ_MODELS as AVAILABLE_MODEL

def provide_model():
    return {i: m for i, m in enumerate(AVAILABLE_MODEL)}

def choose_model(index: int):
    return AVAILABLE_MODEL[index]