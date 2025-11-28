// src/components/PngGlyphEditor.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import useGlyphs from '@hooks/useGlyphs';
import { friendlyMessage, type AppError } from '@bee/common/error';

type PngGlyphEditorProps = {
  sid: string;
  letter: string;
};

const PngGlyphEditor: React.FC<PngGlyphEditorProps> = ({ sid, letter }) => {
  const [brushSize, setBrushSize] = useState<number>(4);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const {
    error,
    isUpdating,
    uploadGlyphFromEditor,
  } = useGlyphs(sid, {
    manual: true,
    formattype: 'png', // <<< explizit PNG, sonst folgt der Hook activeGlyphFormat (z.B. 'svg')
  });

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  // Draw guidelines + preview letter
  const drawGuidesAndPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear + white background
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Some margins
    const marginX = width * 0.1;
    const marginBottom = height * 0.1;

    // Baseline and x-height positions
    const baselineY = height - marginBottom;
    const xHeightY = baselineY - height * 0.3;
    const ascenderY = baselineY - height * 0.5;
    const descenderY = baselineY + height * 0.15;

    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#ff5555'; // red guidelines

    // Helper to draw one horizontal line
    const drawLine = (y: number) => {
      ctx.beginPath();
      ctx.moveTo(marginX, y);
      ctx.lineTo(width - marginX, y);
      ctx.stroke();
    };

    drawLine(baselineY);
    drawLine(xHeightY);
    drawLine(ascenderY);
    drawLine(descenderY);

    ctx.setLineDash([]);

    // Light-grey reference letter (Arial)
    const preview = letter.trim();
    if (!preview) return;

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#00060ae1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    const fontSize = height * 0.7;
    ctx.font = `${fontSize}px Arial`;

    ctx.fillText(preview, width / 2, baselineY);
    ctx.restore();
  }, [letter]);

  // Initial render + whenever letter changes
  useEffect(() => {
    drawGuidesAndPreview();
  }, [drawGuidesAndPreview]);

  // Pointer events
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isDrawing.current = true;
    lastPoint.current = { x, y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const last = lastPoint.current;
    if (!last) {
      lastPoint.current = { x, y };
      return;
    }

    ctx.strokeStyle = '#000000';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPoint.current = { x, y };
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const handleClear = () => {
    drawGuidesAndPreview();
  };

  const handleSave = () => {
    const trimmed = letter.trim();
    if (!trimmed) {
      console.warn('[PngGlyphEditor] cannot save: no letter entered');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      async blob => {
        if (!blob) {
          console.error('[PngGlyphEditor] canvas.toBlob returned null');
          return;
        }

        try {
          // uploadGlyphFromEditor geht jetzt über /jobs/{sid}/glyphs/png/upload/
          // und hängt die Endung .png selbst anhand des formattype an.
          await uploadGlyphFromEditor(trimmed, blob);
          console.log('[PngGlyphEditor] glyph uploaded successfully');
          // optional: clear/redraw after saving
          // drawGuidesAndPreview();
        } catch (err) {
          console.error(
            '[PngGlyphEditor] uploadGlyphFromEditor failed:',
            err,
          );
        }
      },
      'image/png',
    );
  };

  return (
    <>
      {/* PNG-specific settings (brush) */}
      <section className="bf-panel">
        <h2>Brush settings (PNG)</h2>
        <div className="bf-form bf-form--inline">
          <label htmlFor="png-brush-size">
            Brush width
          </label>
          <input
            id="png-brush-size"
            type="range"
            min={1}
            max={20}
            step={1}
            value={brushSize}
            onChange={e =>
              setBrushSize(parseInt(e.target.value, 10) || 1)
            }
          />
          <span className="bf-glyph-editor__brush-value">
            {brushSize}px
          </span>
        </div>
      </section>

      {/* Error from useGlyphs (PNG upload) */}
      {errorText && (
        <section className="bf-panel">
          <div className="bf-alert bf-alert--error">
            {errorText}
          </div>
        </section>
      )}

      {/* Canvas + actions */}
      <section className="bf-panel">
        <h2>Canvas (bitmap PNG)</h2>
        <div className="bf-glyph-editor__canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={600}
            height={600}
            className="bf-glyph-editor__canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <div className="bf-glyph-editor__actions">
          <button
            type="button"
            className="bf-button bf-button--secondary"
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className="bf-button bf-button--primary"
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving…' : 'Save glyph'}
          </button>
        </div>
      </section>
    </>
  );
};

export default PngGlyphEditor;
