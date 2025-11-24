

# **BeeFont API  V3
  

# **Inhaltsverzeichnis**

1. [Grundprinzipien von V3](#grundprinzipien-von-v3)
2. [Authentication](#authentication)
3. [Templates](#templates)
4. [Languages](#languages)
5. [Jobs](#jobs)
6. [Job Pages](#job-pages)

   * (mit neuem High-Level Endpoint `POST /pages/create`)
7. [Glyphs](#glyphs)
8. [Font Builds](#font-builds)
9. [Language-Status](#language-status)
10. [ZIP-Download](#zip-download)

---

# **Grundprinzipien**

V3 ist ein vollständiger Neustart:

* Templates aus DB.
* Mehrsprachige Alphabete.
* Ein Job ist sprachneutral.
* Pro Job können beliebig viele Sprachen generiert werden.
* Eine JobPage enthält Raster+expected letters.
* Ein Scan erzeugt **Glyph-Varianten**.
* Pro Buchstabe existiert genau **eine Default-Variante**.
* Build erzeugt pro Sprache eine `.ttf`.

---

# **Authentication**

Alle Endpunkte sind authentifiziert.
Scope ist benutzerspezifisch.

---

# **Templates**

## **GET `/api/beefont/templates/`**

Listet alle TemplateDefinition-Einträge.

```json
[
  {
    "code": "A4_6x5",
    "description": "A4 grid 6x5",
    "page_format": "A4",
    "dpi": 300,
    "rows": 6,
    "cols": 5,
    "capacity": 30
  }
]
```

---

## **GET `/api/beefont/templates/<code>/image/`**

Rendert das Template als PNG (blank, blankpure, prefill… über Query-Parameter).

---

# **Languages**

## **GET `/api/beefont/languages/`**

Listet alle Sprachen.

---

## **GET `/api/beefont/languages/<code>/alphabet/`**

Alphabet für eine Sprache.

```json
{
  "code": "fr",
  "name": "Français",
  "alphabet": "ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÇ..."
}
```

---

# **Jobs**

## **GET `/api/beefont/jobs/`**

Listet alle Jobs des Nutzers.

---

## **POST `/api/beefont/jobs/`**

Erstellt einen neuen Job.

Body:

```json
{
  "name": "MyFont",
  "base_family": "BeeHand"
}
```

Response 201:

```json
{
  "sid": "72afeb45120349d4bd73c2f1de5c7d57",
  "name": "MyFont",
  "page_count": 0,
  "glyph_count": 0,
  "created_at": "..."
}
```

---

## **GET `/api/beefont/jobs/<sid>/`**

Job-Detail.

---

## **DELETE `/api/beefont/jobs/<sid>/`**

Löscht den gesamten Job.

---

# **Job Pages**

Eine Page = Template-Raster + erwartete Buchstaben + ein Scan.

## **GET `/api/beefont/jobs/<sid>/pages/`**

Listet alle Pages.

---

## **GET `/api/beefont/jobs/<sid>/pages/<page_id>/`**

Detail einer Page.

---

## **DELETE `/api/beefont/jobs/<sid>/pages/<page_id>/`**

Löscht Page + zugehörige Glyph-Varianten.

---
 

# **POST `/api/beefont/jobs/<sid>/pages/create/`**

Erstellt eine neue Seite **und** lädt das Scanbild hoch.
Optional führt die API die Analyse direkt durch.

Multipart-Form-Data Felder:

| Feld                       | Beschreibung                                     |
| -------------------------- | ------------------------------------------------ |
| `template_code` (required) | Code eines Templates, z.B. `"A4_6x5"`            |
| `letters` (optional)       | Reihenfolge der Buchstaben im Raster             |
| `file` (required)          | Scan als PNG/JPG                                 |
| `page_index` (optional)    | Wenn nicht gesetzt → Backend vergibt automatisch |
| `auto_analyse` (optional)  | `"true"` oder `"1"`: Analyse sofort ausführen    |

**Beispiel:**

```
POST /api/beefont/jobs/abcd1234/pages/create/
Content-Type: multipart/form-data

template_code = A4_6x5
letters = ABCDE...
file = <binary>
auto_analyse = true
```

**Response**

```json
{
  "page": {
    "id": 91,
    "page_index": 3,
    "template": { ... },
    "letters": "ABCDE",
    "scan_image_path": "/media/...png",
    "analysed_at": "2025-11-19T08:31:00"
  },
  "analysis": {
    "detail": "Analyse abgeschlossen.",
    "glyph_variants_created": 5
  }
}
```

---

## **Low-Level Endpunkte  **

 

### **POST `/api/beefont/jobs/<sid>/pages/<page_id>/analyse/`**

Manuelle Analyse.

### **POST `/api/beefont/jobs/<sid>/pages/<page_id>/retry-analysis/`**

Analyse überschreiben.

---

# **Glyphs**

## **GET `/api/beefont/jobs/<sid>/glyphs/`**

Alle Glyphs eines Jobs.

Option: `?letter=X`

---

## **GET `/api/beefont/jobs/<sid>/glyphs/<letter>/`**

Alle Varianten eines Buchstabens.

---

## **POST `/api/beefont/jobs/<sid>/glyphs/<letter>/select/`**

Setzt die Default-Variante.

Body:

```json
{ "glyph_id": 123 }
```

oder:

```json
{ "variant_index": 4 }
```

Response:

```json
{
  "status": "selected",
  "default_variant": 4
}
```

---

# **Font Builds**

## **POST `/api/beefont/jobs/<sid>/build-ttf/`**

Erstellt ein TTF für eine bestimmte Sprache.

Body:

```json
{ "language": "fr" }
```

---

## **GET `/api/beefont/jobs/<sid>/download/ttf/<language>/`**

TTF herunterladen.

---

# **Language-Status**

### **GET `/api/beefont/jobs/<sid>/languages/status/`**

Status aller Sprachen für diesen Job.

Beispiel:

```json
[
  {
    "language": "en",
    "ready": true,
    "missing_chars": "",
    "missing_count": 0
  },
  {
    "language": "fr",
    "ready": false,
    "missing_chars": "ÉÈÊ",
    "missing_count": 3
  }
]
```

---

### **GET `/api/beefont/jobs/<sid>/languages/<language>/status/`**

Status einer einzelnen Sprache.

---

# **ZIP-Download**

## **GET `/api/beefont/jobs/<sid>/download/zip/`**

ZIP enthält:

* alle gebauten `.ttf`
* alle Logs
* `build_info.json`

--- 