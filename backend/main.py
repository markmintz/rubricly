import os
import re
import shutil
import tempfile
import io
import csv
import zipfile
from typing import List, Dict, Any, Tuple, Optional

import cv2
import numpy as np
import pytesseract
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pdf2image import convert_from_path
from PIL import Image, ImageDraw, ImageFont
from starlette.responses import StreamingResponse
from scipy.ndimage import interpolation as inter

# --- Data Mapping ---
RUBRIC_MAP = {
    "1": {0: "Importance not addressed", 2: "Minimally/poorly addressed", 3: "Some importance established", 4: "Project importance established", 5: "Project importance well-established"},
    "2": {0: "Not addressed", 2: "Minimally/poorly addressed", 3: "A few constraints given/modest quality", 4: "Constraints sufficient/measurable list", 5: "Thorough/well-defined list"},
    "3": {0: "Not addressed", 2: "Minimally/poorly addressed", 3: "A few metrics/modest quality", 4: "Sufficient/measurable list", 5: "Thorough/well-defined/prioritized list"},
    "4": {0: "Not addressed", 2: "Minimally/poorly addressed", 3: "Several items mentioned but not described", 4: "Descriptive/reasonably complete", 5: "Thorough/defined list with costs"},
    "5": {0: "No alternatives", 2: "Only 1-2 shown", 3: "Several shown but not well described", 4: "Sufficient list/well described", 5: "Thorough/highlights features"},
    "6": {0: "Not addressed", 2: "Not clear", 3: "Little justification", 4: "Sufficient justification", 5: "Thorough justification"},
    "7": {0: "Not addressed", 2: "Poorly prepared/justified", 3: "Mediocre presentation/justification", 4: "Sufficient presentation/justification", 5: "Thorough presentation/justification"},
    "8": {0: "No schedule", 2: "Poor schedule", 3: "Mediocre/unrealistic", 4: "Sufficient presentation", 5: "Thorough schedule"},
    "9": {0: "None", 2: "Poorly done", 3: "Some missing", 4: "Sufficient", 5: "Thorough"},
    "10": {0: "No answers/hostile", 2: "Poorly", 3: "Neutral", 4: "Sufficiently/good understanding", 5: "Thorough/clear/concise"},
    "11": {0: "Not at all", 2: "Poor", 3: "Neutral", 4: "Good", 5: "Outstanding"},
}

# --- Configuration & Setup ---
app = FastAPI(title="Rubricly CV API", version="2.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Update these paths if necessary for your local environment
tesseract_cmd = os.environ.get("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
poppler_path = os.environ.get("POPPLER_PATH", r"C:\Users\chase\Documents\trae_projects\Rubricly\deps\poppler-24.08.0\poppler-24.08.0\Library\bin")

# --- Image Pre-processing & Cleaning ---

def deskew(image: np.ndarray) -> np.ndarray:
    """Corrects image rotation skew."""
    try:
        osd = pytesseract.image_to_osd(image, output_type=pytesseract.Output.DICT, config="--psm 0")
        angle = osd["rotate"]
        if angle != 0 and abs(angle) < 15: # Only correct small skews
            return inter.rotate(image, -angle, reshape=False, cval=255)
    except Exception as e:
        print(f"  > Deskew skipped/failed: {e}")
    return image

def clean_image_for_ocr(image: np.ndarray) -> np.ndarray:
    """Remove horizontal and vertical lines to prevent OCR garbage."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)

    # Detect Horizontal Lines
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
    h_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, h_kernel, iterations=1)
    
    # Detect Vertical Lines
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
    v_lines = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, v_kernel, iterations=1)
    
    # Combine lines
    lines = cv2.add(h_lines, v_lines)
    
    # Subtract lines from original image (turn them white)
    cleaned = cv2.add(gray, lines) 
    return cleaned

def detect_vertical_grid_lines(image: np.ndarray) -> List[int]:
    """
    Detects the X-coordinates of the vertical table lines.
    CONSTRAINT: Only return lines in the right 55% of the page (x > image_width * 0.45).
    This filters out the table border around the question text.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    # Morph open to isolate vertical structures
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 50))
    verticals = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # Sum pixels vertically to find peaks (x-coordinates of lines)
    column_sums = np.sum(verticals, axis=0)
    
    # Find indices where the sum is high (indicating a line)
    threshold = np.max(column_sums) * 0.3
    line_indices = np.where(column_sums > threshold)[0]
    
    if len(line_indices) == 0:
        return []
    
    # Group close indices (lines typically span a few pixels width)
    unique_lines = []
    if len(line_indices) > 0:
        current_group = [line_indices[0]]
        for i in range(1, len(line_indices)):
            if line_indices[i] - line_indices[i-1] < 15:  # Group pixels closer than 15px
                current_group.append(line_indices[i])
            else:
                unique_lines.append(int(np.mean(current_group)))
                current_group = [line_indices[i]]
        unique_lines.append(int(np.mean(current_group)))
    
    # CONSTRAINT: Filter to only lines in right 55% of page
    # (Question text takes up left 45%, scores start after that)
    img_width = image.shape[1]
    score_grid_lines = [line for line in unique_lines if line > img_width * 0.45]
    
    return sorted(score_grid_lines)

