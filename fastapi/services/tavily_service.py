import os
import logging
from dotenv import load_dotenv
from tavily import TavilyClient

# Load environment variables
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

logger = logging.getLogger("tavily_service")

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")

# Initialize client
_tavily_client = None
if TAVILY_API_KEY:
    try:
        _tavily_client = TavilyClient(api_key=TAVILY_API_KEY)
        logger.info("Tavily client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Tavily Client: {e}")
else:
    logger.warn("TAVILY_API_KEY is not defined in environment variables. Web search fallback will be unavailable.")

def search_web(query: str) -> list:
    global _tavily_client
    if not _tavily_client:
        logger.warn("Tavily client is not initialized. Web search bypassed.")
        return []
        
    logger.info(f"Calling Tavily Web Search API for query: '{query}'")
    try:
        response = _tavily_client.search(query=query, max_results=3)
        results = response.get("results", [])
        
        web_results = []
        for r in results:
            web_results.append({
                "title": r.get("title", "No Title"),
                "content": r.get("content", ""),
                "url": r.get("url", "")
            })
        logger.info(f"Tavily Search completed. Found {len(web_results)} results.")
        return web_results
    except Exception as e:
        logger.error(f"Tavily API search failed: {e}")
        return []
