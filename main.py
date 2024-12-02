from flask import Flask, request, jsonify
from transformers import pipeline
from werkzeug.utils import secure_filename
import os
from PyPDF2 import PdfReader

# Initialize Flask app
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Load summarization pipeline
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Helper function to extract text from PDF files
def extract_text_from_pdf(file_path):
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text += extracted
        if not text.strip():
            raise ValueError("Could not extract text from the PDF file.")
        return text
    except Exception as e:
        raise ValueError(f"Could not extract text from the PDF file: {str(e)}")

def summarize_text(input_text):
    """Summarize given text using the Hugging Face summarization pipeline."""
    input_length = len(input_text.split())
    max_length = min(500, int(0.8 * input_length))  # Dynamically adjust max_length
    min_length = min(100, int(0.2 * input_length))  # Dynamically adjust min_length

    try:
        # Ensure min_length <= max_length
        if min_length >= max_length:
            min_length = max_length - 1

        # Perform summarization
        summaries = summarizer(input_text, max_length=max_length, min_length=min_length, do_sample=False)

        # Ensure output is valid
        if summaries and len(summaries) > 0 and "summary_text" in summaries[0]:
            return summaries[0]["summary_text"]
        else:
            raise ValueError("No valid summary returned by the model.")

    except Exception as e:
        raise ValueError(f"An error occurred during summarization: {str(e)}")

# Route to summarize uploaded files
@app.route("/summarize", methods=["POST"])
def summarize_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        # Save the uploaded file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        # Determine file type and extract text
        if filename.endswith(".pdf"):
            text = extract_text_from_pdf(file_path)

        # Summarize text
        summary = summarize_text(text)
        return jsonify({"summary": summary})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

app.run(debug=True, port=5000)