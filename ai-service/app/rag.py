import chromadb
from pathlib import Path

KNOWLEDGE_BASE_DIR = Path(__file__).resolve().parent.parent / "knowledge_base"

chroma_client = chromadb.PersistentClient(
    path=str(Path(__file__).resolve().parent.parent / "chroma_db")
)

collection = chroma_client.get_or_create_collection(
    name="support_knowledge"
)

def load_documents():
    documents = []

    for file_path in KNOWLEDGE_BASE_DIR.glob("*.md"):
        content = file_path.read_text(encoding="utf-8")

        documents.append({
            "source": file_path.name,
            "content": content
        })

    return documents

def chunk_text(text: str, chunk_size: int = 500):
    words = text.split()
    chunks = []

    for i in range(0, len(words), chunk_size):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)

    return chunks

def ingest_documents():
    documents = load_documents()

    document_id = 0

    for document in documents:
        chunks = chunk_text(document["content"])

        for chunk in chunks:
            collection.upsert(
                ids=[f"chunk-{document_id}"],
                documents=[chunk],
                metadatas=[{
                    "source": document["source"]
                }]
            )

            document_id += 1

    print(f"Ingested {document_id} chunks")

def search_knowledge(query: str, n_results: int = 2):
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )

    filtered_documents = []
    filtered_metadatas = []
    filtered_distances = []

    for document, metadata, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
    ):
        if distance <= 1.0:
            filtered_documents.append(document)
            filtered_metadatas.append(metadata)
            filtered_distances.append(distance)

    results["documents"][0] = filtered_documents
    results["metadatas"][0] = filtered_metadatas
    results["distances"][0] = filtered_distances

    return results

def get_rag_results(query: str, n_results: int = 2):
    return search_knowledge(query, n_results)

def build_rag_context(results):
    context_parts = []

    for document, metadata in zip(
            results["documents"][0],
            results["metadatas"][0]
    ):
        context_parts.append(
            f"Source: {metadata['source']}\n{document}"
        )

    return "\n\n".join(context_parts)

def get_knowledge_sources(results):
    sources = []

    for metadata in results["metadatas"][0]:
        source = metadata["source"]

        if source not in sources:
            sources.append(source)

    return sources