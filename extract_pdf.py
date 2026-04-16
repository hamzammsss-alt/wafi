import PyPDF2
with open(r'C:\Users\HP\.gemini\antigravity\brain\2ee31836-ddbb-4a6e-8b2a-1aabbee04568\.tempmediaStorage\8d97e6bc995f5842.pdf', 'rb') as f:
    reader = PyPDF2.PdfReader(f)
    text = '\n'.join(page.extract_text() for page in reader.pages)
with open('extracted_features.txt', 'w', encoding='utf-8') as out:
    out.write(text)
