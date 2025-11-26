// src/pages/GlyphEditorPage.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { useApp } from '@context/AppContext';
import { friendlyMessage, type AppError } from '@bee/common/error';

import useGlyphs from '@hooks/useGlyphs';

const GlyphEditorPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialLetter = searchParams.get('letter') ?? '';

  const { activeJob } = useApp();

  const effectiveSid = useMemo(
    () => activeJob?.sid || '',
    [activeJob],
  );

  const [letter, setLetter] = useState<string>(initialLetter);
  const [brushSize, setBrushSize] = useState<number>(4);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  const {
    error,
    isUpdating,
    uploadGlyphFromEditor,
  } = useGlyphs(effectiveSid, { manual: true });

  const errorText = useMemo(
    () => (error ? friendlyMessage(error as AppError) : null),
    [error],
  );

  useEffect(() => {
    setLetter(initialLetter);
  }, [initialLetter]);

  // DRAW GUIDELINES + PREVIEW LETTER
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
    const marginTop = height * 0.1;
    const marginBottom = height * 0.1;

    // Baseline and x-height positions
    const baselineY = height - marginBottom;
    const xHeightY = baselineY - height * 0.3;
    const ascenderY = baselineY - height * 0.5;
    const descenderY = baselineY + height * 0.15;

    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = '#ff5555'; // red guidelines

    // Baseline
    ctx.beginPath();
    ctx.moveTo(marginX, baselineY);
    ctx.lineTo(width - marginX, baselineY);
    ctx.stroke();

    // x-height
    ctx.beginPath();
    ctx.moveTo(marginX, xHeightY);
    ctx.lineTo(width - marginX, xHeightY);
    ctx.stroke();

    // ascender
    ctx.beginPath();
    ctx.moveTo(marginX, ascenderY);
    ctx.lineTo(width - marginX, ascenderY);
    ctx.stroke();

    // descender
    ctx.beginPath();
    ctx.moveTo(marginX, descenderY);
    ctx.lineTo(width - marginX, descenderY);
    ctx.stroke();

    ctx.setLineDash([]);

    // Light-grey reference letter (Arial)
    const preview = letter.trim();
    if (!preview) return;

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#00060ae1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Font size so the letter roughly fits between ascender and descender.
    // Adjust as needed.
    const fontSize = height * 0.7;
    ctx.font = `${fontSize}px Arial`;

    ctx.fillText(preview, width / 2, baselineY);
    ctx.restore();
  }, [letter]);

  // Initial render + whenever letter changes
  useEffect(() => {
    drawGuidesAndPreview();
  }, [drawGuidesAndPreview]);

  if (!effectiveSid) {
    return (
      <section className="bf-page bf-page--glyph-editor">
        <header className="bf-page__header">
          <h1>BeeFont – Glyph editor</h1>
        </header>
        <div className="bf-alert bf-alert--error">
          No job selected. Open this page from a job or select a job first.
        </div>
      </section>
    );
  }

  // Drawing handlers (brush draws ON TOP of guidelines / preview)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
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
    // Clear everything and redraw guidelines + preview letter
    drawGuidesAndPreview();
  };

  const handleSave = () => {
    const trimmed = letter.trim();
    if (!trimmed) {
      console.warn('[GlyphEditorPage] cannot save: no letter entered');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async blob => {
      if (!blob) {
        console.error('[GlyphEditorPage] canvas.toBlob returned null');
        return;
      }

      try {
        await uploadGlyphFromEditor(trimmed, blob);
        console.log('[GlyphEditorPage] glyph uploaded successfully');
        // Optional: clear after save
        // drawGuidesAndPreview();
      } catch (err) {
        console.error('[GlyphEditorPage] uploadGlyphFromEditor failed:', err);
      }
    }, 'image/png');
  };

  return (
    <section className="bf-page bf-page--glyph-editor">
      <header className="bf-page__header">
        <h1>BeeFont – Glyph editor</h1>
        <p className="bf-page__subtitle">
          Draw a glyph by hand on top of reference guidelines and save it as a new variant.
        </p>
      </header>

      {errorText && (
        <div className="bf-alert bf-alert--error">
          {errorText}
        </div>
      )}

      <section className="bf-panel">
        <h2>Glyph settings</h2>
        <div className="bf-form bf-form--inline">
          <label htmlFor="glyph-letter">
            Letter / character
          </label>
          <input
            id="glyph-letter"
            type="text"
            maxLength={2}
            value={letter}
            onChange={e => setLetter(e.target.value)}
            className="bf-input bf-input--small"
            placeholder="A"
          />

          <label htmlFor="brush-size">
            Brush width
          </label>
          <input
            id="brush-size"
            type="range"
            min={1}
            max={20}
            step={1}
            value={brushSize}
            onChange={e => setBrushSize(parseInt(e.target.value, 10))}
          />
          <span className="bf-glyph-editor__brush-value">
            {brushSize}px
          </span>
        </div>
      </section>

      <section className="bf-panel">
        <h2>Canvas</h2>
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
    </section>
  );
};

export default GlyphEditorPage;
