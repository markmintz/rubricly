# Rubricly — OCR MVP (Frontend + Backend)

This app lets you upload rubric PDFs used in PRB evaluations, extracts text via OCR (including handwritten or typed), and displays results in a simple React UI.

## Stack

- Frontend: React (Vite) + TailwindCSS (v4)
- Backend: FastAPI (Python)
- OCR: `pytesseract` (Tesseract engine)
- PDF rendering: `pdf2image` (Poppler on Windows) with OpenCV preprocessing
- Typed text fallback: `pypdf`

## Prerequisites

- Node.js 18+
- Python 3.11+ (3.13 works)
- Tesseract OCR installed
- Poppler installed (Windows) for image rendering of PDFs

The backend auto-detects common Windows install locations for Tesseract and a workspace Poppler path if present. Still, setting env vars is recommended to make setup explicit and reliable across machines.

## Quick Start (Windows)

1) Clone and install dependencies

```powershell
# In PowerShell
cd C:\path\to\Rubricly

# Frontend
cd frontend
npm install
npm run dev  # runs on http://localhost:5173 (5174 also allowed)

# Backend
cd ..\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Install Tesseract

```powershell
winget install -e --id tesseract-ocr.tesseract --accept-package-agreements --accept-source-agreements
```

3) Install Poppler (Windows)

- Download a Poppler release zip from:
  - https://github.com/oschwartz10612/poppler-windows/releases (e.g., Release-24.08.0-0.zip)
- Extract to a folder, e.g.: `C:\poppler-24.08.0\poppler-24.08.0\Library\bin`

4) Set environment variables (recommended)

```powershell
# Point directly to the installed binaries
[System.Environment]::SetEnvironmentVariable("TESSERACT_CMD", "C:\\Program Files\\Tesseract-OCR\\tesseract.exe", "User")
[System.Environment]::SetEnvironmentVariable("POPPLER_PATH", "C:\\poppler-24.08.0\\poppler-24.08.0\\Library\\bin", "User")
```

- Restart your shell after setting these variables, or start the backend from a shell where they are present.
- The backend also auto-detects if Tesseract is at `C:\\Program Files\\Tesseract-OCR\\tesseract.exe` and if Poppler exists at the workspace path `deps\\poppler-24.08.0\\poppler-24.08.0\\Library\\bin`.

5) Run the backend

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

6) Verify dependencies

```powershell
Invoke-RestMethod -Uri http://localhost:8000/health | ConvertTo-Json
```

Expected output:

```json
{ "status": "ok", "tesseract_available": true, "poppler_available": true }
```

## macOS / Linux Notes

- macOS (Homebrew): `brew install tesseract poppler`
- Ubuntu/Debian: `sudo apt-get install tesseract-ocr poppler-utils`
- Fedora/RHEL: `sudo dnf install tesseract poppler-utils`

On these platforms, Poppler and Tesseract binaries are typically available on PATH. You can still set:

```bash
export TESSERACT_CMD=/usr/bin/tesseract
export POPPLER_PATH=/usr/local/Cellar/poppler/<version>/bin  # macOS example
```

## Dev Servers and CORS

- Frontend dev server: `http://localhost:5173` (and `5174` also allowed)
- Backend dev server: `http://localhost:8000`
- CORS is configured to allow both `localhost` and `127.0.0.1` on ports `5173` and `5174`.

## API

- `GET /health` → `{ status, tesseract_available, poppler_available }`
- `POST /extract` (multipart) → `{ results: [{ filename, text }] }`
  - Form field: `files` (one or more PDF files)
  - Behavior:
    - If Poppler is available, pages render to images and OCR runs via Tesseract with OpenCV preprocessing (deskew + thresholding).
    - If Poppler is unavailable or image rendering fails, the backend falls back to typed text extraction via `pypdf`.

## OCR Configuration (Env Vars)

- `TESSERACT_CMD` → Full path to Tesseract binary (Windows)
- `POPPLER_PATH` → Poppler `bin` directory (Windows)
- `OCR_DPI` → Image render DPI (default `300`)
- `OCR_LANG` → Language (default `eng`)
- `OCR_PSM` → Page segmentation mode (default `6`)
- `OCR_OEM` → OCR engine mode (default `1`)
- `OCR_TARGET_HEIGHT` → Minimum height for upscaling before OCR (default `1500`)

Tips:
- For handwritten or noisy scans, try `OCR_PSM=11` or `OCR_PSM=1`.
- For clearly typed text in uniform blocks, `OCR_PSM=6` works well.
- Increase `OCR_DPI` to `400` for small or low-contrast scans.

## Setup — Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173`.

## Setup — Backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate  # Windows PowerShell
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API runs on `http://localhost:8000`.

### Dependency checks

- `GET /health` returns `{ status, tesseract_available, poppler_available }` to confirm environment readiness.

## Usage

1. Start the backend server.
2. Start the frontend dev server.
3. In the UI, upload one or more PDF files.
4. Click "Extract Text" to run OCR. Results display below.
5. Optional: Toggle highlighting for simple terms (e.g., "Score", "Comments").
6. Optional: Download the extracted text as `.txt`.

## Next Steps (Stretch)

- Add loading indicators per-file.
- Export `.csv` or structured parsing into Pandas.
- Improve term highlighting and add basic rubric field detection.