'use client';

// src/components/SvgGlyphEditor/SvgGlyphCanvas.tsx

import React from 'react';

import type {
  Point,
  Stroke,
  DrawMode,
} from '@mytypes/glyphEditor';

export type SvgGlyphCanvasProps = {
  svgRef: React.RefObject<SVGSVGElement>;
  width: number;
  height: number;

  strokes: Stroke[];
  selectedIds: string[];

  pendingStart: Point | null;
  previewPoint: Point | null;

  selectionRectStart: Point | null;
  selectionRectEnd: Point | null;
  anyMarquee: boolean;

  drawMode: DrawMode;

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

  onCanvasMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasClick: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onCanvasMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;

  onStrokeMouseDown: (
    e: React.MouseEvent<SVGPathElement | SVGLineElement, MouseEvent>,
    strokeId: string,
  ) => void;

  onStrokeClick: (
    e: React.MouseEvent<SVGPathElement | SVGLineElement, MouseEvent>,
    strokeId: string,
  ) => void;

  onStartDragControl: (
    e: React.MouseEvent<SVGCircleElement, MouseEvent>,
    strokeId: string,
  ) => void;
};

const SvgGlyphCanvas: React.FC<SvgGlyphCanvasProps> = ({
  svgRef,
  width,
  height,
  strokes,
  selectedIds,
  pendingStart,
  previewPoint,
  selectionRectStart,
  selectionRectEnd,
  anyMarquee,
  drawMode,
  glyphXMin,
  glyphXMax,
  glyphWidth,
  majusculeY,
  ascenderY,
  xHeightY,
  baselineY,
  descenderY,
  previewLetter,
  previewFontSize,
  onCanvasMouseDown,
  onCanvasClick,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onStrokeMouseDown,
  onStrokeClick,
  onStartDragControl,
}) => {
  const hasSelection = selectedIds.length > 0;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="bf-glyph-editor__svg-canvas"
      onMouseDown={onCanvasMouseDown}
      onClick={onCanvasClick}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseUp}
      style={{
        cursor: drawMode === 'select' ? 'crosshair' : 'crosshair',
      }}
    >
      {/* Background */}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#ffffff"
      />

      {/* Guidelines (editor only) */}
      <g stroke="#ff5555" strokeWidth={1} strokeDasharray="6 4">
        {/* majuscule */}
        <line
          x1={glyphXMin}
          y1={majusculeY}
          x2={glyphXMax}
          y2={majusculeY}
        />
        {/* ascender */}
        <line
          x1={glyphXMin}
          y1={ascenderY}
          x2={glyphXMax}
          y2={ascenderY}
        />
        {/* x-height */}
        <line
          x1={glyphXMin}
          y1={xHeightY}
          x2={glyphXMax}
          y2={xHeightY}
        />
        {/* baseline */}
        <line
          x1={glyphXMin}
          y1={baselineY}
          x2={glyphXMax}
          y2={baselineY}
        />
        {/* descender */}
        <line
          x1={glyphXMin}
          y1={descenderY}
          x2={glyphXMax}
          y2={descenderY}
        />
      </g>

      {/* Reference ink box */}
      <rect
        x={glyphXMin}
        y={majusculeY}
        width={glyphWidth}
        height={descenderY - majusculeY}
        fill="none"
        stroke="#dddddd"
        strokeWidth={1}
        strokeDasharray="4 4"
      />

      {/* Reference Arial letter (editor only, not exported) */}
      {previewLetter && (
        <text
          x={(glyphXMin + glyphXMax) / 2}
          y={baselineY}
          textAnchor="middle"
          fill="#000000"
          opacity={0.22}
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: previewFontSize,
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
          const { id, p0, p1, ctrl, width: w } = stroke;
          const isSelected = selectedIds.includes(id);

          const mainStrokeColor = isSelected ? '#0070f3' : 'black';
          const mainStrokeOpacity = isSelected ? 1 : 0.8;

          const hasCtrl = !!ctrl;

          const handleStrokeClickWrapper = (
            e: React.MouseEvent<SVGPathElement | SVGLineElement, MouseEvent>,
          ) => onStrokeClick(e, id);

          const handleStrokeMouseDownWrapper = (
            e: React.MouseEvent<SVGPathElement | SVGLineElement, MouseEvent>,
          ) => onStrokeMouseDown(e, id);

          return (
            <g key={id}>
              {hasCtrl && ctrl ? (
                <>
                  {/* Main curved stroke */}
                  <path
                    d={`M ${p0.x} ${p0.y} Q ${ctrl.x} ${ctrl.y} ${p1.x} ${p1.y}`}
                    stroke={mainStrokeColor}
                    strokeWidth={w}
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
                        onMouseDown={e => onStartDragControl(e, id)}
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
                  strokeWidth={w}
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
        {pendingStart &&
          previewPoint &&
          (drawMode === 'stroke' || drawMode === 'circle') && (
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

      {/* Marquee rectangle */}
      {anyMarquee &&
        selectionRectStart &&
        selectionRectEnd && (
          <rect
            x={Math.min(selectionRectStart.x, selectionRectEnd.x)}
            y={Math.min(selectionRectStart.y, selectionRectEnd.y)}
            width={Math.abs(
              selectionRectEnd.x - selectionRectStart.x,
            )}
            height={Math.abs(
              selectionRectEnd.y - selectionRectStart.y,
            )}
            fill="rgba(0, 112, 243, 0.1)"
            stroke="#0070f3"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}
    </svg>
  );
};

export default SvgGlyphCanvas;
