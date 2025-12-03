// src/components/SvgGlyphEditor/SvgGlyphEditor.tsx
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useGlyphs from '@hooks/useGlyphs';

import type { Glyph } from '@mytypes/glyph';
import {
  DEFAULT_SVG_CANVAS_WIDTH,
  DEFAULT_SVG_CANVAS_HEIGHT,
  DEFAULT_FONT_LINE_FACTORS,
  type Point,
  type Stroke,
  type StrokeGroup,
  type DrawMode,
  type FontLineFactors,
  type GlyphMetricProfile,
} from '@mytypes/glyphEditor';

import {
  serializeGlyphToSvg,
  type SvgViewBoxOverride,
  parseSvgToStrokes,
} from '@utils/svg/svgSerialization';
import {
  strokeCenter,
  pointInRect,
} from '@utils/svg/svgGeometry';
import {
  getGlyphMetric,
  computeGlyphBoxLayout,
  createCircleStrokes,
  createLetterSkeletonStrokes,
  getDefaultHorizontalBoxForLetter,
} from '@utils/svg/svgSkeleton';

import { expandSelectionWithGroups } from '@utils/svg/svgSelection';

import SvgGlyphCanvas from './SvgGlyphCanvas';
import SvgGlyphToolbar from './SvgGlyphToolbar';
import SvgGlyphGridControls from './SvgGlyphGridControls';
import SvgGlyphUploadPanel from './SvgGlyphUploadPanel';
import SvgGlyphCodePanel from './SvgGlyphCodePanel';
import SvgGlyphMetricsControls from './SvgGlyphMetricsControls';

export type SvgGlyphEditorProps = {
  sid: string;
  letter: string;
  variantIndex?: number;
  glyphId?: number;
};

const CANVAS_WIDTH = DEFAULT_SVG_CANVAS_WIDTH;
const CANVAS_HEIGHT = DEFAULT_SVG_CANVAS_HEIGHT;

type HorizontalMetrics = {
  left: number;
  right: number;
};

