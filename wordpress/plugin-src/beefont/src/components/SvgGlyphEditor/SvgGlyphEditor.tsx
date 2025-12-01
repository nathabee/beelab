'use client';

// src/components/SvgGlyphEditor/SvgGlyphEditor.tsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useGlyphs from '@hooks/useGlyphs';

import {
  type Point,
  type Stroke,
  type StrokeGroup,
  type LineFactors,
  type LineFactorKey,
  type DrawMode,
  DEFAULT_LINE_FACTORS,
  SVG_CANVAS_WIDTH,
  SVG_CANVAS_HEIGHT,
} from '@mytypes/glyphEditor';

import { serializeGlyphToSvg, parseSvgToStrokes } from '@utils/svg/svgSerialization';
import { strokeCenter, pointInRect } from '@utils/svg/svgGeometry';
import {
  getGlyphMetric,
  createCircleStrokes,
  createLetterSkeletonStrokes,
} from '@utils/svg/svgSkeleton';
import { expandSelectionWithGroups } from '@utils/svg/svgSelection';

import SvgGlyphCanvas from './SvgGlyphCanvas';
import SvgGlyphToolbar from './SvgGlyphToolbar';
import SvgGlyphGridControls from './SvgGlyphGridControls';
import SvgGlyphUploadPanel from './SvgGlyphUploadPanel';
import SvgGlyphCodePanel from './SvgGlyphCodePanel';

type SvgGlyphEditorProps = {
  sid: string;
  letter: string;
  variantIndex?: number;
};
import { scaleStrokes } from '@utils/svg/svgTransform';


