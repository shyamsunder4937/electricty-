import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from rag_pipeline.rag_query import build_rag_database

# Get absolute path to rag_documents folder (in project root)
project_root = Path(__file__).parent.parent.parent
rag_docs_path = project_root / "rag_documents"

print(f"Building RAG database from: {rag_docs_path}")
build_rag_database(str(rag_docs_path))
