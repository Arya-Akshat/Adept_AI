import os
from pathlib import Path
from docx2pdf import convert as docx_to_pdf
from fpdf import FPDF
import shutil

"""def convert_txt_to_pdf(txt_path, output_pdf_path):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_font("Arial", size=12)
    
    try:
        with open(txt_path, 'r', encoding='utf-8') as file:
            for line in file:
                pdf.cell(200, 10, txt=line.strip(), ln=True)
        pdf.output(output_pdf_path)
        print(f"[TXT → PDF] Converted: {txt_path}")
    except Exception as e:
        print(f"[ERROR] Failed to convert TXT: {txt_path} — {e}")"""

def process_files(file_paths, output_folder="converted_pdfs"):
    os.makedirs(output_folder, exist_ok=True)

    for file_path in file_paths:
        ext = Path(file_path).suffix.lower()
        file_name = Path(file_path).stem
        output_pdf_path = os.path.join(output_folder, f"{file_name}.pdf")

        try:
            if ext == ".pdf":
                # Optionally copy existing PDFs to output folder
                shutil.copy(file_path, output_pdf_path)
                print(f"[SKIP] Already PDF: {file_path}")
            elif ext == ".txt":
                convert_txt_to_pdf(file_path, output_pdf_path)
            elif ext == ".docx":
                docx_to_pdf(file_path, output_pdf_path)
                print(f"[DOCX → PDF] Converted: {file_path}")
            else:
                print(f"[SKIP] Unsupported file type: {file_path}")
        except Exception as e:
            print(f"[ERROR] Processing failed: {file_path} — {e}")

# Example usage:
file_list = [
    "this.docx"# unsupported
]

process_files(file_list)
