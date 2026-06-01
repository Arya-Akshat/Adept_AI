import re
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class Chunk:
    text: str
    metadata: Dict[str, Any]

def clean_text_for_keywords(text: str) -> set:
    if not text:
        return set()
    # Normalize to lowercase and extract words >= 3 chars
    words = re.findall(r'[a-zA-Z]{3,}', text.lower())
    # Filter common stop words
    stop_words = {'the', 'and', 'for', 'with', 'you', 'that', 'this', 'from', 'are', 'was', 'were', 'have', 'has', 'not', 'but', 'can'}
    return set(w for w in words if w not in stop_words)

def chunk_document(extracted_text: str, roadmap_topics: List[Dict[str, Any]], pdf_id: str) -> List[Chunk]:
    if not extracted_text:
        return []
    
    # 1. Split text into passages (paragraphs)
    paragraphs = [p.strip() for p in re.split(r'\n+', extracted_text) if p.strip()]
    if not paragraphs:
        paragraphs = [extracted_text]
        
    # Prepare topic keyword sets
    topic_keywords = []
    for topic in roadmap_topics:
        title = topic.get("title", "")
        summary = topic.get("summary", "")
        keywords = clean_text_for_keywords(title + " " + summary)
        topic_keywords.append(keywords)
        
    # 2. Assign passages to topics based on keyword matching
    topic_passages: Dict[int, List[str]] = {i: [] for i in range(len(roadmap_topics))}
    unassigned: List[tuple] = [] # List of (passage_index, passage_text)
    
    for idx, passage in enumerate(paragraphs):
        passage_words = clean_text_for_keywords(passage)
        best_topic_idx = -1
        max_matches = 0
        
        for t_idx, keywords in enumerate(topic_keywords):
            matches = len(passage_words.intersection(keywords))
            if matches > max_matches:
                max_matches = matches
                best_topic_idx = t_idx
                
        if best_topic_idx != -1:
            topic_passages[best_topic_idx].append(passage)
        else:
            unassigned.append((idx, passage))
            
    # 3. Assign unassigned passages to the nearest topic by index
    for idx, passage in unassigned:
        closest_topic_idx = 0
        min_distance = float('inf')
        
        for t_idx in range(len(roadmap_topics)):
            target_pos = (t_idx / len(roadmap_topics)) * len(paragraphs)
            dist = abs(idx - target_pos)
            if dist < min_distance:
                min_distance = dist
                closest_topic_idx = t_idx
                
        topic_passages[closest_topic_idx].append(passage)
        
    # 4. Formulate chunks with max size 1000 characters and 100 overlap
    chunks: List[Chunk] = []
    
    for t_idx, topic in enumerate(roadmap_topics):
        title = topic.get("title", "")
        summary = topic.get("summary", "")
        passages = topic_passages[t_idx]
        
        content_prefix = f"Topic: {title}\nSummary: {summary}\nContent:\n"
        topic_body = "\n".join(passages)
        
        if not topic_body:
            topic_body = "No specific content matched in study materials."
            
        full_content = content_prefix + topic_body
        
        unit_index = topic.get("unitIndex", 0)
        topic_index = topic.get("topicIndex", 0)
        
        chunk_size = 1000
        overlap = 100
        
        if len(full_content) <= chunk_size:
            chunks.append(Chunk(
                text=full_content,
                metadata={
                    "pdfId": pdf_id,
                    "unitIndex": unit_index,
                    "topicIndex": topic_index,
                    "topicTitle": title,
                    "chunkIndex": 0
                }
            ))
        else:
            start = 0
            chunk_idx = 0
            while start < len(full_content):
                end = start + chunk_size
                sub_content = full_content[start:end]
                chunks.append(Chunk(
                    text=sub_content,
                    metadata={
                        "pdfId": pdf_id,
                        "unitIndex": unit_index,
                        "topicIndex": topic_index,
                        "topicTitle": title,
                        "chunkIndex": chunk_idx
                    }
                ))
                chunk_idx += 1
                if end >= len(full_content):
                    break
                start = end - overlap
                
    return chunks
