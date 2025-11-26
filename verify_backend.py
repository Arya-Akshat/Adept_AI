import requests
import os
import time
import sys

EXPRESS_URL = "http://localhost:4004"
FLASK_URL = "http://localhost:5001"
PDF_FILE = "FD.pdf"

def test_endpoint(name, url, method="GET", files=None, json=None):
    print(f"Testing {name} ({method} {url})...")
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, files=files, json=json)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...") # Print first 200 chars
        if response.status_code == 200:
            print("✅ Success")
            return True
        else:
            print("❌ Failed")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("Waiting for servers to start...")
    time.sleep(5) # Give servers time to start

    # 1. Express Health Check
    test_endpoint("Express Health Check", f"{EXPRESS_URL}/")

    # 2. Flask Health Check
    test_endpoint("Flask Health Check", f"{FLASK_URL}/")

    # 3. Check Connection (Express)
    test_endpoint("Check Connection", f"{EXPRESS_URL}/api/checkConnection", method="POST")

    # 4. Upload PDF (Express)
    if os.path.exists(PDF_FILE):
        with open(PDF_FILE, 'rb') as f:
            files = {'file': (PDF_FILE, f, 'application/pdf')}
            test_endpoint("Upload PDF", f"{EXPRESS_URL}/api/parsePDF", method="POST", files=files)
    else:
        print(f"⚠️ {PDF_FILE} not found, skipping upload test.")

    # 5. Get Roadmap (Flask)
    test_endpoint("Get Roadmap", f"{FLASK_URL}/getRoadmap")

if __name__ == "__main__":
    main()
