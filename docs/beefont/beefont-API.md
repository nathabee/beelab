# BeeFont V2 API Specification

Base path (suggested):
`/api/beefont/…`

Authentication:
Standard DRF auth (e.g. Bearer token). All endpoints assume an authenticated user unless explicitly noted.

---

## 1. Templates

### 1.1 List templates

**GET** `/api/beefont/templates`

Return the available template definitions (e.g. `A4_DE_6x5`).

**Response 200**

```json
[
  {
    "name": "A4_DE_6x5",
    "language": "DE",
    "page_format": "A4",
    "pages": [
      "A4_DE_6x5_1",
      "A4_DE_6x5_2",
      "A4_DE_6x5_3"
    ],
    "mapping_file": "mapping/mapping_DE.json",
    "paper": {
      "width_mm": 210,
      "height_mm": 297,
      "dpi": 300
    }
  }
]
```

Implementation detail: this is basically exposing the JSON documents under `BeeFontCore/services/templates/*.json` in a compact form.

---

### 1.2 Get printable template image

**GET** `/api/beefont/templates/{name}/image`

Return a **PNG** (or PDF) for printing a specific template page.

* `name` examples: `A4_DE_6x5_1`, `A4_DE_6x5_2` …

**Query parameters (optional)**

* `format` = `png` (default) | `pdf`

**Response 200**

* Content-Type: `image/png` or `application/pdf`
* Body: binary image of the template page with grid + fiducials.

**Errors**

* `404` if template page not found.

---

## 2. Jobs

A **Job** represents one font project.

### 2.1 Job list / create

**GET** `/api/beefont/jobs`

Lists jobs of the current user.

**Query parameters (optional)**

* `status` – filter by job status (e.g. `in_progress`, `font_generated`)
* `language` – e.g. `DE`
* `page_format` – e.g. `A4`

**Response 200**

```json
[
  {
    "sid": "c6fc5cc62cecfdb0",
    "family": "BeeHand_DE",
    "language": "DE",
    "page_format": "A4",
    "characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß",
    "status": "font_generated",
    "ttf_url": "/media/beefont/builds/BeeHandDE.ttf",
    "zip_url": "/media/beefont/builds/c6fc5cc62cecfdb0_bundle.zip",
    "created_at": "2025-11-16T11:23:06.997791Z",
    "updated_at": "2025-11-16T11:23:06.997802Z"
  }
]
```

Note: `ttf_url` / `zip_url` are derived from `ttf_path` / `zip_path`.

---

**POST** `/api/beefont/jobs`

Create a new font job based on a language, paper format, and character set.

**Request body**

```json
{
  "family": "BeeHand_DE",
  "language": "DE",
  "page_format": "A4",
  "characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß"
}
```

Rules:

* `language` drives which template + mapping file is used.
* `characters` defines which codepoints are required to be present in canonical glyphs before building the font.

**Response 201**

```json
{
  "sid": "c6fc5cc62cecfdb0",
  "family": "BeeHand_DE",
  "language": "DE",
  "page_format": "A4",
  "characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß",
  "status": "in_progress",
  "ttf_url": null,
  "zip_url": null,
  "segments_dir": "beefont/segments/c6fc5cc62cecfdb0",
  "created_at": "2025-11-16T11:23:06.997791Z",
  "updated_at": "2025-11-16T11:23:06.997802Z"
}
```

Side-effect: backend creates the initial `TemplateSlot` entries for this job according to the chosen template (e.g. 3 slots for `A4_DE_6x5_1/2/3` with `page_index=0` and `status=no_scan`).

---

### 2.2 Job detail / delete

**GET** `/api/beefont/jobs/{sid}`

**Response 200**

```json
{
  "sid": "c6fc5cc62cecfdb0",
  "family": "BeeHand_DE",
  "language": "DE",
  "page_format": "A4",
  "characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß",
  "status": "ready_for_font",
  "ttf_url": null,
  "zip_url": null,
  "segments_dir": "beefont/segments/c6fc5cc62cecfdb0",
  "log": "",
  "created_at": "2025-11-16T11:23:06.997791Z",
  "updated_at": "2025-11-16T11:25:10.002345Z"
}
```

Optionally you can embed `slots` here, but the core spec keeps them separate.

---

**DELETE** `/api/beefont/jobs/{sid}`

Delete or cancel a job.

Recommended semantics:

* If `status` is not `font_generated`, hard-delete job + slots + files.
* If `status == font_generated`, either:

  * soft-delete / mark `status=cancelled`, *or*
  * allow full deletion if you don’t need retention.

**Response 204** – job deleted.

---

### 2.3 Build TTF

**POST** `/api/beefont/jobs/{sid}/build-ttf`

Trigger font building. Requires:

* job status `ready_for_font`
* canonical PNGs for all required characters present (`segments/<sid>/<TOKEN>.png`)