const SvgGlyphEditor: React.FC<SvgGlyphEditorProps> = ({
  sid,
  letter,
  variantIndex,
  glyphId,
}) => {
  // ---------------------------------------------------------------------------
  // Core stroke state + history
  // ---------------------------------------------------------------------------
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<StrokeGroup[]>([]);

  // Global grid (live) + draft values for the font lines
  const [fontLineFactors, setFontLineFactors] = useState<FontLineFactors>(
    DEFAULT_FONT_LINE_FACTORS,
  );
  const [draftFontLineFactors, setDraftFontLineFactors] =
    useState<FontLineFactors>(DEFAULT_FONT_LINE_FACTORS);

  // Drawing / interaction state
  const [pendingStart, setPendingStart] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [draggingCtrlForId, setDraggingCtrlForId] = useState<string | null>(
    null,
  );

  const [drawMode, setDrawMode] = useState<DrawMode>('stroke');

  // Dragging whole strokes (multi-select)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartRef = useRef<Point | null>(null);
  const dragInitialStrokesRef = useRef<Stroke[]>([]);

  // Horizontal metrics: per-letter override + draft UI values
  const trimmedLetter = letter.trim() || 'A';

  const [metrics, setMetrics] = useState<HorizontalMetrics>(() =>
    getDefaultHorizontalBoxForLetter(trimmedLetter, CANVAS_WIDTH),
  );
  const [draftMetrics, setDraftMetrics] = useState<HorizontalMetrics>(() =>
    getDefaultHorizontalBoxForLetter(trimmedLetter, CANVAS_WIDTH),
  );

  const [metricOverride, setMetricOverride] =
    useState<GlyphMetricProfile | null>(null);

  // Marquee selection
  const [selectionRectStart, setSelectionRectStart] =
    useState<Point | null>(null);
  const [selectionRectEnd, setSelectionRectEnd] =
    useState<Point | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // ---------------------------------------------------------------------------
  // Backend hook: SVG glyphs for this job + letter
  // ---------------------------------------------------------------------------
  const {
    glyphs,
    fetchGlyphs,
    uploadGlyphFromEditor,
    replaceGlyphFromEditor,
    isUpdating: isUploadingGlyph,
  } = useGlyphs(sid, {
    manual: true,
    initialLetter: letter,
    formattype: 'svg',
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const clearTransientState = () => {
    setPendingStart(null);
    setPreviewPoint(null);
    setDraggingCtrlForId(null);
    setIsDraggingSelection(false);
    dragStartRef.current = null;
    dragInitialStrokesRef.current = [];
    setSelectionRectStart(null);
    setSelectionRectEnd(null);
  };

  const resetEditorToEmpty = () => {
    setStrokes([]);
    setHistory([]);
    setRedoStack([]);
    setSelectedIds([]);
    setGroups([]);
    clearTransientState();
  };

  const updateStrokes = (updater: (prev: Stroke[]) => Stroke[]) => {
    setStrokes(prev => {
      setHistory(h => [...h, prev]);
      setRedoStack([]); // new branch, discard redo history
      return updater(prev);
    });
  };

  // Grid draft handlers
  const handleDraftLinesChange = (key: keyof FontLineFactors, value: number) => {
    setDraftFontLineFactors(prev => ({ ...prev, [key]: value }));
  };

  const applyGrid = () => {
    setFontLineFactors(draftFontLineFactors);
  };

  const resetGrid = () => {
    setFontLineFactors(DEFAULT_FONT_LINE_FACTORS);
    setDraftFontLineFactors(DEFAULT_FONT_LINE_FACTORS);
  };

  // ---------------------------------------------------------------------------
  // Metrics: (re)init when letter changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const defaults = getDefaultHorizontalBoxForLetter(
      trimmedLetter,
      CANVAS_WIDTH,
    );
    setMetrics(defaults);
    setDraftMetrics(defaults);

    const advance = (defaults.right - defaults.left) / CANVAS_WIDTH;
    const lsb = defaults.left / CANVAS_WIDTH;

    setMetricOverride({
      letter: trimmedLetter,
      advanceWidthFactor: advance,
      leftSideBearingFactor: lsb,
    });
  }, [trimmedLetter]);

  const applyMetrics = () => {
    // Clamp draft metrics and push into live + override
    const left = Math.max(0, Math.min(CANVAS_WIDTH, draftMetrics.left));
    const right = Math.max(left + 1, Math.min(CANVAS_WIDTH, draftMetrics.right));

    const next: HorizontalMetrics = { left, right };
    setMetrics(next);
    setDraftMetrics(next);

    const advance = (right - left) / CANVAS_WIDTH;
    const lsb = left / CANVAS_WIDTH;

    setMetricOverride({
      letter: trimmedLetter,
      advanceWidthFactor: advance,
      leftSideBearingFactor: lsb,
    });
  };

  // ---------------------------------------------------------------------------
  // Geometry derived from letter + grid factors
  // ---------------------------------------------------------------------------
  const baseMetric = useMemo(
    () => getGlyphMetric(trimmedLetter),
    [trimmedLetter],
  );

  const effectiveMetric = useMemo(
    () => metricOverride ?? baseMetric,
    [metricOverride, baseMetric],
  );

  const layout = useMemo(
    () =>
      computeGlyphBoxLayout(
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        effectiveMetric,
        fontLineFactors,
      ),
    [effectiveMetric, fontLineFactors],
  );

  const {
    glyphXMin,
    glyphXMax,
    glyphWidth,
    baselineY,
    xHeightY,
    ascenderY,
    capHeightY,
    descenderY,
  } = layout;

  const majusculeY = capHeightY;
  const previewFontSize = (baselineY - capHeightY) * 1.1;

  const svgViewBoxOverride: SvgViewBoxOverride = {
    left: metrics.left,
    right: metrics.right,
  };

  const svgCode = useMemo(
    () =>
      serializeGlyphToSvg(
        strokes,
        trimmedLetter,
        svgViewBoxOverride,
      ),
    [strokes, trimmedLetter, svgViewBoxOverride.left, svgViewBoxOverride.right],
  );

  const hasSelection = selectedIds.length > 0;
  const canGroupSelection = selectedIds.length >= 2;
  const canUngroupSelection = groups.some(g =>
    g.strokeIds.some(id => selectedIds.includes(id)),
  );
  const canUndo = history.length > 0;
  const canRedo = redoStack.length > 0;
  const hasStrokes = strokes.length > 0;
  const anyMarquee = !!(selectionRectStart && selectionRectEnd);

  // ---------------------------------------------------------------------------
  // Insert default letter skeleton for current letter
  // ---------------------------------------------------------------------------
  const handleInsertDefaultLetter = () => {
    const baseWidth = 8;
    const skeleton = createLetterSkeletonStrokes(
      trimmedLetter,
      layout,
      baseWidth,
    );
    if (!skeleton.length) return;

    updateStrokes(prev => [...prev, ...skeleton]);
  };

  // ---------------------------------------------------------------------------
  // Toolbar helpers: clear, undo/redo, delete, width
  // ---------------------------------------------------------------------------

  const handleClearAll = () => {
    if (!strokes.length) return;
    updateStrokes(() => []);
    setSelectedIds([]);
    setGroups([]);
    clearTransientState();
  };

  const handleUndo = () => {
    setHistory(prevHistory => {
      if (!prevHistory.length) return prevHistory;

      const last = prevHistory[prevHistory.length - 1];

      setStrokes(current => {
        setRedoStack(r => [...r, current]);
        return last;
      });

      setSelectedIds([]);
      clearTransientState();

      return prevHistory.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack(prevRedo => {
      if (!prevRedo.length) return prevRedo;

      const last = prevRedo[prevRedo.length - 1];

      setStrokes(current => {
        setHistory(h => [...h, current]);
        return last;
      });

      setSelectedIds([]);
      clearTransientState();

      return prevRedo.slice(0, -1);
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.length) return;
    const idsToRemove = new Set(selectedIds);

    updateStrokes(prev => prev.filter(s => !idsToRemove.has(s.id)));

    // Drop deleted strokes from groups
    setGroups(prev =>
      prev
        .map(g => ({
          ...g,
          strokeIds: g.strokeIds.filter(id => !idsToRemove.has(id)),
        }))
        .filter(g => g.strokeIds.length > 0),
    );

    setSelectedIds([]);
    clearTransientState();
  };

  const adjustWidth = (delta: number) => {
    if (!selectedIds.length) return;
    updateStrokes(prev =>
      prev.map(s =>
        selectedIds.includes(s.id)
          ? {
              ...s,
              width: Math.max(1, Math.min(50, s.width + delta)),
            }
          : s,
      ),
    );
  };

  // ---------------------------------------------------------------------------
  // Mouse handlers for canvas
  // ---------------------------------------------------------------------------

  const handleCanvasMouseDown = (
    e: React.MouseEvent<SVGSVGElement>,
  ) => {
    if (drawMode !== 'select') return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const p: Point = { x, y };

    // Start marquee selection
    setSelectionRectStart(p);
    setSelectionRectEnd(p);
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawMode === 'select') return;
    if (draggingCtrlForId || isDraggingSelection) return;
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: Point = { x, y };

    // Two-click behaviour for stroke/circle
    if (!pendingStart) {
      setPendingStart(point);
      setPreviewPoint(null);
    } else {
      const start = pendingStart;

      if (drawMode === 'stroke') {
        updateStrokes(prev => [
          ...prev,
          {
            id: `stroke-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,
            p0: start,
            p1: point,
            width: 8,
          } as Stroke,
        ]);
      } else if (drawMode === 'circle') {
        const circleStrokes = createCircleStrokes(start, point, 8);
        if (circleStrokes.length) {
          updateStrokes(prev => [...prev, ...circleStrokes]);
        }
      }

      setPendingStart(null);
      setPreviewPoint(null);
    }
  };

  const handleCanvasMouseMove = (
    e: React.MouseEvent<SVGSVGElement>,
  ) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: Point = { x, y };

    if (drawMode === 'select' && selectionRectStart) {
      setSelectionRectEnd(point);
      return;
    }

    if (draggingCtrlForId) {
      // Dragging a control point: update ctrl of that stroke (with history)
      updateStrokes(prev =>
        prev.map(s =>
          s.id === draggingCtrlForId ? { ...s, ctrl: point } : s,
        ),
      );
      return;
    }

    if (isDraggingSelection && dragStartRef.current) {
      // Dragging selected strokes: no history on each move, only on mouse up
      const dx = point.x - dragStartRef.current.x;
      const dy = point.y - dragStartRef.current.y;

      const base = dragInitialStrokesRef.current;
      setStrokes(
        base.map(s => {
          if (!selectedIds.includes(s.id)) return s;
          const shifted: Stroke = {
            ...s,
            p0: { x: s.p0.x + dx, y: s.p0.y + dy },
            p1: { x: s.p1.x + dx, y: s.p1.y + dy },
          };
            if (s.ctrl) {
              shifted.ctrl = { x: s.ctrl.x + dx, y: s.ctrl.y + dy };
            }
            return shifted;
        }),
      );
      return;
    }

    if (pendingStart && (drawMode === 'stroke' || drawMode === 'circle')) {
      setPreviewPoint(point);
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingCtrlForId) {
      setDraggingCtrlForId(null);
    }

    if (drawMode === 'select' && selectionRectStart && selectionRectEnd) {
      const x1 = Math.min(selectionRectStart.x, selectionRectEnd.x);
      const x2 = Math.max(selectionRectStart.x, selectionRectEnd.x);
      const y1 = Math.min(selectionRectStart.y, selectionRectEnd.y);
      const y2 = Math.max(selectionRectStart.y, selectionRectEnd.y);

      const rect = { x1, x2, y1, y2 };

      const hitIds = strokes
        .filter(s => pointInRect(strokeCenter(s), rect))
        .map(s => s.id);

      if (hitIds.length) {
        setSelectedIds(prev => {
          const prevSet = new Set(prev);
          const nextSet = new Set(prevSet);

          for (const id of hitIds) {
            if (prevSet.has(id)) nextSet.delete(id);
            else nextSet.add(id);
          }

          const expanded = expandSelectionWithGroups(
            Array.from(nextSet),
            groups,
          );
          return expanded;
        });
      }

      setSelectionRectStart(null);
      setSelectionRectEnd(null);
    }

    if (isDraggingSelection) {
      // Finalize move as a single history step
      setHistory(h => [...h, dragInitialStrokesRef.current]);
      setRedoStack([]);
      setIsDraggingSelection(false);
      dragStartRef.current = null;
      dragInitialStrokesRef.current = [];
    }
  };

  const handleStrokeMouseDown = (
    e: React.MouseEvent<SVGPathElement | SVGLineElement, MouseEvent>,
    strokeId: string,
  ) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: Point = { x, y };

    setPendingStart(null);
    setPreviewPoint(null);

    setSelectedIds(prev => {
      const multi =
        e.shiftKey || e.ctrlKey || (e.metaKey ?? false);

      let next: string[];
      if (multi) {
        if (prev.includes(strokeId)) {
          const toRemove = expandSelectionWithGroups(
            [strokeId],
            groups,
          );
          next = prev.filter(id => !toRemove.includes(id));
        } else {
          next = expandSelectionWithGroups(
            [...prev, strokeId],
            groups,
          );
        }
      } else {
        if (prev.length === 1 && prev[0] === strokeId) {
          const toRemove = expandSelectionWithGroups(
            [strokeId],
            groups,
          );
          next = prev.filter(id => !toRemove.includes(id));
        } else {
          next = expandSelectionWithGroups([strokeId], groups);
        }
      }

      if (next.includes(strokeId)) {
        dragStartRef.current = point;
        dragInitialStrokesRef.current = strokes;
        setIsDraggingSelection(true);
      } else {
        dragStartRef.current = null;
        dragInitialStrokesRef.current = [];
        setIsDraggingSelection(false);
      }

      return next;
    });
  };

  const handleStrokeClick = (
    e: React.MouseEvent<SVGPathElement | SVGLineElement, MouseEvent>,
    strokeId: string,
  ) => {
    // Click: ensure stroke has a ctrl so it can be bent. Selection is handled in mouseDown.
    e.stopPropagation();
    setPendingStart(null);
    setPreviewPoint(null);

    updateStrokes(prev =>
      prev.map(s => {
        if (s.id !== strokeId) return s;
        if (s.ctrl) return s;
        // new control point at midpoint
        const mid: Point = {
          x: (s.p0.x + s.p1.x) / 2,
          y: (s.p0.y + s.p1.y) / 2,
        };
        return { ...s, ctrl: mid };
      }),
    );
  };

  const startDragControl = (
    e: React.MouseEvent<SVGCircleElement, MouseEvent>,
    strokeId: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIds(expandSelectionWithGroups([strokeId], groups));
    setDraggingCtrlForId(strokeId);
  };

  // ---------------------------------------------------------------------------
  // Group / ungroup
  // ---------------------------------------------------------------------------

  const handleGroupSelection = () => {
    const ids = Array.from(new Set(selectedIds));
    if (ids.length < 2) return;

    setGroups(prev => {
      // Remove these strokes from any existing groups
      const idsSet = new Set(ids);
      const cleaned = prev
        .map(g => ({
          ...g,
          strokeIds: g.strokeIds.filter(id => !idsSet.has(id)),
        }))
        .filter(g => g.strokeIds.length > 0);

      const newGroup: StrokeGroup = {
        id: `group-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
        strokeIds: ids,
      };

      return [...cleaned, newGroup];
    });

    // Re-expand selection with current groups
    setSelectedIds(expandSelectionWithGroups(selectedIds, groups));
  };

  const handleUngroupSelection = () => {
    if (!selectedIds.length || !groups.length) return;
    const selectedSet = new Set(selectedIds);

    setGroups(prev =>
      prev.filter(g => !g.strokeIds.some(id => selectedSet.has(id))),
    );
  };

  // ---------------------------------------------------------------------------
  // Upload to backend (uses current viewBoxOverride)
  // ---------------------------------------------------------------------------
  const handleUploadToBackend = async () => {
    const trimmed = letter.trim();
    if (!trimmed) return;
    if (!strokes.length) return;
    if (!sid) return;

    try {
      const svgBlob = new Blob(
        [serializeGlyphToSvg(strokes, trimmed, svgViewBoxOverride)],
        {
          type: 'image/svg+xml;charset=utf-8',
        },
      );

      if (glyphId != null) {
        // existing variant → replace
        await replaceGlyphFromEditor(glyphId, svgBlob);
      } else {
        // new variant
        await uploadGlyphFromEditor(trimmed, svgBlob);
      }
      // Optional: you could refetch here if you want list/UI to refresh elsewhere
      // await fetchGlyphs({ letter: trimmed });
    } catch (err) {
      console.error(
        '[SvgGlyphEditor] upload/replace glyph failed:',
        err,
      );
    }
  };

  // ---------------------------------------------------------------------------
  // Backend sync
  // ---------------------------------------------------------------------------

  // 1) fetch glyphs for this letter
  useEffect(() => {
    const trimmed = letter.trim();
    if (!sid || !trimmed) {
      resetEditorToEmpty();
      return;
    }

    fetchGlyphs({ letter: trimmed }).catch(err => {
      console.error('[SvgGlyphEditor] fetchGlyphs failed:', err);
      resetEditorToEmpty();
    });
  }, [sid, letter, fetchGlyphs]);

  // 2) pick the active glyph variant (glyphId → variantIndex → default → first)
  const activeGlyph: Glyph | null = useMemo(() => {
    if (!glyphs.length) return null;

    // constrain to this letter, just in case
    const forLetter = glyphs.filter(g => g.letter === trimmedLetter);
    if (!forLetter.length) return null;

    return (
      (glyphId != null
        ? forLetter.find(g => g.id === glyphId)
        : undefined) ??
      (typeof variantIndex === 'number'
        ? forLetter.find(g => g.variant_index === variantIndex)
        : undefined) ??
      forLetter.find(g => g.is_default) ??
      forLetter[0]
    );
  }, [glyphs, glyphId, variantIndex, trimmedLetter]);

  // 3) load SVG of active glyph and parse to strokes
  useEffect(() => {
    if (!sid || !trimmedLetter) {
      resetEditorToEmpty();
      return;
    }

    if (!activeGlyph || !activeGlyph.image_path) {
      // no existing glyph for this letter → start empty
      resetEditorToEmpty();
      return;
    }

    let url = activeGlyph.image_path;

    // make absolute path if needed
    if (!/^https?:\/\//i.test(url)) {
      if (!url.startsWith('/')) {
        url = `/media/${url}`;
      }
      // kill browser cache: always add dummy query param
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}cb=${Date.now()}`;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const svgText = await res.text();
        if (cancelled) return;

        if (!svgText.trim()) {
          resetEditorToEmpty();
          return;
        }

        const parsed = parseSvgToStrokes(svgText);
        setStrokes(parsed);
        setHistory([]);
        setRedoStack([]);
        setSelectedIds([]);
        setGroups([]);
        clearTransientState();
        // metrics bleiben wie gesetzt; SVG wird nur als Strokes übernommen
      } catch (err) {
        console.warn(
          '[SvgGlyphEditor] Failed to load existing SVG, starting empty:',
          err,
        );
        if (!cancelled) {
          resetEditorToEmpty();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sid, trimmedLetter, activeGlyph]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <section className="bf-panel">
      <h2>Canvas (SVG vector)</h2>
      <p className="bf-helptext">
        Five-line handwriting grid: capital height, ascender, x-height,
        baseline, descender. Draw strokes or circles, move and group them,
        or insert a default skeleton for the current letter as a starting
        point. The exported SVG only contains the strokes.
      </p>

      <div className="bf-glyph-editor__svg-layout">
        {/* Left / main column: canvas + controls */}
        <div className="bf-glyph-editor__svg-layout-main">
          <div className="bf-glyph-editor__canvas-wrapper bf-glyph-editor__canvas-wrapper--svg">
            <SvgGlyphCanvas
              svgRef={svgRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              strokes={strokes}
              selectedIds={selectedIds}
              pendingStart={pendingStart}
              previewPoint={previewPoint}
              selectionRectStart={selectionRectStart}
              selectionRectEnd={selectionRectEnd}
              anyMarquee={anyMarquee}
              drawMode={drawMode}
              glyphXMin={glyphXMin}
              glyphXMax={glyphXMax}
              glyphWidth={glyphWidth}
              majusculeY={majusculeY}
              ascenderY={ascenderY}
              xHeightY={xHeightY}
              baselineY={baselineY}
              descenderY={descenderY}
              previewLetter={trimmedLetter}
              previewFontSize={previewFontSize}
              onCanvasMouseDown={handleCanvasMouseDown}
              onCanvasClick={handleCanvasClick}
              onCanvasMouseMove={handleCanvasMouseMove}
              onCanvasMouseUp={handleCanvasMouseUp}
              onStrokeMouseDown={handleStrokeMouseDown}
              onStrokeClick={handleStrokeClick}
              onStartDragControl={startDragControl}
            />
          </div>

          {/* Toolbar: tools, width, grouping, history, delete, default letter */}
          <SvgGlyphToolbar
            drawMode={drawMode}
            onChangeDrawMode={setDrawMode}
            hasSelection={hasSelection}
            canGroupSelection={canGroupSelection}
            canUngroupSelection={canUngroupSelection}
            canUndo={canUndo}
            canRedo={canRedo}
            hasStrokes={hasStrokes}
            onThinner={() => adjustWidth(-1)}
            onThicker={() => adjustWidth(+1)}
            onGroup={handleGroupSelection}
            onUngroup={handleUngroupSelection}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDeleteSelected={handleDeleteSelected}
            onClearAll={handleClearAll}
            onInsertDefaultLetter={handleInsertDefaultLetter}
          />

          {/* Horizontal metrics: left / right (in canvas pixels) */}
          <SvgGlyphMetricsControls
            left={draftMetrics.left}
            right={draftMetrics.right}
            canvasWidth={CANVAS_WIDTH}
            onChangeLeft={value =>
              setDraftMetrics(prev => ({ ...prev, left: value }))
            }
            onChangeRight={value =>
              setDraftMetrics(prev => ({ ...prev, right: value }))
            }
            onApply={applyMetrics}
          />

          {/* Grid / handwriting line controls */}
          <SvgGlyphGridControls
            draftLineFactors={draftFontLineFactors}
            onChangeDraft={handleDraftLinesChange}
            onApplyGrid={applyGrid}
            onResetGrid={resetGrid}
          />

          {/* Upload button (SVG via useGlyphs hook) */}
          <SvgGlyphUploadPanel
            canUpload={
              !!strokes.length && !!letter.trim() && !!sid
            }
            isUploading={isUploadingGlyph}
            onUpload={handleUploadToBackend}
          />
        </div>

        {/* Right column: SVG code preview */}
        <SvgGlyphCodePanel svgCode={svgCode} />
      </div>
    </section>
  );
};

export default SvgGlyphEditor;
