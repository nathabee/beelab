# BeeFont API (WP ↔ Django)

## Overview

The **BeeFontCore** service exposes REST endpoints that allow a WordPress plugin (or any client) to:

1. Discover available handwriting templates by language
2. Retrieve **blank** or **prefilled** template grids (PNG images)
3. Upload a scanned sheet or photo to generate a TTF font
4. Poll and download the generated font artifacts
5. Optionally manage (list / delete) previous jobs

The workflow for the WP plugin is:

> Discover templates → Render blank/prefill → Upload scan → Poll → Preview → Download font → Clean up

---

## Templates API

### 1. List templates by language

```
GET /api/beefont/templates?lang=DE
```

**Purpose:**
Return all templates for a given language (DE, EN, FR, etc.).
Each template defines a paper size, grid, and file references for its glyph order and mapping.

**Response Example:**

```json
{
  "lang": "DE",
  "templates": [
    {
      "name": "A4_DE_8x10",
      "paper": {"width_mm":210, "height_mm":297},
      "grid": {"rows":8, "cols":10, "margin_mm":15, "gap_mm":5},
      "order_len": 80,
      "order_file": "order/order_DE_8x10.json",
      "mapping_file": "mapping/mapping_DE.json"
    }
  ]
}
```

---

### 2. Get a template image (blank or prefilled)

```
GET /api/beefont/templates/{name}/image?mode=blank|prefill
```

**Parameters**

* `mode=blank` → grid only, with faint cell indices and four fiducial markers (used for alignment)
* `mode=prefill` → grid with light-gray example glyphs, same markers included

**Response**

* Content-Type: `image/png`
* Direct PNG binary (no JSON wrapper)

**Example:**

```
GET /api/beefont/templates/A4_DE_8x10/image?mode=prefill
```

Produces a printable handwriting sheet.

---

## Jobs API

### 3. Create a font generation job

```
POST /api/beefont/jobs
  -F image=@scan.png|jpg
  -F family=BeeHand_DE
  -F template_name=A4_DE_8x10
```

**Purpose:**
Upload a scanned sheet or phone photo; the server segments glyphs, builds a font, and packages the results.

**Auth:**
Requires Bearer token (JWT demo token or user token).

**Response Example:**

```json
{
  "sid": "f5d8d75cf3ee",
  "status": "done",
  "family": "BeeHand_DE",
  "ttf_path": "/media/beefont/builds/BeeHand_DE.ttf",
  "zip_path": "/media/beefont/builds/f5d8d75cf3ee_bundle.zip",
  "log": ""
}
```

**Status values:**

* `queued` – waiting to process
* `processing` – segmenting / building font
* `done` – completed successfully
* `failed` – error during processing (check `log`)

---

### 4. Poll a job status

```
GET /api/beefont/jobs/{sid}
```

**Purpose:**
Check if a previously submitted job is finished and retrieve output paths.

**Response Example:**

```json
{
  "sid": "f5d8d75cf3ee",
  "status": "done",
  "family": "BeeHand_DE",
  "ttf_path": "/media/beefont/builds/BeeHand_DE.ttf",
  "zip_path": "/media/beefont/builds/f5d8d75cf3ee_bundle.zip",
  "log": ""
}
```

---

### 5. List jobs (for current user)

```
GET /api/beefont/jobs
```

**Purpose:**
Return recent jobs (default: last 50).
Useful for WP dashboard view.

**Response Example:**

```json
{
  "results": [
    {
      "sid": "f5d8d75cf3ee",
      "created_at": "2025-11-12T12:48:10Z",
      "status": "done",
      "family": "BeeHand_DE",
      "ttf_path": "/media/beefont/builds/BeeHand_DE.ttf",
      "zip_path": "/media/beefont/builds/f5d8d75cf3ee_bundle.zip"
    }
  ]
}
```

---

### 6. Download generated files

#### a) TTF font

```
GET /api/beefont/jobs/{sid}/download/ttf
```

Response headers:

```
Content-Type: font/ttf
Content-Disposition: attachment; filename="BeeHand_DE.ttf"
```

#### b) ZIP bundle

```
GET /api/beefont/jobs/{sid}/download/zip
```

