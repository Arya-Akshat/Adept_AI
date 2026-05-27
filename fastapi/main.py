from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import os
import sys
import io

# Initialize FastAPI app
app = FastAPI(title="VedaAI AI Engine")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(BASE_DIR)
raw_data_path = os.path.join(project_root, "backend", "src", "constants", "rawData")
print(f"CWD: {os.getcwd()}")
print(f"Final path: {raw_data_path}")

# Load .env from flask directory
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Google Classroom OAUTH Config
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

final_path = raw_data_path

SCOPES = [  
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.announcements.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
]

def init_google_credentials(userId: Optional[str] = None):
    try:
        creds = None
        token_filename = f"token_{userId}.json" if userId else "token.json"
        if os.path.exists(token_filename):
            creds = Credentials.from_authorized_user_file(token_filename, SCOPES)
        # If there are no (valid) credentials available, let the user log in.
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "credentials.json", SCOPES
                )
                creds = flow.run_local_server(port=8081, open_browser=True)
                print(flow.authorization_url()[0])
            # Save the credentials for the next run
            with open(token_filename, "w") as token:
                token.write(creds.to_json())  
        print("OAUTH DONE")
        return creds
    except Exception as err:
        return err

def downloadFile(drive_service, fileName, fileId, userId: Optional[str] = None):
    print("NOTES download begin")
    request = drive_service.files().get_media(fileId=fileId)
    print("../")
    target_filename = f"{userId}_{fileName}" if userId else fileName
    fh = io.FileIO(os.path.join(final_path, target_filename), 'wb')
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while done is False:
        status, done = downloader.next_chunk()
        print(f"  🔽 Downloaded {int(status.progress() * 100)}%")
    print("NOTES download done")

def isPresent(fileName, userId: Optional[str] = None):
    target_filename = f"{userId}_{fileName}" if userId else fileName
    return os.path.exists(os.path.join(final_path, target_filename))

def sync_classroom_notes(userId: Optional[str] = None):
    try:
        creds = init_google_credentials(userId)
        if isinstance(creds, Exception):
            raise creds
        service = build("classroom", "v1", credentials=creds)
        drive_service = build("drive", "v3", credentials=creds)

        # Call the Classroom API
        results = service.courses().list().execute()
        courses = results.get("courses", [])

        print("Got the Courses")
        if not courses:
            print("No courses found.")
            return True
        print("Courses:")
        for course in courses:
            course_id = course["id"]
            print(course["name"])
            announcements = service.courses().announcements().list(courseId=course_id).execute()
            items = announcements.get('announcements', [])
            print("Got the announcements")
            for item in items:
                for material in item.get("materials", []):
                    if "driveFile" in material:
                        print("Got the files")
                        fileInfo = material["driveFile"]["driveFile"]
                        fileId = fileInfo["id"]
                        fileName = fileInfo["title"]

                        if not isPresent(fileName, userId):
                            downloadFile(drive_service, fileName, fileId, userId)
                            print("File Downloaded")
                        else:
                            print(f'{fileName} skipped as it is already installed!')
        return True
    except Exception as err:
        print(err)
        raise err

# YouTube Integration
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")

def search_youtube_videos(query, max_results=3):
    """Searches for YouTube videos related to the query."""
    if not YOUTUBE_API_KEY:
        print("YOUTUBE_API_KEY not found.")
        return []
        
    try:
        youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
        
        search_response = youtube.search().list(
            q=query,
            type="video",
            part="id,snippet",
            maxResults=max_results,
            relevanceLanguage="en"
        ).execute()
        
        videos = []
        for search_result in search_response.get("items", []):
            video_id = search_result["id"]["videoId"]
            
            # Get video details for duration and view count
            video_response = youtube.videos().list(
                id=video_id,
                part="contentDetails,statistics"
            ).execute()
            
            if not video_response.get("items"):
                continue
                
            video_details = video_response["items"][0]
            duration = video_details["contentDetails"]["duration"] # ISO 8601 format (e.g., PT15M33S)
            view_count = video_details["statistics"].get("viewCount", "0")
            
            # Format duration (simple approximation)
            duration = duration.replace("PT", "").replace("H", ":").replace("M", ":").replace("S", "")
            if ":" not in duration: # If only seconds
                duration = f"0:{duration}"
            
            # Format view count
            try:
                views = int(view_count)
                if views >= 1000000:
                    view_count = f"{views/1000000:.1f}M"
                elif views >= 1000:
                    view_count = f"{views/1000:.1f}K"
            except:
                pass

            videos.append({
                "videoId": video_id,
                "title": search_result["snippet"]["title"],
                "thumbnail": search_result["snippet"]["thumbnails"]["medium"]["url"],
                "channelName": search_result["snippet"]["channelTitle"],
                "duration": duration,
                "viewCount": f"{view_count} views"
            })
            
        return videos
    except Exception as e:
        print(f"Error searching YouTube: {e}")
        return []