const SvgGlyphEditor: React.FC<SvgGlyphEditorProps> = ({
  sid,
  letter,
  variantIndex,
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<StrokeGroup[]>([]);

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

  const [lineFactors, setLineFactors] = useState<LineFactors>(
    DEFAULT_LINE_FACTORS,
  );
  const [draftLineFactors, setDraftLineFactors] =
    useState<LineFactors>(DEFAULT_LINE_FACTORS);

  // Marquee selection
  const [selectionRectStart, setSelectionRectStart] =
    useState<Point | null>(null);
  const [selectionRectEnd, setSelectionRectEnd] =
    useState<Point | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const scaleSelection = (sx: number, sy: number) => {
    if (!selectedIds.length) return;
    updateStrokes(prev => scaleStrokes(prev, selectedIds, sx, sy));
  };

  // Hook for SVG glyphs
  const {
    glyphs,
    fetchGlyphs,
    uploadGlyphFromEditor,
    isUpdating: isUploadingGlyph,
  } = useGlyphs(sid, {
    manual: true,
    initialLetter: letter,
    formattype: 'svg',
  });

  const svgCode = useMemo(
    () => serializeGlyphToSvg(strokes, letter),
    [strokes, letter],
  );

  // ---------- helpers ----------

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

  // push current strokes into history, clear redo, then compute new strokes
  const updateStrokes = (updater: (prev: Stroke[]) => Stroke[]) => {
    setStrokes(prev => {
      setHistory(h => [...h, prev]);
      setRedoStack([]); // new branch, discard redo history
      return updater(prev);
    });
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

  const handleGroupSelection = () => {
    const ids = Array.from(new Set(selectedIds));
    if (ids.length < 2) return;

    setGroups(prev => {
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

      const nextGroups = [...cleaned, newGroup];

      // expand selection with the new grouping
      setSelectedIds(prevSel =>
        expandSelectionWithGroups(prevSel, nextGroups),
      );

      return nextGroups;
    });
  };

  const handleUngroupSelection = () => {
    if (!selectedIds.length || !groups.length) return;
    const selectedSet = new Set(selectedIds);

    setGroups(prev =>
      prev.filter(g => !g.strokeIds.some(id => selectedSet.has(id))),
    );
  };

  const handleUploadToBackend = async () => {
    const trimmedLetter = letter.trim();
    if (!trimmedLetter) return;
    if (!strokes.length) return;
    if (!sid) return;

    try {
      const svgBlob = new Blob([svgCode], {
        type: 'image/svg+xml;charset=utf-8',
      });
      await uploadGlyphFromEditor(trimmedLetter, svgBlob);
    } catch (err) {
      console.error(
        '[SvgGlyphEditor] uploadGlyphFromEditor failed:',
        err,
      );
    }
  };

  const handleDraftLineChange = (key: LineFactorKey, value: number) => {
    const clamped = Math.max(0, Math.min(1, value));

    setDraftLineFactors(prev => ({
      ...prev,
      [key]: clamped,
    }));
  };

  const applyLineFactors = () => {
    setLineFactors(draftLineFactors);
  };

  const resetLineFactors = () => {
    setLineFactors(DEFAULT_LINE_FACTORS);
    setDraftLineFactors(DEFAULT_LINE_FACTORS);
  };

  const handleInsertDefaultLetter = () => {
    const trimmedLetterLocal = letter.trim() || 'A';

    const geom = {
      glyphXMin,
      glyphXMax,
      majusculeY,
      ascenderY,
      xHeightY,
      baselineY,
      descenderY,
    };

    const skeleton = createLetterSkeletonStrokes(
      trimmedLetterLocal,
      geom,
      8,
    );
    if (!skeleton.length) return;

    const groupId = `letter-${trimmedLetterLocal}-${Date.now()}`;

    updateStrokes(prev => {
      const withIds = skeleton.map(s => ({
        ...s,
        id: `stroke-letter-${groupId}-${Math.random()
          .toString(36)
          .slice(2, 7)}`,
      }));

      // Group anlegen
      setGroups(prevGroups => [
        ...prevGroups,
        {
          id: groupId,
          strokeIds: withIds.map(s => s.id),
        },
      ]);

      // direkt selektieren
      setSelectedIds(withIds.map(s => s.id));

      return [...prev, ...withIds];
    });

    clearTransientState();
  };


  // ---------- geometry based on current letter + lineFactors ----------

  const trimmedLetter = letter.trim() || 'A';
  const metric = getGlyphMetric(trimmedLetter);

  const glyphWidth = metric.widthFactor * SVG_CANVAS_WIDTH;
  const leftBearing = metric.leftBearingFactor * SVG_CANVAS_WIDTH;
  const glyphXMin = leftBearing;
  const glyphXMax = leftBearing + glyphWidth;

  const marginTop = SVG_CANVAS_HEIGHT * 0.10;
  const marginBottom = SVG_CANVAS_HEIGHT * 0.10;
  const baselineY = SVG_CANVAS_HEIGHT - marginBottom;
  const mainBand = baselineY - marginTop;

  const xHeightY = baselineY - mainBand * lineFactors.xHeight;
  const ascenderY = baselineY - mainBand * lineFactors.ascender;
  const majusculeY = baselineY - mainBand * lineFactors.majuscule;
  const descenderY = baselineY + mainBand * lineFactors.descender;

  // Arial preview: scale so that a capital roughly fills from majuscule→baseline
  const previewFontSize = (baselineY - majusculeY) * 1.1;

  const hasSelection = selectedIds.length > 0;
  const hasGroupForSelection = groups.some(g =>
    g.strokeIds.some(id => selectedIds.includes(id)),
  );
  const anyMarquee = selectionRectStart && selectionRectEnd;

  // ---------- canvas mouse handlers ----------

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
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
    // In select mode, clicks are handled via drag/mouseup for rectangle; ignore simple click
    if (drawMode === 'select') return;
    if (draggingCtrlForId || isDraggingSelection) return; // ignore clicks while dragging

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: Point = { x, y };

    const geom = {
      glyphXMin,
      glyphXMax,
      majusculeY,
      ascenderY,
      xHeightY,
      baselineY,
      descenderY,
    };

    // Letter mode: insert skeleton in canonical position, ignore click position
    /*
    if (drawMode === 'letter') {
      const skeleton = createLetterSkeletonStrokes(
        trimmedLetter,
        geom,
        8,
      );

      if (skeleton.length) {
        updateStrokes(prev => [...prev, ...skeleton]);
      }

      setPendingStart(null);
      setPreviewPoint(null);
      return;
    }
    */

    // Stroke / circle mode: two-click behaviour
    if (!pendingStart) {
      // First click: set start point, keep selection as-is
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
          },
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

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
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

          return expandSelectionWithGroups(Array.from(nextSet), groups);
        });
      }

      setSelectionRectStart(null);
      setSelectionRectEnd(null);
    }

    if (isDraggingSelection) {
      // Finalize move as a single history step
      setHistory(h => [...h, dragInitialStrokesRef.current]);
      setRedoStack([]); // moving selection starts a new branch
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
          // toggle off + whole group off
          const toRemove = expandSelectionWithGroups(
            [strokeId],
            groups,
          );
          next = prev.filter(id => !toRemove.includes(id));
        } else {
          // add + whole group on
          next = expandSelectionWithGroups(
            [...prev, strokeId],
            groups,
          );
        }
      } else {
        if (prev.length === 1 && prev[0] === strokeId) {
          // Click on already-selected stroke without modifiers → deselect (group as well)
          const toRemove = expandSelectionWithGroups(
            [strokeId],
            groups,
          );
          next = prev.filter(id => !toRemove.includes(id));
        } else {
          // Select this stroke (and its group) exclusively
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
        return {
          ...s,
          ctrl: {
            x: (s.p0.x + s.p1.x) / 2,
            y: (s.p0.y + s.p1.y) / 2,
          },
        };
      }),
    );
  };


  const startDragControl = (
    e: React.MouseEvent<SVGCircleElement, MouseEvent>,
    strokeId: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIds(prev =>
      expandSelectionWithGroups([strokeId], groups),
    );
    setDraggingCtrlForId(strokeId);
  };

  // ---------- backend integration ----------

  // 1) Whenever sid/letter changes, fetch SVG glyph meta for that letter
  useEffect(() => {
    const trimmedLetterLocal = letter.trim();
    if (!sid || !trimmedLetterLocal) {
      resetEditorToEmpty();
      return;
    }

    fetchGlyphs({ letter: trimmedLetterLocal }).catch(err => {
      console.error('[SvgGlyphEditor] fetchGlyphs failed:', err);
      resetEditorToEmpty();
    });
  }, [sid, letter, fetchGlyphs]);

  // 2) Whenever glyphs change, try to load the default SVG for this letter
  useEffect(() => {
    const trimmedLetterLocal = letter.trim();
    if (!sid || !trimmedLetterLocal) {
      resetEditorToEmpty();
      return;
    }

    const glyphsForLetter = glyphs.filter(
      g => g.letter === trimmedLetterLocal,
    );
    if (!glyphsForLetter.length) {
      resetEditorToEmpty();
      return;
    }

    const requested =
      typeof variantIndex === 'number'
        ? glyphsForLetter.find(
          g => g.variant_index === variantIndex,
        )
        : undefined;

    const svgGlyph =
      requested ??
      glyphsForLetter.find(g => g.is_default) ??
      glyphsForLetter[0];

    if (!svgGlyph || !svgGlyph.image_path) {
      resetEditorToEmpty();
      return;
    }

    let url = svgGlyph.image_path;

    // Heuristic: if it's a relative media path, prefix /media/
    if (!/^https?:\/\//i.test(url)) {
      if (!url.startsWith('/')) {
        url = `/media/${url}`;
      }
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
  }, [glyphs, sid, letter, variantIndex]);

  // ---------- render ----------

  return (
    <section className="bf-panel">
      <h2>Canvas (SVG vector)</h2>
      <p className="bf-helptext">
        Five-line handwriting grid: majuscule, ascender, x-height, baseline,
        descender. Choose a tool: stroke for manual lines, circle for round
        shapes, letter skeleton to drop a constructed base for the current
        letter, or selection rectangle. New objects are easy to select,
        group and move as a block. Undo/Redo steps backwards and forwards.
      </p>

      <div className="bf-glyph-editor__svg-layout">
        {/* Left / top: canvas + tools */}
        <div className="bf-glyph-editor__svg-layout-main">
          <div className="bf-glyph-editor__canvas-wrapper bf-glyph-editor__canvas-wrapper--svg">
            <SvgGlyphCanvas
              svgRef={svgRef}
              width={SVG_CANVAS_WIDTH}
              height={SVG_CANVAS_HEIGHT}
              strokes={strokes}
              selectedIds={selectedIds}
              pendingStart={pendingStart}
              previewPoint={previewPoint}
              selectionRectStart={selectionRectStart}
              selectionRectEnd={selectionRectEnd}
              anyMarquee={!!anyMarquee}
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

          <SvgGlyphToolbar
            drawMode={drawMode}
            onChangeDrawMode={mode => setDrawMode(mode)}
            hasSelection={hasSelection}
            canGroupSelection={selectedIds.length >= 2}
            canUngroupSelection={hasGroupForSelection}
            canUndo={history.length > 0}
            canRedo={redoStack.length > 0}
            hasStrokes={strokes.length > 0}
            onThinner={() => adjustWidth(-1)}
            onThicker={() => adjustWidth(+1)}
            onGroup={handleGroupSelection}
            onUngroup={handleUngroupSelection}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onDeleteSelected={handleDeleteSelected}
            onClearAll={handleClearAll}
            onInsertDefaultLetter={handleInsertDefaultLetter}
            onScaleWider={() => scaleSelection(1.1, 1.0)}
            onScaleNarrower={() => scaleSelection(0.9, 1.0)}
            onScaleTaller={() => scaleSelection(1.0, 1.1)}
            onScaleShorter={() => scaleSelection(1.0, 0.9)}
            onScaleBigger={() => scaleSelection(1.1, 1.1)}
            onScaleSmaller={() => scaleSelection(0.9, 0.9)}
          />


          <SvgGlyphGridControls
            draftLineFactors={draftLineFactors}
            onDraftChange={handleDraftLineChange}
            onApply={applyLineFactors}
            onReset={resetLineFactors}
          />

          <SvgGlyphUploadPanel
            isUploading={isUploadingGlyph}
            canUpload={
              strokes.length > 0 &&
              !!letter.trim() &&
              !!sid &&
              !isUploadingGlyph
            }
            onUpload={handleUploadToBackend}
          />
        </div>

        {/* Right / bottom: SVG code */}
        <SvgGlyphCodePanel svgCode={svgCode} />
      </div>
    </section>
  );
};

export default SvgGlyphEditor;
