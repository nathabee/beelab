 

## 1. What needs to be extracted from SvgGlyphEditor

Right now the file mixes:

1. Data model (Point, Stroke, StrokeGroup, DrawMode, line factors)
2. SVG serialization / parsing
3. Geometry / skeleton / circle helpers
4. Selection + grouping + history logic
5. Canvas drawing (the `<svg>` tree)
6. Toolbar + grid controls + upload button + SVG code panel
7. API integration via `useGlyphs`

We do not change the overall behaviour, just move pieces:

### 1.1 Move types and helpers to `src/utils/svg*`

These are pure functions and can get out of the component without touching behaviour.

**New util modules:**

1. `src/utils/svgSerialization.ts`

   * `serializeGlyphToSvg(strokes: Stroke[], letter: string): string`
   * `parseSvgToStrokes(svgContent: string): Stroke[]`

2. `src/utils/svgGeometry.ts`

   * `distance(a: Point, b: Point): number`
   * `midpoint(a: Point, b: Point): Point`
   * `strokeBoundingBox(s: Stroke)`
   * `strokeCenter(s: Stroke): Point`
   * `pointInRect(p: Point, rect: { x1; y1; x2; y2 })`

3. `src/utils/svgSkeleton.ts`

   * `getGlyphMetric(rawLetter: string): GlyphMetricProfile`
   * `mapSkeletonY(anchor: GlyphSkeletonAnchor, geom): number`
   * `createCircleStrokes(center, edgePoint, baseWidth): Stroke[]`
   * `createLetterSkeletonStrokes(glyphLetter, geom, baseWidth): Stroke[]`

4. `src/utils/svgSelection.ts`

   * `expandSelectionWithGroups(ids: string[], groups: StrokeGroup[]): string[]`

5. `src/utils/svgLines.ts`

   * `DEFAULT_LINE_FACTORS`
   * `LineFactorKey`, `LineFactors`

You can keep `Point`, `Stroke`, `StrokeGroup` in the component for now, or move them into a small `src/mytypes/svgEditor.ts` later. No urgent need.

After that, the component imports helpers like:

```ts
import {
  serializeGlyphToSvg,
  parseSvgToStrokes,
} from '@utils/svgSerialization';
import {
  strokeCenter,
  pointInRect,
} from '@utils/svgGeometry';
import {
  getGlyphMetric,
  createCircleStrokes,
  createLetterSkeletonStrokes,
} from '@utils/svgSkeleton';
import {
  DEFAULT_LINE_FACTORS,
  type LineFactorKey,
  type LineFactors,
} from '@utils/svgLines';
import { expandSelectionWithGroups } from '@utils/svgSelection';
```

All the inline helper functions disappear from `SvgGlyphEditor.tsx`.

---

## 2. Component decomposition

Inside `src/components`, we keep a **small cluster** around the editor, no new top-level folders.

### 2.1 `src/components/SvgGlyphEditor/SvgGlyphEditor.tsx` (container)

This remains the **only thing** other parts of the app import.

Responsibilities:

* Receives `sid`, `letter`, `variantIndex`.
* Uses `useGlyphs` to:

  * `fetchGlyphs` and pick the right variant.
  * `uploadGlyphFromEditor` on save.
* Holds the editor state:

  * `strokes`, `history`, `redoStack`
  * `selectedIds`, `groups`
  * `pendingStart`, `previewPoint`
  * `draggingCtrlForId`, selection rect, etc.
  * `drawMode`
  * `lineFactors`, `draftLineFactors`
* Computes the geometry (glyph box, baseline, majuscule, etc.).
* Renders layout and hands props to child components.

Child components (described below):

* `<SvgGlyphCanvas … />`
* `<SvgGlyphToolbar … />`
* `<SvgGlyphGridControls … />`
* `<SvgGlyphUploadPanel … />`
* `<SvgGlyphCodePanel … />`

All mouse handlers and button handlers can stay here for now; if you later want to move pointer logic into its own hook, you can, but it is not required for this step.

### 2.2 `src/components/SvgGlyphEditor/SvgGlyphCanvas.tsx`

Pure presentational component for the `<svg>` itself.

Props (example):

```ts
type SvgGlyphCanvasProps = {
  strokes: Stroke[];
  selectedIds: string[];
  pendingStart: Point | null;
  previewPoint: Point | null;

  // Selection rectangle
  selectionRectStart: Point | null;
  selectionRectEnd: Point | null;

  // Geometry
  glyphXMin: number;
  glyphXMax: number;
  glyphWidth: number;
  majusculeY: number;
  ascenderY: number;
  xHeightY: number;
  baselineY: number;
  descenderY: number;
  previewLetter: string;
  previewFontSize: number;

  drawMode: DrawMode;

  // Mouse handlers from parent
  onCanvasMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasMouseUp: () => void;
  onStrokeMouseDown: (
    e: React.MouseEvent<SVGPathElement | SVGLineElement>,
    strokeId: string,
  ) => void;
  onStrokeClick: (
    e: React.MouseEvent<SVGPathElement | SVGLineElement>,
    strokeId: string,
  ) => void;
  onStartDragControl: (
    e: React.MouseEvent<SVGCircleElement>,
    strokeId: string,
  ) => void;
};
```