# Pydantic request models
class ExplainTopicRequest(BaseModel):
    filename: str
    topicTitle: str
    topicSummary: Optional[str] = None

# Routes
@app.get("/")
def hello_world():
    return {"Res": 200}

@app.get("/deleteToken")
def delete_token(userId: Optional[str] = None):
    try:
        token_filename = f"token_{userId}.json" if userId else "token.json"
        if os.path.exists(token_filename):
            os.remove(token_filename)
        return {"statusCode": 200, "body": "Successfully deleted token"}
    except Exception as err:
        print(err)
        raise HTTPException(status_code=404, detail="Error in deleting token")

@app.get("/getNotes")
def get_notes(userId: Optional[str] = None):
    try:
        sync_classroom_notes(userId)
        return {"statusCode": 200, "body": "Successfully installed notes"}
    except Exception as err:
        raise HTTPException(status_code=404, detail="Error in installing notes")

from fastapi import File, UploadFile, Form
import tempfile
import shutil

@app.post("/getRoadmap")
def get_roadmap(
    userId: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = File(None),
    syllabus_file: Optional[UploadFile] = File(None)
):
    try:
        temp_pdf_path = None
        temp_syllabus_path = None
        
        # 1. Handle PDF / Notes
        if pdf_file and pdf_file.filename:
            suffix = os.path.splitext(pdf_file.filename)[1]
            temp_pdf_fd, temp_pdf_path = tempfile.mkstemp(suffix=suffix)
            with os.fdopen(temp_pdf_fd, 'wb') as f:
                shutil.copyfileobj(pdf_file.file, f)
        elif userId:
            # Fallback: Find the first PDF file for the user on Python's local disk (synced from classroom)
            suffix = f"{userId}_"
            for f in os.listdir(raw_data_path):
                if f.startswith(suffix) and f.endswith(".pdf"):
                    temp_pdf_path = os.path.join(raw_data_path, f)
                    break

        # 2. Handle Syllabus
        if syllabus_file and syllabus_file.filename:
            suffix = os.path.splitext(syllabus_file.filename)[1]
            temp_syllabus_fd, temp_syllabus_path = tempfile.mkstemp(suffix=suffix)
            with os.fdopen(temp_syllabus_fd, 'wb') as f:
                shutil.copyfileobj(syllabus_file.file, f)
        
        # Check if the primary file is an image (syllabus) or a PDF (notes)
        is_primary_image = temp_pdf_path and any(temp_pdf_path.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg'])
        if is_primary_image and not temp_syllabus_path:
            temp_syllabus_path = temp_pdf_path
            temp_pdf_path = None

        if not temp_pdf_path and not temp_syllabus_path:
            raise HTTPException(status_code=400, detail="No study materials or syllabus image found to generate a roadmap.")

        # Use the new advanced pipeline
        from gemini_advanced import generate_study_plan
        target_name = os.path.basename(temp_pdf_path) if temp_pdf_path else os.path.basename(temp_syllabus_path)
        print(f"Starting Advanced LangChain Pipeline for: {target_name}")
        result = generate_study_plan(temp_pdf_path, temp_syllabus_path)
        
        # Cleanup temp files
        if pdf_file and temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
        if syllabus_file and temp_syllabus_path and os.path.exists(temp_syllabus_path):
            os.remove(temp_syllabus_path)
            
        return {"message": "Roadmap generated successfully", "body": result}
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explainTopic")
def explain_topic(req: ExplainTopicRequest):
    try:
        filename = req.filename
        topic_title = req.topicTitle
        topic_summary = req.topicSummary
        
        pdf_file = os.path.join(raw_data_path, filename)
        if not os.path.exists(pdf_file):
            raise HTTPException(status_code=404, detail=f"PDF file '{filename}' not found")
            
        # 1. Generate Explanation using Gemini
        from gemini_advanced import generate_topic_explanation
        print(f"Generating explanation for: {topic_title}")
        explanation = generate_topic_explanation(pdf_file, topic_title, topic_summary)
        
        if explanation is None:
            raise HTTPException(status_code=422, detail="Failed to generate explanation after retries. Please try again.")

        # 2. Fetch YouTube Videos
        print(f"Fetching YouTube videos for: {topic_title}")
        youtube_query = f"{topic_title} tutorial explained"
        videos = search_youtube_videos(youtube_query)
        
        return {
            "explanation": explanation,
            "youtubeVideos": videos
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
