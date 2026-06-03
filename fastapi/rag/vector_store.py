import os
import logging
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

logger = logging.getLogger("qdrant_store")

# Load env settings
QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")

# Initialize Client with local/cloud fallback
def get_qdrant_client():
    if QDRANT_URL:
        try:
            logger.info(f"Connecting to Qdrant at {QDRANT_URL}...")
            client = QdrantClient(
                url=QDRANT_URL,
                api_key=QDRANT_API_KEY or None,
                timeout=30
            )
            # Basic connectivity check
            client.get_collections()
            logger.info("Connected to Qdrant successfully.")
            return client
        except Exception as e:
            logger.error(
                f"CRITICAL: Qdrant connection to {QDRANT_URL} failed: {e}. "
                "Failing fast to prevent silent data loss."
            )
            raise e
            
    logger.warning("QDRANT_URL not configured. Initializing in-memory Qdrant client (VECTORS WILL NOT PERSIST)...")
    return QdrantClient(":memory:")

client = get_qdrant_client()

def create_collection(pdfId: str) -> None:
    collection_name = f"pdf_{pdfId.replace('-', '_')}"
    try:
        if not client.collection_exists(collection_name):
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=768, distance=Distance.COSINE)
            )
            logger.info(f"Collection '{collection_name}' created.")
    except Exception as e:
        logger.error(f"Error creating collection '{collection_name}': {e}")
        raise e

def collection_exists(pdfId: str) -> bool:
    collection_name = f"pdf_{pdfId.replace('-', '_')}"
    try:
        return client.collection_exists(collection_name)
    except Exception:
        return False

def upsert_chunks(pdfId: str, chunks, embeddings: list[list[float]]) -> None:
    collection_name = f"pdf_{pdfId.replace('-', '_')}"
    create_collection(pdfId)
    
    points = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        points.append(
            PointStruct(
                id=i,
                vector=embedding,
                payload={
                    "text": chunk.text,
                    "metadata": chunk.metadata
                }
            )
        )
    try:
        client.upsert(collection_name=collection_name, points=points)
        logger.info(f"Upserted {len(points)} chunks to collection '{collection_name}'.")
    except Exception as e:
        logger.error(f"Error upserting to collection '{collection_name}': {e}")
        raise e

def search(pdfId: str, query_embedding: list[float], top_k: int) -> list:
    collection_name = f"pdf_{pdfId.replace('-', '_')}"
    if not collection_exists(pdfId):
        raise ValueError(f"Collection '{collection_name}' does not exist.")
        
    try:
        results = client.query_points(
            collection_name=collection_name,
            query=query_embedding,
            limit=top_k
        )
        search_results = []
        for r in results.points:
            payload = r.payload or {}
            search_results.append({
                "text": payload.get("text", ""),
                "metadata": payload.get("metadata", {}),
                "score": r.score
            })
        return search_results
    except Exception as e:
        logger.error(f"Error searching collection '{collection_name}': {e}")
        raise e

def delete_collection(pdfId: str) -> None:
    collection_name = f"pdf_{pdfId.replace('-', '_')}"
    try:
        if client.collection_exists(collection_name):
            client.delete_collection(collection_name=collection_name)
            logger.info(f"Deleted collection '{collection_name}'.")
    except Exception as e:
        logger.error(f"Error deleting collection '{collection_name}': {e}")
        raise e