# --- Relative Density OMR ---

def detect_score_with_grid(binary_image: np.ndarray, anchor_box: Tuple, vertical_lines: List[int], debug_draw: ImageDraw.Draw, font: ImageFont.FreeTypeFont, initial_threshold_multiplier: float = 1.0) -> Optional[int]:
    """
    Detects score using a combination of vertical line detection and adaptive thresholding.
    """
    scores = [0, 2, 3, 4, 5]
    x, y, w, h = anchor_box
    img_height, img_width = binary_image.shape
    margin_baseline = calculate_margin_baseline_density(binary_image)

    # --- Dynamic Zone Definition using Vertical Lines ---
    grid_start_threshold = img_width * 0.45
    relevant_lines = [line for line in vertical_lines if line > grid_start_threshold]

    zone_rois = []
    if len(relevant_lines) >= 5:  # Ideal case: 5+ lines define the grid
        # Use pairs of lines to define the columns
        for i in range(min(5, len(relevant_lines) - 1)):
            left_limit = relevant_lines[i]
            right_limit = relevant_lines[i+1]
            
            roi_x = int(left_limit + 5)
            roi_y = int(y) - 10
            roi_w = int(right_limit - left_limit - 10)
            roi_h = int(h) + 20
            zone_rois.append((roi_x, roi_y, roi_w, roi_h))
    else:
        # Fallback: Divide space equally if lines are missing
        left_limit = relevant_lines[0] if relevant_lines else int(grid_start_threshold)
        right_limit = int(img_width * 0.95)
        total_width = right_limit - left_limit
        col_width = total_width / 5.0
        
        for i in range(5):
            zone_start_x = left_limit + (i * col_width)
            zone_end_x = left_limit + ((i + 1) * col_width)
            zone_margin = (zone_end_x - zone_start_x) * 0.25
            
            roi_x = int(zone_start_x + zone_margin) + 2
            roi_y = int(y) - 10
            roi_w = int(zone_end_x - zone_start_x - (2 * zone_margin)) - 4
            roi_h = int(h) + 20
            zone_rois.append((roi_x, roi_y, roi_w, roi_h))

    # --- Density Calculation ---
    zone_densities = []
    for i, (rx, ry, rw, rh) in enumerate(zone_rois):
        rx, ry, rw, rh = max(0, rx), max(0, ry), min(rw, img_width - rx), min(rh, img_height - ry)
        if rw <= 0 or rh <= 0:
            zone_densities.append(0)
            continue
        
        roi = binary_image[ry:ry+rh, rx:rx+rw]
        density = np.count_nonzero(roi) / roi.size if roi.size > 0 else 0
        zone_densities.append(density)
        
        debug_draw.rectangle([rx, ry, rx + rw, ry + rh], outline="yellow", width=1)
        debug_draw.text((rx + 2, ry - 25), f"{density:.3f}", fill="yellow", font=font)

    # --- Adaptive Thresholding and Sanity Check ---
    max_val = np.max(zone_densities) if zone_densities else 0
    winner_idx = np.argmax(zone_densities) if zone_densities else -1
    
    # Sanity Check: Ensure winner is significantly denser than empty zones
    empty_zone_densities = [d for i, d in enumerate(zone_densities) if i != winner_idx]
    avg_empty_density = np.mean(empty_zone_densities) if empty_zone_densities else 0
    
    # Adaptive Thresholding
    noise_threshold = max(margin_baseline * 2.0, avg_empty_density * 1.5)
    
    # Confidence check
    is_confident = (
        max_val > noise_threshold and 
        max_val > 0.015 and  # Absolute minimum ink
        (avg_empty_density == 0 or max_val > avg_empty_density * 2.0) # Must be 2x denser than other zones
    )

    if is_confident:
        rx, ry, rw, rh = zone_rois[winner_idx]
        debug_draw.rectangle([rx, ry, rx + rw, ry + rh], outline="lime", width=4)
        return scores[winner_idx]

    # --- Retry with Lower Threshold ---
    if initial_threshold_multiplier > 0.5: # Limit recursion
        # If no winner, try again with a 50% lower threshold
        return detect_score_with_grid(binary_image, anchor_box, vertical_lines, debug_draw, font, initial_threshold_multiplier * 0.5)

    return None

