# BeeFont V3 – Overall Specification

Backend (Django `BeeFontCore`) and Frontend (WordPress plugin)

## 1. Purpose and Scope

BeeFont V3 turns hand-drawn characters into custom fonts (TTF), supporting:

* multiple languages (EN, DE, FR, …),
* scanned template sheets,
* and optionally glyphs drawn directly in a browser canvas.

The architecture consists of:

* a **Django backend** (`BeeFontCore`) that handles:

  * data model, REST API, image processing, font generation;
* a **WordPress plugin** frontend that provides:

  * the user interface,
  * authentication and error handling (via shared library),
  * and integration with the BeeFontCore API.

This specification defines responsibilities and interfaces of both sides, not low-level implementation details of algorithms.

---

## 2. Backend – BeeFontCore (Django)

### 2.1. Data Model (short overview)

Relevant models:

* `SupportedLanguage`

  * `code`: e.g. `de`, `en`, `fr`
  * `name`
  * `alphabet`: string containing all characters that should be supported for this language.

* `TemplateDefinition`

  * `code`: e.g. `A4_6x5`
  * `description`
  * `page_format` (e.g. `A4`)
  * `dpi`
  * `rows`, `cols`
  * derived property `capacity = rows * cols`

* `FontJob`

  * `sid`: stable job identifier
  * `user`: owner
  * `name`
  * `base_family`
  * `created_at`

* `JobPage`

  * `job` → `FontJob`
  * `page_index`: logical page number (0, 1, 2, …)
  * `template` → `TemplateDefinition`
  * `letters`: string of expected characters in raster order
  * `scan_image_path`: path to the uploaded scan
  * `analysed_at`, `created_at`

* `Glyph`

  * `job` → `FontJob`
  * `page` → `JobPage`
  * `cell_index`: index inside the template grid (0 … rows*cols-1)
  * `letter`: the corresponding character (Unicode)
  * `variant_index`: variant number per letter (e.g. `3` for “B_v3”)
  * `image_path`: path to the cropped glyph image
  * `is_default`: exactly one variant per `(job, letter)` should be `true`

* `FontBuild`

  * `job` → `FontJob`
  * `language` → `SupportedLanguage`
  * `created_at`
  * `ttf_path`
  * `log`
  * `success`

Languages and templates are initially provided via fixtures or management commands, but can later be managed via the Django admin.

---

### 2.2. REST API (overview)

The detailed endpoint list lives in `API.md`. The main groups:

1. **Templates**

   * `GET /api/beefont/templates`
   * `GET /api/beefont/templates/{code}/image`

2. **Languages**

   * `GET /api/beefont/languages`
   * `GET /api/beefont/languages/{code}/alphabet`

3. **Jobs**

   * `GET /api/beefont/jobs`
   * `POST /api/beefont/jobs`
   * `GET /api/beefont/jobs/{sid}`
   * `DELETE /api/beefont/jobs/{sid}`

4. **Job Pages (scan pages)**

   High-level (recommended):

   * `GET /api/beefont/jobs/{sid}/pages`
   * `GET /api/beefont/jobs/{sid}/pages/{page_id}`
   * `DELETE /api/beefont/jobs/{sid}/pages/{page_id}`
   * `POST /api/beefont/jobs/{sid}/pages/create`
     → create a `JobPage` + upload scan + optional auto-analysis in *one* call
   * `POST /api/beefont/jobs/{sid}/pages/{page_id}/analyse`
   * `POST /api/beefont/jobs/{sid}/pages/{page_id}/retry-analysis`

   The `pages/create` endpoint is the default entry point for UI workflows. The lower-level `upload-scan` + `analyse` split is kept only for debugging/special use cases.

5. **Glyphs**

   * `GET /api/beefont/jobs/{sid}/glyphs` (optional `?letter=X`)
   * `GET /api/beefont/jobs/{sid}/glyphs/{letter}`
   * `POST /api/beefont/jobs/{sid}/glyphs/{letter}/select`
   * (optional future extension:) `DELETE /api/beefont/jobs/{sid}/glyphs/{glyph_id}`

6. **Font Builds & Downloads**

   * `POST /api/beefont/jobs/{sid}/build-ttf`
   * `GET /api/beefont/jobs/{sid}/download/ttf/{language}`
   * `GET /api/beefont/jobs/{sid}/download/zip`

7. **Language Status**

   * `GET /api/beefont/jobs/{sid}/languages/status`
   * `GET /api/beefont/jobs/{sid}/languages/{language}/status`

All requests are user-scoped: a user only sees and manipulates their own jobs and resources.

---

### 2.3. File and Directory Layout

The backend stores everything under `MEDIA_ROOT/beefont/`.

Typical structure per job:

