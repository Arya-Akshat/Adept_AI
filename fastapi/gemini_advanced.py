import os
import json
import fitz  # PyMuPDF
from PIL import Image
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import google.generativeai as genai
from groq import Groq

import re

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment variables")

genai.configure(api_key=GEMINI_API_KEY)
gemini_vision_model = genai.GenerativeModel("gemini-3.5-flash")
groq_client = Groq(api_key=GROQ_API_KEY)


def create_text_prompt(system_prompt, user_prompt):
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def generate_groq_text(system_prompt, user_prompt, temperature=0.2, max_tokens=1024):
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=create_text_prompt(system_prompt, user_prompt),
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as e:
        print(f"[WARN] Groq primary model failed: {e}. Trying fallback model llama-3.1-8b-instant...")
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=create_text_prompt(system_prompt, user_prompt),
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e_fallback:
            print(f"[ERROR] Both Groq models failed: {e_fallback}")
            raise e_fallback

# --- 1. Text Extraction ---
def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_syllabus_from_image(image_path):
    """Extracts syllabus text from an image using Gemini vision."""
    try:
        if not image_path or not os.path.exists(image_path):
            return ""

        image = Image.open(image_path)
        prompt = (
            "Extract all visible syllabus text from this image. "
            "Return only the plain extracted text with no explanation, bullets, or markdown."
        )
        response = gemini_vision_model.generate_content([prompt, image])
        text = (getattr(response, "text", "") or "").strip()
        return text if text else "Default Syllabus: General Computer Science"
    except Exception as e:
        print(f"Error extracting syllabus: {e}")
        return "Default Syllabus: General Computer Science"

# --- 2. Chunking ---
def chunk_text(text):
    """Splits text into semantic chunks."""
    if not text:
        return []

    chunk_size = 1000
    chunk_overlap = 200
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = max(0, end - chunk_overlap)
    return chunks

# --- 3. TF-IDF Retrieval ---
def retrieve_relevant_chunks(chunks, query, top_k=5):
    """Retrieves top_k chunks relevant to the query using TF-IDF."""
    if not chunks:
        return []
        
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(chunks + [query])
    
    # Calculate cosine similarity between the query (last vector) and all chunks
    cosine_similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1])
    
    # Get indices of top_k most similar chunks
    related_docs_indices = cosine_similarities.argsort()[0][-top_k:][::-1]
    
    relevant_chunks = [chunks[i] for i in related_docs_indices]
    return relevant_chunks

def extract_json_from_text(text):
    """Tries multiple strategies to extract a JSON object from LLM output."""
    # Strategy 1: Direct parse after cleaning markdown
    cleaned = text.replace("```json", "").replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Find the first {...} block
    match = re.search(r'\{[\s\S]*\}', cleaned)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    return None


