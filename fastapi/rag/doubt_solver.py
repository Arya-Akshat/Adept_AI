import os
import logging
from typing import Generator
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

from rag.retriever import retrieve
from services.tavily_service import search_web

logger = logging.getLogger("doubt_solver")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
RAG_SIMILARITY_THRESHOLD = float(os.environ.get("RAG_SIMILARITY_THRESHOLD", "0.65"))
RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "4"))

groq_client = Groq(api_key=GROQ_API_KEY)

def solve_doubt_stream(
    pdfId: str,
    question: str,
    conversation_history: list,
    use_web_fallback: bool = True
) -> Generator[str, None, None]:
    
    # 1. Retrieve RAG chunks
    rag_chunks = []
    max_score = 0.0
    
    try:
        rag_chunks = retrieve(pdfId, question, top_k=RAG_TOP_K)
        if rag_chunks:
            max_score = max(r["score"] for r in rag_chunks)
    except Exception as e:
        logger.error(f"Failed to retrieve chunks: {e}")
        # If retriever fails (e.g. collection missing), max_score stays 0.0
    
    logger.info(f"RAG search max similarity score: {max_score}")
    
    # 2. Determine context strategy
    context_text = ""
    source_info = ""
    
    if max_score >= RAG_SIMILARITY_THRESHOLD:
        # Use RAG context only
        context_parts = []
        for c in rag_chunks:
            title = c["metadata"].get("topicTitle", "Section")
            context_parts.append(f"[{title}]: {c['text']}")
        context_text = "\n\n".join(context_parts)
        source_info = "Answered from study material context."
    elif use_web_fallback:
        # Call Tavily web search
        web_results = search_web(question)
        web_parts = []
        for w in web_results:
            web_parts.append(f"Source: {w['url']}\nTitle: {w['title']}\nContent: {w['content']}")
            
        best_rag = ""
        if rag_chunks:
            best_rag = f"\n\nBest matching study material chunk:\n{rag_chunks[0]['text']}"
            
        context_text = "\n\n".join(web_parts) + best_rag
        source_info = "Answered using web search results combined with study material."
    else:
        # General knowledge only
        context_text = "None. Answer from general knowledge."
        source_info = "Answered from general knowledge. (Study material did not contain high-confidence matches)"
        
    # 3. Build Groq messages
    system_prompt = (
        "You are a helpful study assistant for students. You answer doubts "
        "based on the provided study material context. Be clear, accurate, "
        "and use simple language appropriate for students. If the answer "
        "comes from web search, mention it briefly. Never make up facts.\n\n"
        f"Context details:\n{context_text}\n\n"
        f"Note on sources: {source_info}"
    )
    
    # Build messages: system prompt, last 5 turns of conversation_history, current question
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add last 5 turns of history (10 elements if role/content keys are matching)
    history_slice = conversation_history[-5:] if conversation_history else []
    for turn in history_slice:
        role = turn.get("role", "user")
        content = turn.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
            
    # Add current question
    messages.append({"role": "user", "content": question})
    
    # 4. Stream tokens from Groq
    def stream_model(model_name: str) -> Generator[str, None, None]:
        completion = groq_client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.3,
            stream=True
        )
        for chunk in completion:
            token = chunk.choices[0].delta.content or ""
            yield token

    try:
        logger.info("Calling Groq llama-3.3-70b-versatile stream...")
        yield from stream_model("llama-3.3-70b-versatile")
    except Exception as e:
        logger.warn(f"Groq primary model failed: {e}. Trying fallback model llama-3.1-8b-instant stream...")
        try:
            yield from stream_model("llama-3.1-8b-instant")
        except Exception as e_fallback:
            logger.error(f"Both Groq models failed: {e_fallback}")
            raise e_fallback
