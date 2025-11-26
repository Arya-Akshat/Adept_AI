from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os

app = Flask(__name__)
CORS(app)
# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(BASE_DIR)
raw_data_path = os.path.join(project_root, "backend", "src", "constants", "rawData")
print(f"CWD: {os.getcwd()}")
print(f"Final path: {raw_data_path}")

# Load .env from flask directory
load_dotenv(os.path.join(BASE_DIR, ".env"))

@app.route("/")
def helloWorld():
    return jsonify({"Res": 200})

@app.route("/deleteToken")
def deleteToken():
    import os
    try:
        if os.path.exists("token.json"):
            os.remove("token.json")
        return jsonify({"statusCode": 200, 'body': "Successfully deleted token"})
    except Exception as err:
        print(err)
        return jsonify({"statusCode":404, "body": "Error in deleting token"})

@app.route("/getNotes")
def getNotesFromClassroom():
    import os.path
    import os
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    from googleapiclient.discovery import build
    import io
    from googleapiclient.http import MediaIoBaseDownload

    SCOPES = [  
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.announcements.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
    ]

    def init():
        try:
            creds = None
            if os.path.exists("token.json"):
                creds = Credentials.from_authorized_user_file("token.json", SCOPES)
            # If there are no (valid) credentials available, let the user log in.
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(
                            "credentials.json", SCOPES
                    )
                    creds = flow.run_local_server(port=8081, open_browser=True)
                    print(flow.authorization_url()[0])
                # Save the credentials for the next run
                with open("token.json", "w") as token:
                    token.write(creds.to_json())  
            print("OAUTH DONE")
            return creds
        except Exception as err:
            return err

    def downloadFile(drive_service, fileName, fileId):

        print("NOTES doenload begin")
        request = drive_service.files().get_media(fileId=fileId)
        print("../")
        fh = io.FileIO(os.path.join(final_path,fileName), 'wb')
        downloader = MediaIoBaseDownload(fh, request)

        done = False
        while done is False:
                status, done = downloader.next_chunk()
                print(f"  🔽 Downloaded {int(status.progress() * 100)}%")
        print("NOTES doenload done")

    def isPresent(fileName):
        for file in os.listdir(final_path):
            if file == fileName:
                return True
        return False

    def main():
        """Shows basic usage of the Classroom API.
        Prints the names of the first 10 courses the user has access to.
        """
        try:
            creds = init()
            service = build("classroom", "v1", credentials=creds)
            drive_service = build("drive", "v3", credentials=creds)

            # Call the Classroom API
            results = service.courses().list().execute()
            courses = results.get("courses", [])

            print("GOt the Courses")
            if not courses:
                print("No courses found.")
                return
            print("Courses:")
            for course in courses:
                    course_id = course["id"]
                    print(course["name"])
                    announcements = service.courses().announcements().list(courseId=course_id).execute()
                    items = announcements.get('announcements', [])
                    print("Got the anncouncements")
                    for item in items:
                        for material in item.get("materials", []):
                            if "driveFile" in material:
                                    
                                    print("Got the files")
                                    fileInfo = material["driveFile"]["driveFile"]
                                    fileId = fileInfo["id"]
                                    fileName = fileInfo["title"]

                                    if not isPresent(fileName):
                                        downloadFile(drive_service, fileName, fileId)
                                        print("File Downloaded")
                                    else:
                                        print(f'{fileName} skipped as it is already installed!')
        except HttpError as error:
            print(f"An error occurred: {error}")
            return error
    try:
        main()
        return jsonify({"statusCode": 200, 'body': "Successfully installed notes"})
    except Exception as err:
        print(err)
        return jsonify({"statusCode":404, "body": "Error in installing notes"})

@app.route('/getRoadmap', methods=['GET'])
def get_roadmap():
    try:
        # Get filename from query parameter
        filename = request.args.get('filename')
        
        # Define paths
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(BASE_DIR)
        raw_data_path = os.path.join(project_root, "backend", "src", "constants", "rawData")
        
        pdf_file = None # If filename provided, use it; otherwise find first PDF
        if filename:
            pdf_file = os.path.join(raw_data_path, filename)
            if not os.path.exists(pdf_file):
                return jsonify({"error": f"PDF file '{filename}' not found"}), 404
        else:
            # Fallback: Find the first PDF file
            pdf_file = None
            for file in os.listdir(raw_data_path):
                if file.endswith(".pdf"):
                    pdf_file = os.path.join(raw_data_path, file)
                    break
            
            if not pdf_file:
                return jsonify({"error": "No PDF file found"}), 400
        
        syllabus_file = os.path.join(raw_data_path, "syllabus.jpg")

        # Use the new advanced pipeline
        from gemini_advanced import generate_study_plan
        print(f"Starting Advanced LangChain Pipeline for: {os.path.basename(pdf_file)}")
        result = generate_study_plan(pdf_file, syllabus_file)
        
        return jsonify({"message": "Roadmap generated successfully", "body": result})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# --- YouTube Integration ---
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")

def search_youtube_videos(query, max_results=3):
    """Searches for YouTube videos related to the query."""
    if not YOUTUBE_API_KEY:
        print("YOUTUBE_API_KEY not found.")
        return []
        
    try:
        from googleapiclient.discovery import build
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

@app.route('/explainTopic', methods=['POST'])
def explain_topic():
    try:
        data = request.json
        filename = data.get('filename')
        topic_title = data.get('topicTitle')
        topic_summary = data.get('topicSummary')
        
        if not filename or not topic_title:
            return jsonify({"error": "Missing filename or topicTitle"}), 400
            
        # Define paths
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(BASE_DIR)
        raw_data_path = os.path.join(project_root, "backend", "src", "constants", "rawData")
        pdf_file = os.path.join(raw_data_path, filename)
        
        if not os.path.exists(pdf_file):
            return jsonify({"error": f"PDF file '{filename}' not found"}), 404
            
        # 1. Generate Explanation using Gemini
        from gemini_advanced import generate_topic_explanation
        print(f"Generating explanation for: {topic_title}")
        explanation = generate_topic_explanation(pdf_file, topic_title, topic_summary)
        
        # 2. Fetch YouTube Videos
        print(f"Fetching YouTube videos for: {topic_title}")
        youtube_query = f"{topic_title} tutorial explained"
        videos = search_youtube_videos(youtube_query)
        
        return jsonify({
            "explanation": explanation,
            "youtubeVideos": videos
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)