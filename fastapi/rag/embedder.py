import os
import logging
import google.generativeai as genai

logger = logging.getLogger("rag_embedder")

# Global reference to keep configure state
_configured = False

def load_embedding_model():
    """No-op for backward compatibility and pre-configuring genai."""
    global _configured
    if _configured:
        return None
    
    try:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            from dotenv import load_dotenv
            load_dotenv()
            load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
            api_key = os.environ.get("GEMINI_API_KEY")
        
        if api_key:
            genai.configure(api_key=api_key)
            _configured = True
            logger.info("Generative AI configured successfully for embeddings.")
        else:
            logger.warning("GEMINI_API_KEY not found in environment variables.")
    except Exception as e:
        logger.error(f"Failed to configure Generative AI: {e}")
    return None

def embed_text(text: str) -> list[float]:
    load_embedding_model()
    try:
        response = genai.embed_content(
            model="models/gemini-embedding-2",
            content=text,
            task_type="retrieval_query",
            output_dimensionality=768
        )
        return response["embedding"]
    except Exception as e:
        logger.error(f"Error generating embedding for text: {e}")
        raise e

def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    load_embedding_model()
    try:
        response = genai.embed_content(
            model="models/gemini-embedding-2",
            content=texts,
            task_type="retrieval_document",
            output_dimensionality=768
        )
        return response["embedding"]
    except Exception as e:
        logger.error(f"Error generating embeddings for batch: {e}")
        raise e

