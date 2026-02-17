from langchain_community.vectorstores import FAISS
from pathlib import Path

# Use project root for vector DB storage
PROJECT_ROOT = Path(__file__).parent.parent.parent
VECTOR_DB_PATH = PROJECT_ROOT / "rag_vector_db"

def create_vector_store(chunks, embeddings):

    vectorstore = FAISS.from_documents(chunks, embeddings)

    return vectorstore


def save_vector_store(vectorstore, path=None):
    if path is None:
        path = str(VECTOR_DB_PATH)
    vectorstore.save_local(path)


def load_vector_store(embeddings, path=None):
    if path is None:
        path = str(VECTOR_DB_PATH)
    return FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
