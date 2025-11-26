import sys
import os
from dotenv import load_dotenv

print(f"Python Executable: {sys.executable}")
print(f"Python Version: {sys.version}")

try:
    load_dotenv()
    print("Loaded .env")
    
    if os.environ.get("GEMINI_API_KEY"):
        print("GEMINI_API_KEY found")
    else:
        print("GEMINI_API_KEY NOT found")

    if os.environ.get("YOUTUBE_API_KEY"):
        print("YOUTUBE_API_KEY found")
    else:
        print("YOUTUBE_API_KEY NOT found")

    import flask
    print("✅ Flask imported")
    import fitz
    print("✅ PyMuPDF imported")
    import sklearn
    print("✅ scikit-learn imported")
    import numpy
    print("✅ numpy imported")
    import langchain
    print("✅ langchain imported")
    import langchain_google_genai
    print("✅ langchain_google_genai imported")
    
    # Try importing the module
    sys.path.append(os.getcwd())
    from gemini_advanced import generate_study_plan
    print("✅ gemini_advanced imported successfully")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