def generate_topic_explanation(pdf_path, topic_title, topic_summary):
    """Generates explanation for a specific topic with retry on parse failure."""
    is_image = pdf_path and any(pdf_path.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg'])
    
    context = ""
    if pdf_path and os.path.exists(pdf_path) and not is_image:
        pdf_text = extract_text_from_pdf(pdf_path)
        chunks = chunk_text(pdf_text)
        query = f"{topic_title}: {topic_summary}"
        relevant_chunks = retrieve_relevant_chunks(chunks, query, top_k=10)
        context = "\n\n".join(relevant_chunks)
    elif is_image and pdf_path and os.path.exists(pdf_path):
        context = extract_syllabus_from_image(pdf_path)

    system_prompt = (
        "You are an expert tutor. Your ONLY output must be a single valid JSON object with NO extra text, "
        "NO markdown, NO code fences. "
        "Return exactly this structure: "
        '{"learningObjectives": ["..."], "detailedExplanation": "...", '
        '"keyConcepts": ["..."], "practicalExamples": ["..."]}'
    )

    def build_user_prompt():
        return (
            f"Topic: {topic_title}\n"
            f"Summary: {topic_summary}\n\n"
            f"Context from Study Material:\n{context}\n\n"
            "Task: Provide a comprehensive learning guide for this topic. "
            "Output ONLY the JSON object — no explanatory text before or after."
        )

    # Attempt 1
    raw = generate_groq_text(system_prompt, build_user_prompt(), temperature=0.3)
    parsed = extract_json_from_text(raw)

    # Attempt 2 with lower temperature if first failed
    if parsed is None:
        print(f"[WARN] First parse attempt failed for '{topic_title}'. Retrying...")
        raw = generate_groq_text(system_prompt, build_user_prompt(), temperature=0.1)
        parsed = extract_json_from_text(raw)

    if parsed is None:
        print(f"[ERROR] Both parse attempts failed for '{topic_title}'.\nRaw output:\n{raw}")
        return None  # Signal failure to caller

    # Validate required keys
    required = ["learningObjectives", "detailedExplanation", "keyConcepts", "practicalExamples"]
    for key in required:
        if key not in parsed:
            parsed[key] = [] if key != "detailedExplanation" else ""

    return parsed

# --- Main Workflow ---
def generate_study_plan(pdf_path=None, syllabus_image_path=None):
    """Orchestrates the full pipeline."""
    
    # Check if pdf_path is actually an image (syllabus)
    is_pdf_image = False
    if pdf_path and any(pdf_path.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg']):
        is_pdf_image = True

    # 1. Text Extraction
    pdf_text = ""
    if pdf_path and os.path.exists(pdf_path) and not is_pdf_image:
        print("--- Step 1: Extracting text from PDF ---")
        pdf_text = extract_text_from_pdf(pdf_path)
        print(f"Extracted {len(pdf_text)} characters from PDF.")
    else:
        print("--- Step 1: No PDF notes provided or notes file missing/skipped ---")
    
    syllabus_text = ""
    if is_pdf_image:
        print("--- Step 2: Extracting syllabus from primary image ---")
        syllabus_text = extract_syllabus_from_image(pdf_path)
    elif syllabus_image_path and os.path.exists(syllabus_image_path):
        print("--- Step 2: Extracting syllabus from helper image ---")
        syllabus_text = extract_syllabus_from_image(syllabus_image_path)
    else:
        print("--- Step 2: No syllabus image provided or file missing ---")

    print(f"Syllabus text: {syllabus_text[:100]}...")
    
    # 2. Chunking
    context = ""
    if pdf_text:
        print("--- Step 3: Chunking text ---")
        chunks = chunk_text(pdf_text)
        print(f"Created {len(chunks)} chunks.")
        context = pdf_text[:8000]
    
    # 4. Generate
    print("--- Step 5: Generating roadmap with Groq ---")
    system_prompt = (
        "You are an expert study planner. Create a detailed study roadmap in valid JSON only. "
        "Return an array of units, each containing a unit number and a topics array with title and summary."
    )
    
    if syllabus_text and context:
        user_prompt = (
            f"Syllabus Context:\n{syllabus_text}\n\n"
            f"Relevant Study Material:\n{context}\n\n"
            "Task: Create a detailed study roadmap based on the syllabus and the provided study material. "
            "Organize the roadmap into 5 units and identify key subtopics."
        )
    elif syllabus_text:
        user_prompt = (
            f"Syllabus Context:\n{syllabus_text}\n\n"
            "Task: Create a detailed study roadmap based on the syllabus. "
            "Organize the roadmap into 5 units and identify key subtopics."
        )
    elif context:
        user_prompt = (
            f"Relevant Study Material:\n{context}\n\n"
            "Task: Create a detailed study roadmap based on the provided study material. "
            "Organize the roadmap into 5 units and identify key subtopics."
        )
    else:
        user_prompt = (
            "Task: Create a generic 5-unit computer science study roadmap with key subtopics. "
            "Return the roadmap organized into 5 units."
        )

    result = generate_groq_text(system_prompt, user_prompt, temperature=0.2)
    
    # Parse JSON
    try:
        # Clean up potential markdown code blocks
        cleaned_result = result.replace("```json", "").replace("```", "").strip()
        roadmap_data = json.loads(cleaned_result)
        
        # Transform to the format expected by the frontend
        # Frontend expects: { "0": { "0": { "title":..., "summary":..., "links":... } } }
        final_data = {}
        for i, unit in enumerate(roadmap_data):
            unit_index = i  # 0-based index
            final_data[unit_index] = {}
            if "topics" in unit:
                for j, topic in enumerate(unit["topics"]):
                    final_data[unit_index][j] = {
                        "title": topic.get("title", "Unknown Topic"),
                        "summary": topic.get("summary", "No summary available."),
                        "links": {} # Links can be populated by a separate search step if needed
                    }
        
        # We no longer save to file here because Node.js saves the returned final_data itself.
            
        return final_data
        
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print(f"Raw output: {result}")
        return {}

if __name__ == "__main__":
    # Test run
    CWD = os.getcwd()
    raw_data_path = os.path.join(CWD, "..", "backend", "src", "constants", "rawData")
    pdf_file = os.path.join(raw_data_path, "test.pdf") # Ensure a test PDF exists
    syllabus_file = os.path.join(raw_data_path, "syllabus.jpg")
    
    if os.path.exists(pdf_file):
        generate_study_plan(pdf_file, syllabus_file)
    else:
        print("Test PDF not found.")
