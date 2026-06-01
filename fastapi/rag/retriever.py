import logging
from rag.embedder import embed_text
from rag.vector_store import collection_exists, search

logger = logging.getLogger("rag_retriever")

def retrieve(pdfId: str, query: str, top_k: int = 4) -> list:
    logger.info(f"Retrieving top {top_k} chunks for query in document {pdfId}...")
    
    # Check if collection exists
    if not collection_exists(pdfId):
        raise ValueError("Document not yet ingested. Please wait for processing to complete.")
        
    try:
        # 1. Embed query
        query_embedding = embed_text(query)
        
        # 2. Search collection
        results = search(pdfId, query_embedding, top_k)
        
        # 3. Sort results by score descending (Qdrant search already returns sorted results, but we verify)
        results.sort(key=lambda x: x["score"], reverse=True)
        return results
    except Exception as e:
        logger.error(f"Error retrieving context for pdfId '{pdfId}': {e}")
        raise e