Contains:

* `.ttf` font
* mapping.json
* sample PNG segments

Response headers:

```
Content-Type: application/zip
Content-Disposition: attachment; filename="BeeHand_DE_bundle.zip"
```

---

### 7. List segmented glyph images

```
GET /api/beefont/jobs/{sid}/segments
```

Returns a JSON list of glyph image filenames.

Example:

```json
{
  "segments": ["A.png", "B.png", "C.png", "a.png", "b.png", "c.png", ...]
}
```

Optionally, the parameter `?zip=1` could return a downloadable ZIP (planned).

---

### 8. Delete a job (optional cleanup)

```
DELETE /api/beefont/jobs/{sid}
```

Deletes the job and associated files (TTF, ZIP, segments).

Response:
`204 No Content`

---

## Example test commands

```bash
# 1. Get demo token
TOKEN=$(curl -sS -X POST http://localhost:9001/api/user/auth/demo/start/ \
  | python -c 'import sys,json;print(json.load(sys.stdin)["access"])')

# 2. List DE templates
curl -sS -H "Authorization: Bearer $TOKEN" \
  'http://localhost:9001/api/beefont/templates?lang=DE' | jq .

# 3. Download blank grid
curl -sS -o blank.png \
  'http://localhost:9001/api/beefont/templates/A4_DE_8x10/image?mode=blank'

# 4. Download prefilled grid
curl -sS -o prefill.png \
  'http://localhost:9001/api/beefont/templates/A4_DE_8x10/image?mode=prefill'

# 5. Create a job
curl -sS -H "Authorization: Bearer $TOKEN" \
  -F image=@django/media/beefont/uploads/grid_de.png \
  -F family="BeeHand_DE" \
  -F template_name="A4_DE_8x10" \
  http://localhost:9001/api/beefont/jobs | jq .

# 6. List my jobs
curl -sS -H "Authorization: Bearer $TOKEN" \
  http://localhost:9001/api/beefont/jobs | jq .

# 7. Poll job by ID
curl -sS -H "Authorization: Bearer $TOKEN" \
  http://localhost:9001/api/beefont/jobs/$SID | jq .

# 8. Download font
curl -L -o out.ttf \
  http://localhost:9001/api/beefont/jobs/$SID/download/ttf

# 9. List segments
curl -sS -H "Authorization: Bearer $TOKEN" \
  http://localhost:9001/api/beefont/jobs/$SID/segments | jq .

# 10. Delete job
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:9001/api/beefont/jobs/$SID
```

---

## Summary

| Category  | Endpoint                            | Method   | Description                                |                                 |
| --------- | ----------------------------------- | -------- | ------------------------------------------ | ------------------------------- |
| Templates | `/templates?lang=XX`                | GET      | List templates for a language              |                                 |
| Templates | `/templates/{name}/image?mode=blank | prefill` | GET                                        | Get blank or prefilled grid PNG |
| Jobs      | `/jobs`                             | POST     | Upload scan and create font generation job |                                 |
| Jobs      | `/jobs/{sid}`                       | GET      | Poll job status                            |                                 |
| Jobs      | `/jobs`                             | GET      | List recent jobs                           |                                 |
| Jobs      | `/jobs/{sid}/download/ttf`          | GET      | Download font                              |                                 |
| Jobs      | `/jobs/{sid}/download/zip`          | GET      | Download font + assets bundle              |                                 |
| Jobs      | `/jobs/{sid}/segments`              | GET      | List segmented glyph images                |                                 |
| Jobs      | `/jobs/{sid}`                       | DELETE   | Delete a job and files                     |                                 |

---

**Typical flow:**

1. `GET /templates?lang=DE` → find `A4_DE_8x10`
2. `GET /templates/A4_DE_8x10/image?mode=prefill` → print sheet
3. User fills sheet by hand and scans/photo uploads
4. `POST /jobs` → upload image
5. `GET /jobs/{sid}` → poll until `status=done`
6. `GET /jobs/{sid}/download/ttf` → retrieve font
7. (Optional) `GET /jobs/{sid}/segments` → preview glyphs
8. (Optional) `DELETE /jobs/{sid}` → cleanup

---

 