def calculate_margin_baseline_density(binary_image: np.ndarray) -> float:
    """
    Calculate the ink density in the page margins (top/bottom/sides).
    This serves as a baseline to filter out paper grain and scanner noise.
    """
    h, w = binary_image.shape
    margin_width = 50  # pixels
    
    # Sample top margin
    top_roi = binary_image[0:margin_width, :]
    # Sample bottom margin
    bottom_roi = binary_image[h - margin_width:h, :]
    # Sample left margin
    left_roi = binary_image[:, 0:margin_width]
    # Sample right margin
    right_roi = binary_image[:, w - margin_width:w]
    
    # Combine all margin samples
    margin_pixels = np.concatenate([top_roi.flatten(), bottom_roi.flatten(), left_roi.flatten(), right_roi.flatten()])
    
    # Calculate baseline density
    baseline_density = np.count_nonzero(margin_pixels) / margin_pixels.size if margin_pixels.size > 0 else 0
    
    return baseline_density

# --- Page Validation & Orchestration ---

def has_critical_anchor(image: np.ndarray) -> bool:
    """Check for a critical anchor to validate if it's a rubric page."""
    try:
        # Resize for speed
        small = cv2.resize(image, (0,0), fx=0.5, fy=0.5)
        data = pytesseract.image_to_string(small, config="--psm 6")
        keywords = ["motivation", "evaluation", "constraints", "budget", "schedule"]
        return any(k in data.lower() for k in keywords)
    except Exception:
        return False

