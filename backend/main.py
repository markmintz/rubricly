from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import tempfile
import shutil
import os

from pdf2image import convert_from_path
from pypdf import PdfReader
import pytesseract
from PIL import Image
import shutil as _shutil
import re
import numpy as np
import cv2


app = FastAPI(title="Rubricly OCR API", version="0.1.0")

# Allow Vite dev server to call the API during local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Optional: configure tesseract binary from environment variable
tesseract_cmd = os.environ.get("TESSERACT_CMD")
if not tesseract_cmd:
    # Fallback to common Windows install path if available
    default_tess = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(default_tess):
        os.environ["TESSERACT_CMD"] = default_tess
        tesseract_cmd = default_tess
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd


def _tesseract_available() -> bool:
    # If env var provided, assume available; otherwise check PATH or callable
    cmd = os.environ.get("TESSERACT_CMD") or _shutil.which("tesseract")
    if cmd:
        try:
            _ = pytesseract.get_tesseract_version()
            return True
        except Exception:
            return True  # binary exists; version call may fail in some setups
    return False


def _poppler_available() -> bool:
    poppler_path = os.environ.get("POPPLER_PATH")
    if not poppler_path:
        # Fallback to workspace-installed poppler if present
        default_poppler_bin = (
            r"C:\Users\chase\Documents\trae_projects\Rubricly\deps\poppler-24.08.0\poppler-24.08.0\Library\bin"
        )
        if os.path.isdir(default_poppler_bin):
            os.environ["POPPLER_PATH"] = default_poppler_bin
            poppler_path = default_poppler_bin
    if not poppler_path:
        return False
    if not os.path.isdir(poppler_path):
        return False
    # On Windows, pdftoppm.exe indicates poppler binaries present
    ppm = os.path.join(poppler_path, "pdftoppm.exe")
    return os.path.exists(ppm)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "tesseract_available": _tesseract_available(),
        "poppler_available": _poppler_available(),
    }


def _deskew_with_osd(image: Image.Image) -> Image.Image:
    try:
        osd = pytesseract.image_to_osd(image)
        m = re.search(r"Rotate:\s*(\d+)", osd)
        deg = int(m.group(1)) if m else 0
        if deg and deg % 360 != 0:
            return image.rotate(-deg, expand=True)
    except Exception:
        pass
    return image


def _preprocess_for_ocr(image: Image.Image) -> Image.Image:
    # Convert to RGB, then grayscale
    rgb = image.convert("RGB")
    arr = np.array(rgb)
    gray = cv2.cvtColor(arr, cv2.COLOR_RGB2GRAY)
    h, w = gray.shape

    # Upscale small images to improve OCR
    target_h = int(os.environ.get("OCR_TARGET_HEIGHT", "1500"))
    if h < target_h:
        scale = target_h / float(h)
        gray = cv2.resize(gray, (int(w * scale), target_h), interpolation=cv2.INTER_CUBIC)

    # Denoise and threshold
    denoise = cv2.medianBlur(gray, 3)
    thr = cv2.adaptiveThreshold(
        denoise,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        15,
    )
    # Morphological opening to reduce speckles
    kernel = np.ones((1, 1), np.uint8)
    proc = cv2.morphologyEx(thr, cv2.MORPH_OPEN, kernel)
    return Image.fromarray(proc)


def ocr_pdf(pdf_path: str) -> str:
    """Render each page to an image and run OCR with PyTesseract."""
    parts: List[str] = []
    poppler_path = os.environ.get("POPPLER_PATH")  # Windows needs poppler installed
    tried_ocr = False
    dpi = int(os.environ.get("OCR_DPI", "300"))
    lang = os.environ.get("OCR_LANG", "eng")
    psm = os.environ.get("OCR_PSM", "6")
    oem = os.environ.get("OCR_OEM", "1")
    config = f"--psm {psm} --oem {oem}"
    try:
        images = convert_from_path(pdf_path, dpi=dpi, poppler_path=poppler_path)
        for img in images:
            img = _deskew_with_osd(img)
            img = _preprocess_for_ocr(img)
            text = pytesseract.image_to_string(img, lang=lang, config=config)
            parts.append(text)
        tried_ocr = True
    except Exception:
        # Fallback: extract typed text using PDF text layer
        reader = PdfReader(pdf_path)
        for page in reader.pages:
            text = page.extract_text() or ""
            parts.append(text)
    text_out = "\n".join(parts)
    # If OCR failed and typed text extraction yielded nothing, guide user
    if not text_out.strip() and not _poppler_available() and not tried_ocr:
        return (
            ""  # keep output empty per API, UI can show empty result
        )
    return text_out


@app.post("/extract")
async def extract(files: List[UploadFile] = File(...)):
    """
    Accept one or more PDF files, perform OCR for all pages, and return text.
    Response shape: { results: [{ filename, text }] }
    """
    results = []
    for file in files:
        # Persist to a secure temp file before processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name
        try:
            text = ocr_pdf(tmp_path)
            results.append({"filename": file.filename, "text": text})
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return {"results": results}