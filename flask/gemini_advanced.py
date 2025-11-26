import os
import json
import fitz  # PyMuPDF
from PIL import Image
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import easyocr

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

# --- 1. Text Extraction ---
def extract_text_from_pdf(pdf_path):
    """Extracts text from a PDF file."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_syllabus_from_image(image_path):
    """Extracts syllabus text from an image using EasyOCR."""
    try:
        if not os.path.exists(image_path):
            return "Default Syllabus: General Computer Science"
            
        reader = easyocr.Reader(['en'])
        result = reader.readtext(image_path, detail=0)
        return ' '.join(result)
    except Exception as e:
        print(f"Error extracting syllabus: {e}")
        return "Default Syllabus: General Computer Science"

# --- 2. Chunking ---
def chunk_text(text):
    """Splits text into semantic chunks."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", " ", ""]
    )
    chunks = text_splitter.split_text(text)
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

# --- 4. LangChain Chains ---

def create_roadmap_chain(llm):
    """Creates a chain to generate the study roadmap."""
    template = """
    You are an expert study planner.
    
    Syllabus Context:
    {syllabus}
    
    Relevant Study Material:
    {context}
    
    Task:
    Create a detailed study roadmap based on the syllabus and the provided study material.
    Organize the roadmap into 5 Units.
    For each unit, identify key subtopics found in the material.
    
    Output Format (JSON):
    [
        {{
            "unit": 1,
            "topics": [
                {{
                    "title": "Topic Name",
                    "summary": "Brief summary of the topic based on the material."
                }}
            ]
        }},
        ...
    ]
    
    Ensure the output is valid JSON. Do not include markdown formatting like ```json.
    """
    prompt = PromptTemplate(template=template, input_variables=["syllabus", "context"])
    return LLMChain(llm=llm, prompt=prompt, output_key="roadmap_json")

def create_scheduler_chain(llm):
    """Creates a chain to add a schedule to the roadmap."""
    template = """
    You are a time management expert.
    
    Roadmap:
    {roadmap_json}
    
    Task:
    Add a "time_allocation" field to each topic in the roadmap.
    Estimate how many hours/days are needed to study each topic based on its complexity.
    
    Output Format (JSON):
    Same as input, but with "time_allocation" added to each topic.
    Ensure the output is valid JSON. Do not include markdown formatting.
    """
    prompt = PromptTemplate(template=template, input_variables=["roadmap_json"])
    return LLMChain(llm=llm, prompt=prompt, output_key="final_plan")

def create_explanation_chain(llm):
    """Creates a chain to generate detailed topic explanations."""
    template = """
    You are an expert tutor.
    
    Topic: {topic}
    Summary: {summary}
    
    Context from Study Material:
    {context}
    
    Task:
    Provide a comprehensive learning guide for this topic.
    
    Output Format (JSON):
    {{
        "learningObjectives": ["Objective 1", "Objective 2", ...],
        "detailedExplanation": "A detailed, multi-paragraph explanation of the topic. Use clear language and structure.",
        "keyConcepts": ["Concept 1", "Concept 2", ...],
        "practicalExamples": ["Example 1", "Example 2", ...]
    }}
    
    Ensure the output is valid JSON. Do not include markdown formatting.
    """
    prompt = PromptTemplate(template=template, input_variables=["topic", "summary", "context"])
    return LLMChain(llm=llm, prompt=prompt, output_key="explanation_json")

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
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY, temperature=0.3)
    explanation_chain = create_explanation_chain(llm)
    
    result = explanation_chain.run(topic=topic_title, summary=topic_summary, context=context)
    
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
    print("--- Step 5: Generating roadmap with Gemini ---")
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY, temperature=0.2)
    
    roadmap_chain = create_roadmap_chain(llm)
    # schedule_chain = create_scheduler_chain(llm) # Optional: Add scheduling later
    
    # Run the chain
    result = roadmap_chain.run(syllabus=syllabus_text, context=context)
    
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
