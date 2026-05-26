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
gemini_vision_model = genai.GenerativeModel("gemini-2.0-flash")
groq_client = Groq(api_key=GROQ_API_KEY)


def create_text_prompt(system_prompt, user_prompt):
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def generate_groq_text(system_prompt, user_prompt, temperature=0.2, max_tokens=2048):
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=create_text_prompt(system_prompt, user_prompt),
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (response.choices[0].message.content or "").strip()

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
        if not os.path.exists(image_path):
            return "Default Syllabus: General Computer Science"

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

def generate_topic_explanation(pdf_path, topic_title, topic_summary):
    """Generates explanation for a specific topic."""
    
    # 1. Extract & Chunk (Reuse existing logic)
    # Note: In a production env, we should cache this. For now, we re-process.
    pdf_text = extract_text_from_pdf(pdf_path)
    chunks = chunk_text(pdf_text)
    
    # 2. Retrieve
    # Use topic title + summary as query
    query = f"{topic_title}: {topic_summary}"
    relevant_chunks = retrieve_relevant_chunks(chunks, query, top_k=10)
    context = "\n\n".join(relevant_chunks)
    
    # 3. Generate
    system_prompt = (
        "You are an expert tutor. Provide a comprehensive learning guide in valid JSON only. "
        "Return this structure exactly: {\"learningObjectives\": [...], \"detailedExplanation\": \"...\", "
        "\"keyConcepts\": [...], \"practicalExamples\": [...]}"
    )
    user_prompt = (
        f"Topic: {topic_title}\n"
        f"Summary: {topic_summary}\n\n"
        f"Context from Study Material:\n{context}\n\n"
        "Task: Provide a comprehensive learning guide for this topic."
    )

    result = generate_groq_text(system_prompt, user_prompt, temperature=0.3)
    
    try:
        cleaned_result = result.replace("```json", "").replace("```", "").strip()
        return json.loads(cleaned_result)
    except json.JSONDecodeError:
        print(f"Error parsing explanation JSON: {result}")
        return {
            "learningObjectives": [],
            "detailedExplanation": "Failed to generate explanation.",
            "keyConcepts": [],
            "practicalExamples": []
        }

# --- Main Workflow ---
def generate_study_plan(pdf_path, syllabus_image_path):
    """Orchestrates the full pipeline."""
    
    # 1. Text Extraction
    print("--- Step 1: Extracting text from PDF ---")
    pdf_text = extract_text_from_pdf(pdf_path)
    print(f"Extracted {len(pdf_text)} characters from PDF.")
    
    print("--- Step 2: Extracting syllabus ---")
    syllabus_text = extract_syllabus_from_image(syllabus_image_path)
    print(f"Syllabus text: {syllabus_text[:100]}...")
    
    # 2. Chunking
    print("--- Step 3: Chunking text ---")
    chunks = chunk_text(pdf_text)
    print(f"Created {len(chunks)} chunks.")
    
    # 3. Retrieval (TF-IDF)
    print("--- Step 4: Retrieving relevant chunks ---")
    # For the roadmap, we want a broad overview, so we might use the whole text 
    # or a large subset. For now, let's use the first N chunks + random others 
    # to fit context window if needed. 
    # But Gemini 1.5 Pro has a huge context window (1M tokens).
    # Gemini 2.0 Flash also has a large context.
    # We can probably pass the whole text if it's not massive.
    # Let's truncate to safe limit approx 30k chars for now to be safe and fast.
    context = pdf_text[:100000] 
    
    # 4. Generate
    print("--- Step 5: Generating roadmap with Groq ---")
    system_prompt = (
        "You are an expert study planner. Create a detailed study roadmap in valid JSON only. "
        "Return an array of units, each containing a unit number and a topics array with title and summary."
    )
    user_prompt = (
        f"Syllabus Context:\n{syllabus_text}\n\n"
        f"Relevant Study Material:\n{context}\n\n"
        "Task: Create a detailed study roadmap based on the syllabus and the provided study material. "
        "Organize the roadmap into 5 units and identify key subtopics."
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
        
        # Save to file
        output_path = os.path.join(os.path.dirname(pdf_path), "..", "processedData", "finalData.json")
        with open(output_path, "w") as f:
            json.dump(final_data, f, indent=4)
            
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