**Request body**

Empty or:

```json
{}
```

**Successful Response 200**

```json
{
  "sid": "c6fc5cc62cecfdb0",
  "family": "BeeHand_DE",
  "language": "DE",
  "page_format": "A4",
  "characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß",
  "status": "font_generated",
  "ttf_url": "/media/beefont/builds/BeeHandDE.ttf",
  "zip_url": "/media/beefont/builds/c6fc5cc62cecfdb0_bundle.zip",
  "log": "OK glyphs: 30\n",
  "created_at": "2025-11-16T11:23:06.997791Z",
  "updated_at": "2025-11-16T11:26:12.112233Z"
}
```

**Errors**

* `400` if not all required glyphs are canonical.
* `409` if job not in `ready_for_font`.
* `500` if FontForge/conversion failed (details in `log`).

---

### 2.4 Download TTF

**GET** `/api/beefont/jobs/{sid}/download/ttf`

Returns the built TTF.

* Requires `status == font_generated`.

**Response 200**

* Content-Type: `font/ttf` (or `application/octet-stream`)
* Content-Disposition: `attachment; filename="BeeHand_DE.ttf"`

**Errors**

* `404` if TTF not found or job not in `font_generated`.

---

### 2.5 Download ZIP bundle

**GET** `/api/beefont/jobs/{sid}/download/zip`

Returns the ZIP bundle (TTF + mapping + canonical PNGs).

**Response 200**

* Content-Type: `application/zip`
* Content-Disposition: `attachment; filename="{sid}_bundle.zip"`

**Errors**

* `404` if bundle not found or job not in `font_generated`.

---

## 3. Template Slots (Per-Page Handling)

### 3.1 List slots for a job

**GET** `/api/beefont/jobs/{sid}/slots`

Returns all `TemplateSlot` entries for a job.

**Response 200**

```json
[
  {
    "id": 55,
    "template_code": "A4_DE_6x5_1",
    "page_index": 0,
    "status": "analyzed",
    "scan_original_url": "/media/beefont/pages/c6fc5cc62cecfdb0/A4_DE_6x5_1_0_raw.png",
    "scan_processed_url": "/media/beefont/pages/c6fc5cc62cecfdb0/A4_DE_6x5_1_0_processed.png",
    "last_error_message": "",
    "created_at": "2025-11-16T12:15:03.739976Z",
    "updated_at": "2025-11-16T12:15:03.739980Z"
  },
  {
    "id": 56,
    "template_code": "A4_DE_6x5_2",
    "page_index": 0,
    "status": "no_scan",
    "scan_original_url": null,
    "scan_processed_url": null,
    "last_error_message": ""
  }
]
```

---

### 3.2 Upload scan for slot

**POST** `/api/beefont/slots/{slot_id}/upload-scan`

Upload a scan image for a specific TemplateSlot.

**Request**

* Content-Type: `multipart/form-data`
* Field: `file` – the uploaded image (PNG/JPEG)

Example using `curl`:

```bash
curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@/path/scan_page1.png" \
  http://localhost:9001/api/beefont/slots/55/upload-scan
```

**Response 200**

```json
{
  "id": 55,
  "template_code": "A4_DE_6x5_1",
  "page_index": 0,
  "status": "uploaded",
  "scan_original_url": "/media/beefont/pages/c6fc5cc62cecfdb0/A4_DE_6x5_1_0_raw.png",
  "scan_processed_url": null,
  "last_error_message": ""
}
```

---

### 3.3 Analyse slot

**POST** `/api/beefont/slots/{slot_id}/analyse`

Run the full pipeline: masking, fiducials, warp, grid segmentation, variant extraction.

**Request body**

```json
{}
```

**Response 200 (success)**

```json
{
  "id": 55,
  "template_code": "A4_DE_6x5_1",
  "page_index": 0,
  "status": "analyzed",
  "scan_original_url": "/media/beefont/pages/c6fc5cc62cecfdb0/A4_DE_6x5_1_0_raw.png",
  "scan_processed_url": "/media/beefont/pages/c6fc5cc62cecfdb0/A4_DE_6x5_1_0_processed.png",
  "last_error_message": ""
}
```

Side-effect: variant PNGs are created in
`media/beefont/segments/<sid>/<TOKEN>_<page_index>.png`
for every filled cell.

**Response 200 (failure)**

```json
{
  "id": 55,
  "template_code": "A4_DE_6x5_1",
  "page_index": 0,
  "status": "error",
  "scan_original_url": "/media/beefont/pages/c6fc5cc62cecfdb0/A4_DE_6x5_1_0_raw.png",
  "scan_processed_url": null,
  "last_error_message": "FIDUCIALS_NOT_FOUND"
}
```

---

### 3.4 Retry slot

**POST** `/api/beefont/slots/{slot_id}/retry`

User wants to redo this template sheet.
The system creates a new `TemplateSlot` with `page_index = old_index + 1`.

