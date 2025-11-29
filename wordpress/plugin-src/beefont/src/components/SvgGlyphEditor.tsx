// src/components/SvgGlyphEditor.tsx
'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useGlyphs from '@hooks/useGlyphs';

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  id: string;
  p0: Point;
  p1: Point;
  ctrl?: Point; // if present → quadratic Bezier, otherwise straight line
  width: number;
};

type SvgGlyphEditorProps = {
  sid: string;
  letter: string;
  variantIndex?: number;
};

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 600;

// Exported SVG: only the real strokes (lines or curves), no guides/preview/letter
function serializeGlyphToSvg(strokes: Stroke[], letter: string): string {
  void letter; // intentionally unused in output

  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;

  const elements = strokes
    .map(s => {
      const { p0, p1, ctrl, width } = s;
      if (ctrl) {
        // Quadratic Bezier: M p0 Q ctrl p1
        return `<path d="M ${p0.x.toFixed(2)} ${p0.y.toFixed(
          2,
        )} Q ${ctrl.x.toFixed(2)} ${ctrl.y.toFixed(
          2,
        )} ${p1.x.toFixed(2)} ${p1.y.toFixed(
          2,
        )}" stroke-width="${width}" />`;
      }
      // Straight line
      return `<line x1="${p0.x.toFixed(2)}" y1="${p0.y.toFixed(
        2,
      )}" x2="${p1.x.toFixed(2)}" y2="${p1.y.toFixed(
        2,
      )}" stroke-width="${width}" />`;
    })
    .join('\n    ');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 ${width} ${height}"
>
  <g stroke="black" stroke-linecap="round" stroke-linejoin="round" fill="none">
    ${elements}
  </g>
</svg>`;

  return svg;
}

// midpoint helper
function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Parse our own serialized SVG back into strokes.
// Assumes the same simple line / quadratic path format as serializeGlyphToSvg().
function parseSvgToStrokes(svgContent: string): Stroke[] {
  const strokes: Stroke[] = [];
  if (!svgContent) return strokes;

  const lineRegex =
    /<line[^>]*x1="([^"]+)"[^>]*y1="([^"]+)"[^>]*x2="([^"]+)"[^>]*y2="([^"]+)"[^>]*stroke-width="([^"]+)"[^>]*\/?>/g;
  const pathRegex =
    /<path[^>]*d="M\s*([-0-9.]+)\s+([-0-9.]+)\s+Q\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)\s+([-0-9.]+)"[^>]*stroke-width="([^"]+)"[^>]*\/?>/g;

  let match: RegExpExecArray | null;

  while ((match = lineRegex.exec(svgContent)) !== null) {
    const [, x1, y1, x2, y2, width] = match;
    const w = parseFloat(width);
    strokes.push({
      id: `stroke-line-${strokes.length}-${Date.now()}`,
      p0: { x: parseFloat(x1), y: parseFloat(y1) },
      p1: { x: parseFloat(x2), y: parseFloat(y2) },
      width: Number.isFinite(w) ? w : 8,
    });
  }

  while ((match = pathRegex.exec(svgContent)) !== null) {
    const [, x0, y0, cx, cy, x1, y1, width] = match;
    const w = parseFloat(width);
    strokes.push({
      id: `stroke-path-${strokes.length}-${Date.now()}`,
      p0: { x: parseFloat(x0), y: parseFloat(y0) },
      p1: { x: parseFloat(x1), y: parseFloat(y1) },
      ctrl: { x: parseFloat(cx), y: parseFloat(cy) },
      width: Number.isFinite(w) ? w : 8,
    });
  }

  return strokes;
}

const SvgGlyphEditor: React.FC<SvgGlyphEditorProps> = ({
  sid,
  letter,
  variantIndex,
}) => {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingStart, setPendingStart] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [draggingCtrlForId, setDraggingCtrlForId] = useState<string | null>(
    null,
  );

  // Dragging whole strokes (multi-select)
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const dragStartRef = useRef<Point | null>(null);
  const dragInitialStrokesRef = useRef<Stroke[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const svgCode = useMemo(
    () => serializeGlyphToSvg(strokes, letter),
    [strokes, letter],
  );

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

  // Helper: push current strokes into history, then compute new strokes
  const updateStrokes = (updater: (prev: Stroke[]) => Stroke[]) => {
    setStrokes(prev => {
      setHistory(h => [...h, prev]);
      return updater(prev);
    });
  };

  const clearTransientState = () => {
    setPendingStart(null);
    setPreviewPoint(null);
    setDraggingCtrlForId(null);
    setIsDraggingSelection(false);
    dragStartRef.current = null;
    dragInitialStrokesRef.current = [];
  };

  const resetEditorToEmpty = () => {
    setStrokes([]);
    setHistory([]);
    setSelectedIds([]);
    clearTransientState();
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingCtrlForId || isDraggingSelection) return; // ignore clicks while dragging
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: Point = { x, y };

    if (!pendingStart) {
      // First click: set start point, keep selection as-is
      setPendingStart(point);
      setPreviewPoint(null);
    } else {
      // Second click: create straight stroke
      const start = pendingStart;
      updateStrokes(prev => [
        ...prev,
        {
          id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          p0: start,
          p1: point,
          width: 8,
        },
      ]);
      setPendingStart(null);
      setPreviewPoint(null);
      // Do not force selection change here
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point: Point = { x, y };

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

    if (pendingStart) {
      setPreviewPoint(point);
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingCtrlForId) {
      setDraggingCtrlForId(null);
    }

    if (isDraggingSelection) {
      // Finalize move as a single history step
      setHistory(h => [...h, dragInitialStrokesRef.current]);
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
      let next = prev;

      const multi =
        e.shiftKey || e.ctrlKey || (e.metaKey ?? false);

      if (multi) {
        if (prev.includes(strokeId)) {
          next = prev.filter(id => id !== strokeId);
        } else {
          next = [...prev, strokeId];
        }
      } else {
        if (prev.length === 1 && prev[0] === strokeId) {
          // already the single selection; keep as is
          next = prev;
        } else {
          next = [strokeId];
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
        return { ...s, ctrl: midpoint(s.p0, s.p1) };
      }),
    );
  };

  const startDragControl = (
    e: React.MouseEvent<SVGCircleElement, MouseEvent>,
    strokeId: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedIds([strokeId]);
    setDraggingCtrlForId(strokeId);
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
    clearTransientState();
  };

  const handleUndo = () => {
    setHistory(prevHistory => {
      if (!prevHistory.length) return prevHistory;
      const last = prevHistory[prevHistory.length - 1];
      setStrokes(last);
      setSelectedIds([]);
      clearTransientState();
      return prevHistory.slice(0, -1);
    });
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.length) return;
    updateStrokes(prev =>
      prev.filter(s => !selectedIds.includes(s.id)),
    );
    setSelectedIds([]);
    clearTransientState();
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

  // 1) Whenever sid/letter changes, fetch SVG glyph meta for that letter
  useEffect(() => {
    const trimmedLetter = letter.trim();
    if (!sid || !trimmedLetter) {
      resetEditorToEmpty();
      return;
    }

    fetchGlyphs({ letter: trimmedLetter }).catch(err => {
      console.error('[SvgGlyphEditor] fetchGlyphs failed:', err);
      resetEditorToEmpty();
    });
  }, [sid, letter, fetchGlyphs]);

  // 2) Whenever glyphs change, try to load the default SVG for this letter
  useEffect(() => {
    const trimmedLetter = letter.trim();
    if (!sid || !trimmedLetter) {
      resetEditorToEmpty();
      return;
    }

    const glyphsForLetter = glyphs.filter(g => g.letter === trimmedLetter);
    if (!glyphsForLetter.length) {
      resetEditorToEmpty();
      return;
    }

    const requested =
      typeof variantIndex === 'number'
        ? glyphsForLetter.find(g => g.variant_index === variantIndex)
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
        setSelectedIds([]);
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
  }, [glyphs, sid, letter]);

  const marginX = CANVAS_WIDTH * 0.1;
  const marginBottom = CANVAS_HEIGHT * 0.1;
  const baselineY = CANVAS_HEIGHT - marginBottom;
  const xHeightY = baselineY - CANVAS_HEIGHT * 0.3;
  const ascenderY = baselineY - CANVAS_HEIGHT * 0.5;
  const descenderY = baselineY + CANVAS_HEIGHT * 0.15;

  const previewLetter = letter.trim();

  const hasSelection = selectedIds.length > 0;

  return (
    <section className="bf-panel">
      <h2>Canvas (SVG vector)</h2>
      <p className="bf-helptext">
        Click once to set the start of a stroke; move the cursor to see a
        preview line; click again to fix it. Click on a stroke to give it a
        bend handle, then drag the handle to create curves. Shift/Ctrl-click
        to select multiple strokes; drag them to move the group. Use Undo to
        revert the last change.
      </p>

      <div className="bf-glyph-editor__svg-layout">
        {/* Left / top: canvas + tools */}
        <div className="bf-glyph-editor__svg-layout-main">
          <div className="bf-glyph-editor__canvas-wrapper bf-glyph-editor__canvas-wrapper--svg">
            <svg
              ref={svgRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              className="bf-glyph-editor__svg-canvas"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              style={{ cursor: 'crosshair' }}
            >
              {/* Background */}
              <rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill="#ffffff"
              />

              {/* Guidelines (editor only) */}
              <g
                stroke="#ff5555"
                strokeWidth={1}
                strokeDasharray="6 4"
              >
                <line
                  x1={marginX}
                  y1={baselineY}
                  x2={CANVAS_WIDTH - marginX}
                  y2={baselineY}
                />
                <line
                  x1={marginX}
                  y1={xHeightY}
                  x2={CANVAS_WIDTH - marginX}
                  y2={xHeightY}
                />
                <line
                  x1={marginX}
                  y1={ascenderY}
                  x2={CANVAS_WIDTH - marginX}
                  y2={ascenderY}
                />
                <line
                  x1={marginX}
                  y1={descenderY}
                  x2={CANVAS_WIDTH - marginX}
                  y2={descenderY}
                />
              </g>

              {/* Reference letter (editor only, not exported) */}
              {previewLetter && (
                <text
                  x={CANVAS_WIDTH / 2}
                  y={baselineY}
                  textAnchor="middle"
                  fill="#000000"
                  opacity={0.22}
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: CANVAS_HEIGHT * 0.7,
                  }}
                >
                  {previewLetter}
                </text>
              )}

              {/* Real strokes */}
              <g
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {strokes.map(stroke => {
                  const { id, p0, p1, ctrl, width } = stroke;
                  const isSelected = selectedIds.includes(id);

                  const mainStrokeColor = isSelected ? '#0070f3' : 'black';
                  const mainStrokeOpacity = isSelected ? 1 : 0.8;

                  const hasCtrl = !!ctrl;

                  const handleStrokeClickWrapper = (
                    e: React.MouseEvent<
                      SVGPathElement | SVGLineElement,
                      MouseEvent
                    >,
                  ) => handleStrokeClick(e, id);

                  const handleStrokeMouseDownWrapper = (
                    e: React.MouseEvent<
                      SVGPathElement | SVGLineElement,
                      MouseEvent
                    >,
                  ) => handleStrokeMouseDown(e, id);

                  return (
                    <g key={id}>
                      {hasCtrl && ctrl ? (
                        <>
                          {/* Main curved stroke */}
                          <path
                            d={`M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p1.x} ${p1.y}`}
                            stroke={mainStrokeColor}
                            strokeWidth={width}
                            opacity={mainStrokeOpacity}
                            style={{ cursor: 'pointer' }}
                            onClick={handleStrokeClickWrapper}
                            onMouseDown={handleStrokeMouseDownWrapper}
                          />

                          {/* Helper lines + handle only when selected */}
                          {isSelected && (
                            <>
                              <g
                                stroke="#0070f3"
                                strokeWidth={1}
                                strokeDasharray="4 4"
                              >
                                <line
                                  x1={p0.x}
                                  y1={p0.y}
                                  x2={ctrl.x}
                                  y2={ctrl.y}
                                />
                                <line
                                  x1={ctrl.x}
                                  y1={ctrl.y}
                                  x2={p1.x}
                                  y2={p1.y}
                                />
                              </g>
                              <circle
                                cx={ctrl.x}
                                cy={ctrl.y}
                                r={6}
                                fill="#0070f3"
                                stroke="#ffffff"
                                strokeWidth={2}
                                style={{ cursor: 'grab' }}
                                onMouseDown={e => startDragControl(e, id)}
                              />
                            </>
                          )}
                        </>
                      ) : (
                        // Straight line (no ctrl yet)
                        <line
                          x1={p0.x}
                          y1={p0.y}
                          x2={p1.x}
                          y2={p1.y}
                          stroke={mainStrokeColor}
                          strokeWidth={width}
                          opacity={mainStrokeOpacity}
                          style={{ cursor: 'pointer' }}
                          onClick={handleStrokeClickWrapper}
                          onMouseDown={handleStrokeMouseDownWrapper}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Preview stroke while drawing */}
                {pendingStart && previewPoint && (
                  <line
                    x1={pendingStart.x}
                    y1={pendingStart.y}
                    x2={previewPoint.x}
                    y2={previewPoint.y}
                    strokeWidth={8}
                    stroke="#0070f3"
                    opacity={0.6}
                    strokeDasharray="4 4"
                  />
                )}
              </g>
            </svg>
          </div>

          {/* Stroke actions */}
          <div className="bf-glyph-editor__actions">
            <button
              type="button"
              className="bf-button bf-button--secondary"
              onClick={() => adjustWidth(-1)}
              disabled={!hasSelection}
            >
              Thinner
            </button>
            <button
              type="button"
              className="bf-button bf-button--secondary"
              onClick={() => adjustWidth(+1)}
              disabled={!hasSelection}
            >
              Thicker
            </button>
            <button
              type="button"
              className="bf-button bf-button--secondary"
              onClick={handleUndo}
              disabled={history.length === 0}
            >
              Undo
            </button>
            <button
              type="button"
              className="bf-button bf-button--secondary"
              onClick={handleDeleteSelected}
              disabled={!hasSelection}
            >
              Delete selected
            </button>
            <button
              type="button"
              className="bf-button bf-button--ghost"
              onClick={handleClearAll}
              disabled={strokes.length === 0}
            >
              Clear all
            </button>
          </div>

          {/* Upload button (SVG via useGlyphs hook) */}
          <div className="bf-glyph-editor__actions">
            <button
              type="button"
              className="bf-button bf-button--primary"
              onClick={handleUploadToBackend}
              disabled={
                !strokes.length ||
                !letter.trim() ||
                !sid ||
                isUploadingGlyph
              }
            >
              {isUploadingGlyph ? 'Saving...' : 'Save glyph to backend'}
            </button>
          </div>
        </div>

        {/* Right / bottom: SVG code */}
        <div className="bf-glyph-editor__svg-layout-code">
          <h3>SVG code</h3>
          <p className="bf-helptext">
            This is the SVG that corresponds to the current glyph. It contains
            only the real strokes (lines or curves), no guidelines and no
            reference letter.
          </p>
          <pre className="bf-glyph-editor__code">
            <code>{svgCode}</code>
          </pre>
        </div>
      </div>
    </section>
  );
};

export default SvgGlyphEditor;
