"""Document Parser and Semantic Text Chunker for Open CAF.
Extracts raw text from PDF, DOCX, CSV, TXT, and JSON files,
then partitions content into token-sized overlapping chunks ready for redaction and embedding.
"""
import io
import json
import csv
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from docx import Document


class DocumentParser:
    """
    Extracts text from multi-format council cyber evidence and chunks text
    with sliding-window overlap.
    """

    @classmethod
    def extract_text(
        cls,
        file_bytes: bytes,
        file_name: str,
        mime_type: Optional[str] = None,
    ) -> str:
        """
        Extracts plain text from file bytes based on file extension and MIME type.
        """
        if not file_bytes:
            return ""

        lower_name = file_name.lower()

        # 1. PDF Documents
        if lower_name.endswith(".pdf") or (mime_type and "pdf" in mime_type):
            return cls._extract_from_pdf(file_bytes)

        # 2. Word Documents (.docx)
        if lower_name.endswith(".docx") or (mime_type and "wordprocessingml" in mime_type):
            return cls._extract_from_docx(file_bytes)

        # 3. CSV Tables
        if lower_name.endswith(".csv") or (mime_type and "csv" in mime_type):
            return cls._extract_from_csv(file_bytes)

        # 4. JSON Files
        if lower_name.endswith(".json") or (mime_type and "json" in mime_type):
            return cls._extract_from_json(file_bytes)

        # 5. Default Plain Text (TXT, MD, LOG, XML, etc.)
        return cls._extract_from_text(file_bytes)

    @classmethod
    def _extract_from_pdf(cls, file_bytes: bytes) -> str:
        """Extracts text page by page using pypdf."""
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for i, page in enumerate(reader.pages):
                page_content = page.extract_text()
                if page_content:
                    pages_text.append(f"--- Page {i+1} ---\n{page_content.strip()}")
            return "\n\n".join(pages_text)
        except Exception as e:
            # Return partial or empty on corrupt PDF
            return f"[Error parsing PDF: {str(e)}]"

    @classmethod
    def _extract_from_docx(cls, file_bytes: bytes) -> str:
        """Extracts paragraphs and tables using python-docx."""
        try:
            doc = Document(io.BytesIO(file_bytes))
            content = []

            # Paragraphs
            for p in doc.paragraphs:
                if p.text and p.text.strip():
                    content.append(p.text.strip())

            # Tables
            for table in doc.tables:
                for row in table.rows:
                    row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_cells:
                        content.append(" | ".join(row_cells))

            return "\n\n".join(content)
        except Exception as e:
            return f"[Error parsing DOCX: {str(e)}]"

    @classmethod
    def _extract_from_csv(cls, file_bytes: bytes) -> str:
        """Extracts CSV data as structured rows."""
        try:
            text = file_bytes.decode("utf-8", errors="replace")
            reader = csv.reader(io.StringIO(text))
            rows = []
            for row in reader:
                if any(cell.strip() for cell in row):
                    rows.append(" | ".join(cell.strip() for cell in row))
            return "\n".join(rows)
        except Exception as e:
            return f"[Error parsing CSV: {str(e)}]"

    @classmethod
    def _extract_from_json(cls, file_bytes: bytes) -> str:
        """Pretty prints JSON text."""
        try:
            data = json.loads(file_bytes.decode("utf-8", errors="replace"))
            return json.dumps(data, indent=2)
        except Exception:
            return file_bytes.decode("utf-8", errors="replace")

    @classmethod
    def _extract_from_text(cls, file_bytes: bytes) -> str:
        """Decodes raw text with UTF-8 / latin-1 fallback."""
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1", errors="replace")

    @classmethod
    def chunk_text(
        cls,
        text: str,
        chunk_size_tokens: int = 500,
        overlap_tokens: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Splits text into chunks of approx `chunk_size_tokens` with `overlap_tokens`.
        Uses character/word sliding window (~4 characters per token estimate).
        Breaks on whitespace or paragraph boundaries for semantic integrity.
        """
        if not text or not text.strip():
            return []

        # Convert token parameters to rough character equivalents (~4 chars per token)
        chunk_char_size = chunk_size_tokens * 4
        overlap_chars = overlap_tokens * 4
        step_size = max(chunk_char_size - overlap_chars, 100)

        chunks: List[Dict[str, Any]] = []
        text_len = len(text)
        start = 0
        index = 0

        while start < text_len:
            end = min(start + chunk_char_size, text_len)

            # If not at the end of text, attempt to break cleanly on paragraph or newline or space
            if end < text_len:
                # Look for paragraph break
                para_break = text.rfind("\n\n", start, end)
                if para_break != -1 and para_break > start + (chunk_char_size // 2):
                    end = para_break + 2
                else:
                    # Look for sentence period or newline
                    line_break = text.rfind("\n", start, end)
                    if line_break != -1 and line_break > start + (chunk_char_size // 2):
                        end = line_break + 1
                    else:
                        space_break = text.rfind(" ", start, end)
                        if space_break != -1 and space_break > start + (chunk_char_size // 2):
                            end = space_break + 1

            chunk_content = text[start:end].strip()
            if chunk_content:
                # Estimate token count (words * 1.33)
                words = chunk_content.split()
                est_tokens = max(1, int(len(words) * 1.3))

                chunks.append({
                    "chunk_index": index,
                    "text": chunk_content,
                    "char_start": start,
                    "char_end": end,
                    "token_count": est_tokens,
                })
                index += 1

            # Advance start window
            if end >= text_len:
                break
            start = max(start + step_size, end - overlap_chars)

        return chunks
