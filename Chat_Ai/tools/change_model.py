# tools/change_model.py
from tools.choose_model import provide_model, choose_model

def get_new_model(index: int):
    available = provide_model()
    if index not in available:
        raise IndexError("Invalid model index")
    return choose_model(index)