* `beefont/jobs/{sid}/pages/` – uploaded page scans (e.g. `page_0_scan.png`)
* `beefont/jobs/{sid}/debug/` – debug images per page (binarization, cell overlays, etc.)
* `beefont/jobs/{sid}/glyphs/` – cropped glyph images (e.g. `A_v0.png`, `B_v1.png`)
* `beefont/jobs/{sid}/build/` – generated `.ttf` files and possibly logs

The API returns only **relative** paths (`scan_image_path`, `image_path`, `ttf_path`); the frontend constructs absolute URLs based on the Django MEDIA configuration.

Templates (the base raster PNGs) are stored separately under a template folder, typically:

* `beefont/templates/{code}.png`
  served via `GET /templates/{code}/image`.

---

### 2.4. Languages and Completeness

For each `SupportedLanguage`, the field `alphabet` defines:

* the exact set of characters that must be covered by default glyphs for that language.

A job is **ready** for a language if:

* for every character in `alphabet`, there is at least one `Glyph` with `is_default=true`.

The endpoint:

* `GET /api/beefont/jobs/{sid}/languages/{language}/status`

returns:

* `ready: true/false`
* `required_chars`
* `missing_chars`
* `missing_count`

The build endpoint:

* `POST /api/beefont/jobs/{sid}/build-ttf`

with body:

```json
{ "language": "<code>" }
```

checks this status and:

* succeeds and writes a TTF if `ready == true`,
* returns HTTP 400 with a JSON payload (including `missing_chars`) if required glyphs are missing, so the frontend can show a precise message.

---

### 2.5. Page Creation and Analysis

The default workflow uses the combined endpoint:

#### `POST /api/beefont/jobs/{sid}/pages/create`

Multipart fields:

* `template_code` (required): template code, e.g. `A4_6x5`
* `letters` (optional): characters in raster order (row by row)
* `file` (required): PNG/JPEG scan
* `page_index` (optional): explicit logical page index; if omitted, the backend picks the next free index
* `auto_analyse` (optional): `"true"/"1"` to immediately run segmentation

Behaviour:

1. Create `JobPage` with `job`, `template`, `page_index`, `letters`.

2. Store the scan into `beefont/jobs/{sid}/pages/`.

3. If `auto_analyse=true`, run the segmentation service:

   * cut the page into cells using the template grid,
   * for each cell with a letter, create a `Glyph` with a new `variant_index`,
   * mark the first variant of a letter as default if no default exists yet,
   * write debug images.

4. Return both the serialized page and (if analysis ran) a small analysis result.

Example response:

```json
{
  "page": {
    "id": 42,
    "page_index": 0,
    "template": { "code": "A4_6x5", ... },
    "letters": "ABCDE...",
    "scan_image_path": "beefont/jobs/abcd1234/pages/page_0_scan.png",
    "analysed_at": "2025-11-19T11:30:00Z",
    "created_at": "2025-11-19T11:29:45Z"
  },
  "analysis": {
    "detail": "Analysis finished.",
    "glyph_variants_created": 30
  }
}
```

Low-level variants (`upload-scan`, `analyse`, `retry-analysis`) exist and can be used for debugging, but the UI should normally stick to `pages/create`.

---

### 2.6. Canvas Glyphs (1×1 Template Scenario)

The canvas feature in the frontend reuses the same backend concept:

* There is a template with a single cell, e.g. `A4_1x1` (`rows=1`, `cols=1`, `capacity=1`).

To create a glyph from a canvas drawing for a given job and letter `X`, the frontend does:

1. User opens the canvas for letter `X`.

2. After drawing, the frontend exports the canvas as PNG (using `toBlob` / `toDataURL`).

3. The frontend calls:

   `POST /api/beefont/jobs/{sid}/pages/create`

   with:

   * `template_code = "A4_1x1"`
   * `letters = "X"`
   * `file = <canvas PNG>`
   * `auto_analyse = true`

4. The backend creates a `JobPage`, stores the PNG as scan, and produces exactly one glyph variant for `X`.

5. From there, the glyph behaves like any other:

   * visible in `GET /glyphs` and `GET /glyphs/X`,
   * can be made default via `POST /glyphs/X/select`.

The user does not need to care whether a glyph came from a scanner or the canvas.

---

## 3. Frontend – WordPress Plugin

The frontend is a WordPress plugin located under `wordpress/plugin-src`. It:

* renders the BeeFont UI in the browser,
* uses a shared library for:

  * authentication (demo or real),
  * HTTP client,
  * standardized error handling.

---

### 3.0. **BeeFont Plugin – Simple Overall Overview**

The plugin has **one main interface** with a few clear sections.
The user follows them **from top to bottom**.

---

## **3.0.1. Job List (Start Screen)**

Purpose: show all your font projects.

The user can:

* create a new Job (e.g. “My Handwriting”)
* open an existing Job
* delete a Job

---

## **3.0.2. Job Detail Screen**

When the user opens a job, they see:

### **A. Languages**

Shows each supported language: EN, DE, FR etc.
For each language:

* is it **ready**?
* how many characters are **missing**?
* action: **Build TTF**, **Download TTF**

---

### **B. Pages**

Shows all template pages for this job.
Each page shows:

* page number
* template used
* letters on the page
* if the scan is uploaded
* if analysis was done

Actions:

* delete page
* re-analyse page

---

### **C. Add New Page (Core Action)**

This is the main workflow the user will use.
The UI shows a button like:

> **Add new template page**

When pressing it:

1. User selects a **template** (e.g. A4 6×5).
2. UI shows **alphabet selection** for a chosen language:

   * letters already done will be green
   * letters missing will be red
3. UI automatically groups letters into batches (max 30 per page).
4. User chooses:

   * `letters` for this page
   * uploads the **scan** (or a canvas PNG)
5. Plugin calls:

   * `POST /pages/create` with auto-analyse
6. Page appears immediately in the Page List.

---

## **3.0.3. Glyph Browser (optional but important)**

A section where the user can review all glyphs.

* list all glyphs
* click on a letter → see all variants
* select which variant is **default**
* this affects all languages that use this letter

---

## **3.0.4. Missing Characters Screen**

For each language (DE, FR, …):

* shows letters still required
* button “Create pages for missing characters”
* plugin prepares pages automatically
* user prints them, draws them, scans them
* plugin analyses them
* language becomes ready

---

## **3.0.5. Build and Download**

When a language is ready:

* “Build font (TTF)”
* “Download TTF”
* “Download ZIP (all languages)”

---

# **Overall Workflow, 7 Steps**

1. Create Job
2. Choose language and see alphabet
3. Add pages for needed letters
4. Print → draw → scan
5. Upload + auto-analyse
6. Review glyphs and choose variants
7. Build + download TTF
 
---
 
### 3.1. Architecture

* **WordPress integration**

  * Plugin registers an admin page and/or a frontend page (e.g. “BeeFont”).
  * The React/JS bundle is loaded via shortcode or admin page.

* **Shared library**

  * Handles authentication (e.g. demo token).
  * Provides an HTTP client with unified error handling.
  * Exposes reusable UI components (loaders, error banners, confirmation dialogs).

* **Backend communication**

  All BeeFont API calls go through dedicated client functions, e.g.:

  * `getTemplates()`, `getLanguages()`, `getLanguageAlphabet(code)`
  * `listJobs()`, `createJob()`, `getJob(sid)`, `deleteJob(sid)`
  * `listPages(sid)`, `createPageWithScan(sid, formData)`
  * `listGlyphs(sid, letter?)`, `selectGlyphDefault(sid, letter, payload)`
  * `getLanguageStatus(sid, language)`, `buildTtf(sid, language)`, `downloadTtfUrl(sid, language)`, `downloadZipUrl(sid)`

Errors from the backend are turned into structured error objects and rendered via shared UI components.

---

### 3.2. UI Sections / Screens

#### 3.2.1. Job Overview

* Shows the list of jobs:

  * `GET /jobs`
* Per job:

  * display `name`, `created_at`, `page_count`, `glyph_count`,
  * actions:

    * open job detail,
    * delete job (`DELETE /jobs/{sid}`),
    * open builds/downloads.

#### 3.2.2. Job Detail

Contains:

* Job metadata (`GET /jobs/{sid}`)
* Language status:

  * `GET /jobs/{sid}/languages/status`

Per language:

* show `ready`, `missing_count`, maybe `missing_chars` in a tooltip.
* actions:

  * “Build font for this language”
  * “Show missing characters” (if `ready=false`)

Also:

* “Pages” section:

  * list pages (`GET /jobs/{sid}/pages`)
  * per page: show `page_index`, letters, analysed flag, link to debug/glyphs
  * delete page (`DELETE /jobs/{sid}/pages/{page_id}`) if needed.

#### 3.2.3. Template + Alphabet setup

When the user wants to add new pages for a language:

* Load templates: `GET /templates`
* Load languages/alphabet: `GET /languages` and `GET /languages/{code}/alphabet`
* UI logic:

  * select language (e.g. EN, DE, FR),
  * display the alphabet, highlighting characters already covered (based on glyph defaults) vs missing characters,
  * split characters into batches by template capacity (e.g. 30 per page).

The plugin may offer a “print preview” using `GET /templates/{code}/image` combined with letter overlays.

#### 3.2.4. Printing Templates and Uploading Scans

* For each planned page:

  * show a preview with the correct letter order,
  * offer “Download/Print page”.

