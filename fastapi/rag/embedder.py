import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("rag_embedder")

# Global reference to model
_model = None

def load_embedding_model():
    global _model
    if _model is not None:
        return _model
    
    try:
        logger.info("Loading sentence-transformers model 'all-MiniLM-L6-v2'...")
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        logger.info("Sentence-transformers model loaded successfully.")
        return _model
    except Exception as e:
        logger.error(f"Failed to load sentence-transformers model: {e}")
        raise RuntimeError(f"Embedding model initialization failed: {e}")

def embed_text(text: str) -> list[float]:
    model = load_embedding_model()
    try:
        embedding = model.encode(text)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Error generating embedding for text: {e}")
        raise e

def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = load_embedding_model()
    try:
        embeddings = model.encode(texts)
        return embeddings.tolist()
    except Exception as e:
        logger.error(f"Error generating embeddings for batch: {e}")
        raise e