def process_rubric_page(image: Image.Image, output_dir: str, filename_prefix: str) -> Dict[str, Any]:
    """Orchestrates the CV pipeline."""
    # Prepare Debug Image
    debug_image = image.convert("RGB")
    debug_draw = ImageDraw.Draw(debug_image)
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except IOError:
        font = ImageFont.load_default()

    original_cv = np.array(image.convert("RGB"))
    gray_img = cv2.cvtColor(original_cv, cv2.COLOR_RGB2GRAY)
    
    # 1. Deskew
    deskewed_gray = deskew(gray_img)
    
    # 2. Page Validation
    if not has_critical_anchor(deskewed_gray):
        print(f"  > {filename_prefix}: No anchor found. Saving as Comments.")
        comment_path = os.path.join(output_dir, f"{filename_prefix}_full_comments.jpg")
        image.save(comment_path, "JPEG")
        return {"Comments_Image_Path": os.path.basename(comment_path)}

    # 3. Prepare Binary Image for OMR
    _, binary_inv_img = cv2.threshold(deskewed_gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # 4. Prepare Cleaned Image for OCR (Lines Removed)
    cleaned_for_ocr = clean_image_for_ocr(np.array(debug_image))

    # 5. Detect Vertical Grid Lines
    v_lines = detect_vertical_grid_lines(np.array(debug_image))
    for vx in v_lines:
        debug_draw.line([(vx, 0), (vx, debug_image.height)], fill="blue", width=2)

    # 6. Extract Handwritten Fields
    advisor_text, advisor_img_path = extract_handwritten_field(cleaned_for_ocr, "Advisor", debug_draw, output_dir, filename_prefix)
    group_text, group_img_path = extract_handwritten_field(cleaned_for_ocr, "Group", debug_draw, output_dir, filename_prefix)

    results = {
        "Advisor": advisor_text,
        "Advisor_Image_Path": advisor_img_path,
        "Group_Name": group_text,
        "Group_Name_Image_Path": group_img_path,
    }

    # 7. Find Anchors & Process Scores
    anchors = find_text_anchors(cleaned_for_ocr, debug_draw)
    total_score = 0
    
    for q_num, anchor_box in anchors.items():
        score = detect_score_with_grid(binary_inv_img, anchor_box, v_lines, debug_draw, font)
        results[f"Q{q_num}_Score"] = score
        results[f"Q{q_num}_Text"] = RUBRIC_MAP[q_num].get(score, "")
        if score is not None: 
            total_score += score
            
    results["Total_Score"] = total_score

    # Final Debug Save
    debug_filename = f"{filename_prefix}_debug.jpg"
    debug_filepath = os.path.join(output_dir, debug_filename)
    debug_image.save(debug_filepath, "JPEG")

    return results

# --- Helper Functions ---

def extract_handwritten_field(image: np.ndarray, label: str, debug_draw: ImageDraw.Draw, output_dir: str, filename_prefix: str) -> Tuple[str, str]:
    # Look for the printed label "Advisor:" or "Capstone Group:"
    data = pytesseract.image_to_data(image, config="--psm 6", output_type=pytesseract.Output.DICT)
    found_text = ""
    
    for i, text in enumerate(data["text"]):
        if label.lower() in text.lower() and int(data["conf"][i]) > 60:
            x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
            
            # Define ROI: To the right AND slightly below (to catch sloppy writing)
            roi_x = x + w + 5
            roi_y = y - 10 # Go up a bit to catch tall letters
            roi_w = 700 # Wide search area
            roi_h = h + 50 # Search below the line too
            
            # Clamp
            img_h, img_w = image.shape
            roi_x = min(roi_x, img_w)
            roi_y = max(0, roi_y)
            roi_w = min(roi_w, img_w - roi_x)
            roi_h = min(roi_h, img_h - roi_y)

            debug_draw.rectangle([roi_x, roi_y, roi_x + roi_w, roi_y + roi_h], outline="blue", width=3)
            
            roi_crop = image[roi_y:roi_y+roi_h, roi_x:roi_x+roi_w]
            
            # Save the crop (Fallback is the image itself)
            crop_filename = f"{filename_prefix}_{label.lower()}_crop.jpg"
            crop_path = os.path.join(output_dir, crop_filename)
            Image.fromarray(roi_crop).save(crop_path)
            
            # Try to OCR the crop (Optional, often fails on handwriting)
            try:
                found_text = pytesseract.image_to_string(roi_crop, config="--psm 7").strip()
                # Clean garbage (OCR often reads lines as underscores/dashes)
                found_text = re.sub(r"[^a-zA-Z0-9\s\.,]", "", found_text)
            except:
                pass
                
            return found_text, os.path.basename(crop_path)
            
    return "", ""

def find_text_anchors(image: np.ndarray, debug_draw: ImageDraw.Draw) -> Dict[str, Tuple]:
    """
    Enhanced anchor detection with relaxed regex to catch all question numbers.
    Regex: r"^\s*(\d{1,2})[.\s]" matches "1.", "1 ", "10.", "  2.", etc.
    Constraint: Anchor must be in far-left margin (x < 15% of image width).
    """
    anchor_boxes = {}
    # psm 4: single column of variable-size text (good for table rows)
    data = pytesseract.image_to_data(image, config="--psm 4", output_type=pytesseract.Output.DICT)
    
    img_width = image.shape[1]
    
    for i, text in enumerate(data["text"]):
        clean_text = text.strip()
        
        # NEW REGEX: Relaxed to match "1.", "1 ", "  2.", etc.
        match = re.match(r"^\s*(\d{1,2})[.\s]", clean_text)
        
        if match:
            q_num_str = match.group(1)
            
            # Verify it's a valid question number in our rubric
            if q_num_str in RUBRIC_MAP:
                confidence = int(data["conf"][i])
                
                # Only accept high-confidence detections
                if confidence > 60:
                    q_num = q_num_str
                    x, y, w, h = data["left"][i], data["top"][i], data["width"][i], data["height"][i]
                    
                    # CONSTRAINT: Anchor must be in far-left margin (15% threshold)
                    # This ensures we only match the question number, not text in descriptions
                    if x < img_width * 0.15:
                        anchor_boxes[q_num] = (x, y, w, h)
                        
                        # Debug: Draw anchor box in cyan
                        debug_draw.rectangle([x, y, x + w, y + h], outline="cyan", width=3)
                        debug_draw.text((x + w + 10, y), f"Q{q_num}", fill="cyan", font=None)
    
    return anchor_boxes

# --- Main API Endpoint ---
@app.post("/process-rubrics")
async def process_rubrics_endpoint(files: List[UploadFile] = File(...)):
    if not os.path.isdir(poppler_path):
        raise HTTPException(status_code=500, detail="Poppler not configured.")
    if not os.path.exists(pytesseract.pytesseract.tesseract_cmd):
        raise HTTPException(status_code=500, detail="Tesseract not configured.")

    with tempfile.TemporaryDirectory() as output_dir:
        csv_data = []
        for file in files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
                shutil.copyfileobj(file.file, tmp_pdf)
                tmp_pdf_path = tmp_pdf.name
            try:
                images = convert_from_path(tmp_pdf_path, dpi=300, poppler_path=poppler_path)
                for i, image in enumerate(images):
                    page_num = i + 1
                    filename_prefix = f"{os.path.splitext(file.filename)[0]}_p{page_num}"
                    page_results = process_rubric_page(image, output_dir, filename_prefix)
                    full_results = {"Filename": file.filename, "Page_Num": page_num, **page_results}
                    csv_data.append(full_results)
            except Exception as e:
                print(f"Error processing {file.filename}: {e}")
            finally:
                if os.path.exists(tmp_pdf_path):
                    os.unlink(tmp_pdf_path)

        if not csv_data: 
            raise HTTPException(status_code=400, detail="No valid data extracted from uploaded files.")
        
        csv_filepath = os.path.join(output_dir, "master_rubric_data.csv")
        # Generate headers dynamically to ensure coverage
        headers = ["Filename", "Page_Num", "Advisor", "Advisor_Image_Path", "Group_Name", "Group_Name_Image_Path"]
        for i in range(1, 12):
            headers.extend([f"Q{i}_Score", f"Q{i}_Text"])
        headers.extend(["Total_Score", "Comments_Image_Path"])
        
        with open(csv_filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(csv_data)
            
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for item in os.listdir(output_dir):
                zf.write(os.path.join(output_dir, item), arcname=item)
        
        zip_buffer.seek(0)
        return StreamingResponse(zip_buffer, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=rubric_results.zip"})

@app.get("/health")
def health():
    return {"status": "ok", "tesseract_available": os.path.exists(pytesseract.pytesseract.tesseract_cmd), "poppler_available": os.path.isdir(poppler_path)}