After the user has filled the page by hand and scanned it:

* Provide an upload form:

  * choose file,
  * choose language/template if needed,
  * the plugin calls `POST /jobs/{sid}/pages/create` with `file`, `template_code`, `letters`, and `auto_analyse=true`.

UI shows:

* upload progress,
* analysis result (number of glyphs created, possible errors).

#### 3.2.5. Analysis Retry

If segmentation fails or the user re-uploads a better scan:

* provide a “Re-analyse page” button:

  * `POST /jobs/{sid}/pages/{page_id}/retry-analysis`

or call `analyse` again if `retry` is not differentiated. The frontend warns that glyph variants may change.

#### 3.2.6. Glyph Browser & Selection

* Fetch all glyphs:

  * `GET /jobs/{sid}/glyphs`
* Filter by letter:

  * `GET /jobs/{sid}/glyphs/{letter}`

UI:

* show thumbnails of all variants per letter,
* highlight current default (`is_default=true`),
* allow the user to set a variant as default:

  * `POST /jobs/{sid}/glyphs/{letter}/select`

The plugin should handle the response and update the local state so only one variant is marked as default per letter.

If a glyph-delete endpoint is added later, the UI can expose “Delete variant” actions.

#### 3.2.7. “Missing characters” for a language

* Use:

  * `GET /jobs/{sid}/languages/{language}/status`

UI shows:

* completeness (ready vs missing characters),
* list of `missing_chars`.

Actions:

* “Create new pages for missing characters”:

  * the plugin constructs one or more batches of missing characters,
  * for each batch creates a page via `POST /jobs/{sid}/pages/create` with the chosen template and a file upload.

After those pages are scanned, uploaded and analysed, the UI re-checks the status and indicates when the language is ready.

#### 3.2.8. Font build and downloads

In the job detail screen:

* For each language:

  * “Build font”:

    * `POST /jobs/{sid}/build-ttf` with `{ "language": "<code>" }`
  * On success: show a link/button:

    * `GET /jobs/{sid}/download/ttf/{language}`

* Global:

  * “Download ZIP (all fonts)”:

    * `GET /jobs/{sid}/download/zip`

Any build error (especially missing glyphs) is shown using the shared error UI, including the list of missing characters if available.

---

### 3.3. Canvas Editor (draw glyphs in browser)

The canvas editor complements the scan workflow.

User flow:

1. User selects a job and a letter (e.g. “A”).

2. Canvas opens (mouse on desktop, touch on mobile).

3. User draws the character, can clear/reset/undo.

4. On “Save”:

   * the canvas is exported to PNG (Blob),
   * the plugin calls `POST /jobs/{sid}/pages/create` with:

     * `template_code = "A4_1x1"` (or any 1×1 template),
     * `letters = "A"`,
     * `file = <canvas PNG>`,
     * `auto_analyse = true`.

5. After analysis, the new variant for “A” appears in the glyph browser.

6. The user can then:

   * set it as default for “A”,
   * rebuild fonts for any language that uses this letter.

From the backend perspective this is just another page/scan with a 1×1 template.

---

### 3.4. Error handling and demo user management

The plugin uses the shared library already existing in your stack:

* **Demo user**

  * If no real authentication is configured, the plugin obtains a demo token/user and uses it for all BeeFont API calls.
  * The demo user sees only their own jobs, as enforced by the backend.

* **Error handling**

  * HTTP errors (4xx/5xx) are intercepted by the HTTP client,
  * parsed into structured error objects (`status`, `code`, `detail`, `fields`),
  * passed to UI components which render error banners, modals, or inline messages.

BeeFont-specific errors (e.g. “language not complete”, “analysis failed”, “template not found”) should be returned by the backend in a consistent JSON shape:

```json
{
  "code": "language_incomplete",
  "detail": "Language de is missing 4 characters: ÄÖÜß.",
  "missing_chars": "ÄÖÜß"
}
```

so the frontend can present clear, actionable messages.

---

## 4. Responsibility Summary

**Backend (BeeFontCore)**

* Owns data model and persistence for languages, templates, jobs, pages, glyphs, builds.
* Performs image processing and segmentation of scans.
* Enforces consistency:

  * exactly one default glyph per `(job, letter)`,
  * language completeness based on `alphabet`.
* Generates TTF fonts and ZIP bundles and serves them via download endpoints.

**Frontend (WordPress plugin)**

* Provides user workflows to:

  * create and manage jobs,
  * plan templates/pages per language,
  * print templates,
  * upload scans and trigger analysis,
  * browse glyphs and choose defaults,
  * inspect language status and missing characters,
  * trigger builds and download fonts.
* Integrates a canvas editor as an alternative glyph source.
* Handles authentication, demo mode, and error presentation via the shared library.
 
