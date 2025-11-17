Here is a **clean, corrected, coherent, production-ready Markdown specification** of BeeFont V2.
I fixed structural inconsistencies, removed redundancies, added missing parts (e.g. template mapping), unified terminology, and ensured every section fits together logically.

I **did not include API details** (per your instruction).
This is now a self-contained architectural specification you can keep in your repo as `BEEFONT_SPEC_V2.md`.

---

# **BeeFont V2 — System Specification (Clean & Coherent)**

## **1. Overview**

BeeFont V2 implements a **multi-page handwritten font creation pipeline** with:

* multiple template pages per job
* multiple scan attempts per template
* automatic extraction of per-letter glyph variants
* user selection of the best variant for each character
* final TTF generation from canonical glyphs
* minimal database usage (all glyphs stored as files)

A **Job** represents one font project.
A job is defined by:

* **language** (e.g. `DE`)
* **page format** (e.g. `A4`)
* **character set** (e.g. `ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß`)
* a set of required **template pages**, each defining a fixed grid layout and letter order

Workflow summary:

1. Backend provides printable sheets.
2. User fills them out by hand.
3. User uploads scans (repeatable per page).
4. System extracts glyph variants.
5. User selects preferred variants.
6. Backend builds final TTF.

Database remains small—variants are stored only on disk using a simple naming convention.

---

## **2. Core Concepts**

### **2.1 Job**

A font project containing:

* language (`DE`)
* paper format (`A4`)
* full character set
* multiple `TemplateSlot` entries
* generated TTF + ZIP bundle

The job transitions through:

* `DRAFT`
* `IN_PROGRESS`
* `READY_FOR_FONT`
* `FONT_GENERATED`
* `CANCELLED`

---

### **2.2 TemplateSlot**

Represents **one required template page** for this job.

Attributes:

* `template_code` (e.g. `A4_DE_6x5_1`)
* `page_index` (attempt count)
* `status`: `NO_SCAN`, `ANALYZED`, `ERROR`, `APPROVED`, `UPLOADED`
* raw + processed scan paths
* last error message

`page_index` increments whenever the user retries that page.

---

### **2.3 Letter Mapping**

Each template includes a reference to a **mapping file** that specifies:

```
token → unicode codepoint
```

e.g.

```
"A" → 0x0041
"adieresis" → 0x00E4
```

Mapping files live in:

```
templates/mapping/mapping_<LANG>.json
templates/mapping/mapping.json   # fallback
```

The system loads the appropriate mapping based on `job.language`.

---

### **2.4 Glyph Variants (Filesystem Only)**

Every scan attempt may produce glyph variants for the letters that the user filled.

Variant naming:

```
segment/<job>/<TOKEN>_<page_index>.png
```

Examples:

```
segment/42/A_0.png
segment/42/A_2.png
segment/42/adieresis_1.png
```

Only non-empty cells generate files.

---

### **2.5 Canonical Glyphs**

After user selection, one variant becomes canonical:

```
segment/<job>/<TOKEN>.png
```

These are the files used for TTF generation.

No variant database table is ever needed.

---

## **3. File Layout**

For job with ID `<sid>`:

### **3.1 Variants**

```
media/beefont/segments/<sid>/<TOKEN>_<page_index>.png
```

### **3.2 Canonical**

```
media/beefont/segments/<sid>/<TOKEN>.png
```

### **3.3 Page Scans**

```
media/beefont/pages/<sid>/<TEMPLATE>_<page_index>_raw.png
media/beefont/pages/<sid>/<TEMPLATE>_<page_index>_processed.png
```

### **3.4 Builds**

```
media/beefont/builds/<FONT>.ttf
media/beefont/builds/<sid>_bundle.zip
```

---

## **4. Template System**

### **4.1 Template JSON Format**

Example (`A4_DE_6x5.json`):

```json
{
  "paper": {
    "name": "A4",
    "width_mm": 210,
    "height_mm": 297,
    "dpi": 300
  },
  "mapping_file": "mapping/mapping_DE.json",
  "pages": [
    {
      "name": "A4_DE_6x5_1",
      "grid": { ... },
      "fiducials": { ... },
      "order_file": "order/order_DE_A4_6x5_1.json"
    },
    { "name": "A4_DE_6x5_2", ... },
    { "name": "A4_DE_6x5_3", ... }
  ]
}
```

Each page references an **order file** defining letter positions.

---

## **5. Processing Workflow**

### **5.1 Job Creation**

1. User provides:

   * language
   * page format
   * desired character set

2. Backend:

   * selects the corresponding template
   * creates one `TemplateSlot` per required page (`page_index = 0`)

---

### **5.2 Scanning & Analysis**

On scan upload:

1. Save raw image

2. Preprocess (threshold, fiducials, warp)

3. Segment grid

4. For each cell:

   * determine expected token from order file
   * detect ink
   * if ink: write variant file
     `TOKEN_pageindex.png`

5. Set TemplateSlot → `ANALYZED` or `ERROR`

User may retry:

* increment `page_index`
* create a new TemplateSlot entry for the same `template_code`
* generate new variant files

---

### **5.3 Glyph Variant Selection**

The system discovers variants via glob:

```
segment/<sid>/<TOKEN>_*.png
```

User interface displays all variants.

Selecting one:

* Copy chosen variant to canonical:

```
TOKEN_X.png  →  TOKEN.png
```

Once all required letters have canonical files, job → `READY_FOR_FONT`.

---

### **5.4 Font Construction**

Builder uses **only canonical** PNGs.

Steps:

1. Convert canonical PNG → SVG using ImageMagick + potrace
2. Generate a FontForge script
3. Import SVG outlines and set widths
4. Write final `.ttf`
5. Create ZIP bundle containing:

   * TTF file
   * mapping JSON
   * canonical glyphs

Job → `FONT_GENERATED`.

---

## **6. Retention & Cleanup Strategy**

Two possible modes:

### **6.1 Balanced Cleanup (recommended)**

Retain:

* canonical glyphs
* final TTF
* ZIP bundle

Purge after 30–90 days:

* raw/processed scans
* variant PNGs
* intermediate SVGs

### **6.2 Aggressive Cleanup**

After user approves variants:

* delete all variant PNGs except canonical
  After TTF is built:

* delete all scans

* keep only canonical + TTF

---

## **7. Error Handling**

### **7.1 TemplateSlot Errors**

* fiducials not found
* grid detection failed
* warped area invalid
* empty scan
* I/O errors

Stored in:

```
TemplateSlot.last_error_message
```

### **7.2 Job-Level Errors**

* missing canonical glyphs
* mapping file not found
* no SVG generated
* fontforge failure
* corrupt PNG

Logged to `job.log`.

---

## **8. Design Principles**

* Database stores **only jobs + template slots**.
* All glyph data is **filesystem-backed**.
* Variants discovered by **file globbing**.
* Canonical selection is explicit and user-driven.
* Language mapping is flexible (`mapping_<LANG>.json`).
* No hidden magic; everything is inspectable in `media/beefont`.

---
 