**Request body**

```json
{}
```

**Response 201**

```json
{
  "id": 57,
  "template_code": "A4_DE_6x5_1",
  "page_index": 1,
  "status": "no_scan",
  "scan_original_url": null,
  "scan_processed_url": null,
  "last_error_message": ""
}
```

The old slot (page_index=0) remains for reference; new scans go to the new slot.

---

## 4. Glyphs (Variants and Selection)

This part is based on filesystem inspection of `segments/<sid>`.

### 4.1 List glyphs for a job

**GET** `/api/beefont/jobs/{sid}/glyphs`

Return, for each logical token, canonical status and list of variants.

* `token` matches mapping token (e.g. `A`, `B`, `adieresis`, `germandbls`).
* `character` is the actual Unicode character (`"A"`, `"ä"`, `"ß"`), if available from mapping.

**Response 200**

```json
{
  "sid": "c6fc5cc62cecfdb0",
  "family": "BeeHand_DE",
  "characters": "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß",
  "glyphs": [
    {
      "token": "A",
      "character": "A",
      "canonical": {
        "exists": true,
        "url": "/media/beefont/segments/c6fc5cc62cecfdb0/A.png"
      },
      "variants": [
        {
          "page_index": 0,
          "filename": "A_0.png",
          "url": "/media/beefont/segments/c6fc5cc62cecfdb0/A_0.png",
          "slot_template_code": "A4_DE_6x5_1"
        },
        {
          "page_index": 2,
          "filename": "A_2.png",
          "url": "/media/beefont/segments/c6fc5cc62cecfdb0/A_2.png",
          "slot_template_code": "A4_DE_6x5_3"
        }
      ]
    },
    {
      "token": "adieresis",
      "character": "ä",
      "canonical": {
        "exists": false,
        "url": null
      },
      "variants": [
        {
          "page_index": 1,
          "filename": "adieresis_1.png",
          "url": "/media/beefont/segments/c6fc5cc62cecfdb0/adieresis_1.png",
          "slot_template_code": "A4_DE_6x5_2"
        }
      ]
    }
  ]
}
```

---

### 4.2 Glyph detail

**GET** `/api/beefont/jobs/{sid}/glyphs/{token}`

Return details for a single token (e.g. `A`, `adieresis`, `germandbls`).

**Response 200**

```json
{
  "sid": "c6fc5cc62cecfdb0",
  "token": "adieresis",
  "character": "ä",
  "canonical": {
    "exists": false,
    "url": null
  },
  "variants": [
    {
      "page_index": 1,
      "filename": "adieresis_1.png",
      "url": "/media/beefont/segments/c6fc5cc62cecfdb0/adieresis_1.png",
      "slot_template_code": "A4_DE_6x5_2"
    }
  ]
}
```

**Errors**

* `404` if job or token has no variants and no canonical glyph.

---

### 4.3 Select glyph variant (make canonical)

**POST** `/api/beefont/jobs/{sid}/glyphs/{token}/select`

Choose which variant becomes canonical.

**Request body**

```json
{
  "page_index": 2
}
```

Semantics:

* Backend checks file `segments/<sid>/<token>_<page_index>.png`.
* If exists, copy/overwrite to `segments/<sid>/<token>.png`.
* Optionally set job status to `ready_for_font` if all required tokens now have canonical glyphs.

**Response 200**

```json
{
  "sid": "c6fc5cc62cecfdb0",
  "token": "A",
  "character": "A",
  "canonical": {
    "exists": true,
    "url": "/media/beefont/segments/c6fc5cc62cecfdb0/A.png",
    "source_page_index": 2
  },
  "variants": [
    {
      "page_index": 0,
      "filename": "A_0.png",
      "url": "/media/beefont/segments/c6fc5cc62cecfdb0/A_0.png"
    },
    {
      "page_index": 2,
      "filename": "A_2.png",
      "url": "/media/beefont/segments/c6fc5cc62cecfdb0/A_2.png"
    }
  ]
}
```

**Errors**

* `400` if `page_index` is missing or invalid.
* `404` if the corresponding variant file does not exist.

---

## 5. Status Flow (Summary)

* **Job**

  * `draft` → job created, slots known, no scans.
  * `in_progress` → at least one scan uploaded / analyzed.
  * `ready_for_font` → all required tokens have canonical PNGs.
  * `font_generated` → TTF / ZIP built successfully.
  * `cancelled` → job explicitly cancelled/deleted.

* **TemplateSlot**

  * `no_scan` → created, waiting for scan.
  * `uploaded` → scan uploaded.
  * `analyzed` → grid segmentation + variants done.
  * `error` → analysis failed; error stored in `last_error_message`.
  * `approved` (optional) → if you later add a UI step to “approve page”.
  * `uploaded` / `analyzed` / `error` repeated on new `page_index` via `/retry`.

---
 