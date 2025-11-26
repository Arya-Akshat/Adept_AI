import os
import easyocr

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

if __name__ == "__main__":
    # Test run
    CWD = os.getcwd()
    raw_data_path = os.path.join(CWD, "backend", "src", "constants", "rawData")
    syllabus_file = os.path.join(raw_data_path, "syllabus.jpg")
    
    if os.path.exists(syllabus_file):
        result = extract_syllabus_from_image(syllabus_file)
        print(result)
    else:
        print("Test image not found.")