Responsibilities:

* Draws:

  * background rect
  * guidelines
  * ink box
  * preview Arial letter
  * strokes (lines/paths)
  * control handles for selected strokes
  * preview stroke while drawing
  * selection rectangle
* Does no state updates itself, just calls callback props.

You keep `svgRef` in this component and expose it via `forwardRef` if needed, or keep `svgRef` in parent and pass it down. Either way is fine.

### 2.3 `src/components/SvgGlyphEditor/SvgGlyphToolbar.tsx`

The “Tool + stroke/group/history” panel.

Props (example):

```ts
type SvgGlyphToolbarProps = {
  drawMode: DrawMode;
  onChangeDrawMode: (mode: DrawMode) => void;

  hasSelection: boolean;
  canGroupSelection: boolean;
  canUngroupSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasStrokes: boolean;

  onThinner: () => void;
  onThicker: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
};
```

Moves all of this:

* Tool `<select>`
* Thinner / Thicker
* Group / Ungroup
* Undo / Redo
* Delete selected
* Clear all

out of the main file.

### 2.4 `src/components/SvgGlyphEditor/SvgGlyphGridControls.tsx`

The handwriting grid / line factors panel.

Props:

```ts
type SvgGlyphGridControlsProps = {
  draftLineFactors: LineFactors;
  onDraftChange: (key: LineFactorKey, value: number) => void;
  onApply: () => void;
  onReset: () => void;
};
```

It renders:

* The 4 number inputs (majuscule, ascender, x-height, descender).
* “Apply grid” button.
* “Reset grid” button.

Parent still holds the real `lineFactors` and `draftLineFactors` state, but this component handles the markup and `onChange` wiring.

### 2.5 `src/components/SvgGlyphEditor/SvgGlyphUploadPanel.tsx`

The bottom “Save glyph to backend” block.

Props:

```ts
type SvgGlyphUploadPanelProps = {
  canSave: boolean;
  isUploading: boolean;
  onSave: () => void;
};
```

Renders the button with text switch:

* “Save glyph to backend”
* “Saving…” (disabled)

### 2.6 `src/components/SvgGlyphEditor/SvgGlyphCodePanel.tsx`

The right-hand panel with `<pre>`.

Props:

```ts
type SvgGlyphCodePanelProps = {
  svgCode: string;
};
```

Renders:

* Title “SVG code”
* Help text
* `<pre><code>{svgCode}</code></pre>`

---

## 3. Minimal changes for GlyphVariantsGrid and DefaultGlyphGrid

These two components do not care how the SVG editor works internally. They just display glyph variants from the backend.

You only need to ensure they are importing the correct **backend `Glyph` interface**.

Right now you have:

```ts
import type { Glyph } from '@mytypes/glyphSkeletons';
```

After our split, `@mytypes/glyphSkeletons` holds skeletons and metrics, not backend glyphs. You have two options:

1. If you already have a backend `Glyph` interface somewhere (very likely), point the import to that real file, for example:

   ```ts
   import type { Glyph } from '@mytypes/glyph';  // if this file defines the API Glyph
   ```

   or

   ```ts
   import type { Glyph } from '@mytypes/glyphApi';  // whatever name you actually use
   ```

2. If the only place where the `Glyph` interface currently lives is in `glyphSkeletons.ts`, move that interface to a dedicated mytypes file (e.g. `src/mytypes/glyphApi.ts`) and then update both components to import from there.

The components themselves do not need structural changes. Their logic is fine:

* `GlyphVariantsGrid`:

  * Still takes a flat list of `Glyph` objects.
  * Groups them by `letter`.
  * Uses `glyph.image_path` via `buildMediaUrl`.
  * Keeps Edit/Delete/Default callbacks exactly as they are.

* `DefaultGlyphGrid`:

  * Filters `is_default`.
  * Sorts by `letter` + `variant_index`.
  * Displays one thumbnail per default glyph.

So the **only adaptation** is: import `Glyph` from the correct mytypes file that describes the backend glyph model, not from the new skeleton/metric file.

---

## 4. Summary: list of components to build

Inside `src/components/SvgGlyphEditor/`:

1. `SvgGlyphEditor.tsx` (container, keeps state + hooks + handlers)
2. `SvgGlyphCanvas.tsx` (drawing and mouse wiring)
3. `SvgGlyphToolbar.tsx` (tool + stroke/group/history controls)
4. `SvgGlyphGridControls.tsx` (majuscule/ascender/x-height/descender inputs)
5. `SvgGlyphUploadPanel.tsx` (save button)
6. `SvgGlyphCodePanel.tsx` (SVG preview text)

Inside `src/utils/`:

1. `svgSerialization.ts`
2. `svgGeometry.ts`
3. `svgSkeleton.ts`
4. `svgSelection.ts`
5. `svgLines.ts`

Existing components:

* `GlyphVariantsGrid.tsx`
* `DefaultGlyphGrid.tsx`
 