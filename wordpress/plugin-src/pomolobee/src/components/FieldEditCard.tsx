'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

 
import { useApp } from '@context/AppContext';

import type { FieldBasic, Field } from '@mytypes/field';
import useFieldBackgroundUpload from '@hooks/useFieldBackgroundUpload';

import useFieldSvgUpload from '@hooks/useFieldSvgUpload';

type Props = {
    field: FieldBasic | Field | null | undefined;
    onSave?: (svgMarkup: string) => void;
    onBackgroundSaved?: (newUrl: string) => void; // optional: let parent refresh context
};

type Pt = { x: number; y: number };

function isFullField(f: FieldBasic | Field): f is Field {
    return (f as Field).orientation !== undefined;
}

const FieldEditCard: React.FC<Props> = ({ field, onSave, onBackgroundSaved }) => {
    const { fieldsById } = useAuth();
    const { uploadBackground } = useFieldBackgroundUpload();


    // inside component
    const { uploadSvg } = useFieldSvgUpload();
    const { patchField } = useApp();

    const [isSvgUploading, setIsSvgUploading] = useState(false);
    const [svgUploadError, setSvgUploadError] = useState<string | null>(null);

    const saveSvgToServer = async (svgOverride?: string) => {
        setSvgUploadError(null);
        const fid = resolved?.field_id || (field as any)?.field_id;
        if (!fid) { setSvgUploadError('Missing field_id.'); return; }

        const svgMarkup = svgOverride ?? savedSvg ?? buildSvgMarkup();
        if (!svgMarkup) { setSvgUploadError('No closed contour to save.'); return; }

        try {
            setIsSvgUploading(true);
            const base = resolved?.short_name || (field as any)?.short_name || `field_${fid}`;
            const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
            const file = new File([blob], `${base}_map.svg`, { type: 'image/svg+xml' });
            await uploadSvg(fid, file); // your hook can patch AuthContext internally

        } catch (e: any) {
            setSvgUploadError(e?.message || 'SVG upload failed.');
        } finally {
            setIsSvgUploading(false);
        }
    };

    const resolved: Field | null = useMemo(() => {
        if (!field) return null;
        if (isFullField(field)) return field;
        const full = fieldsById[field.field_id];
        return full ?? null;
    }, [field, fieldsById]);

    if (!field) {
        return (
            <div className="card p-3">
                <h3 className="mb-2">Field editor</h3>
                <div className="text-muted">No field selected.</div>
            </div>
        );
    }

    const title = field.name ?? `Field #${field.field_id}`;
    const originalBgUrl = (resolved?.background_image_url || null) as string | null;

    // ======== NEW: Import / Upload state ========
    const [importedFile, setImportedFile] = useState<File | null>(null);
    const [importPreviewUrl, setImportPreviewUrl] = useState<string | null>(null);
    const [bgOverrideUrl, setBgOverrideUrl] = useState<string | null>(null); // server-returned new URL
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const effectiveBgUrl: string | null = importPreviewUrl ?? bgOverrideUrl ?? originalBgUrl;

    // clean up object URLs
    useEffect(() => {
        return () => {
            if (importPreviewUrl) URL.revokeObjectURL(importPreviewUrl);
        };
    }, [importPreviewUrl]);

    const onImportClick = () => fileInputRef.current?.click();

    const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUploadError(null);
        const file = e.target.files?.[0] ?? null;
        if (!file) return;

        const okTypes = ['image/png', 'image/jpeg'];
        if (!okTypes.includes(file.type)) {
            setUploadError('Only PNG or JPEG are allowed.');
            e.target.value = '';
            return;
        }
        if (importPreviewUrl) URL.revokeObjectURL(importPreviewUrl);
        const url = URL.createObjectURL(file);
        setImportedFile(file);
        setImportPreviewUrl(url);
    };

    const saveImportedPng = async () => {
        if (!importedFile) return;
        if (!resolved?.field_id && !(field as any)?.field_id) {
            setUploadError('Missing field_id.');
            return;
        }
        setIsUploading(true);
        setUploadError(null);
        try {
            // Derive name from shortcode if available
            const base = resolved?.short_name || (field as any)?.short_name || `field_${resolved?.field_id || (field as any)?.field_id}`;
            const ext = importedFile.type === 'image/png' ? 'png' : 'jpeg';
            const desiredName = `${base}.${ext}`;

            console.log('[FieldEditCard] uploadBackground will be called');
            const newUrl = await uploadBackground(resolved?.field_id || (field as any)?.field_id, importedFile, desiredName);

            // Switch to server URL, clear preview + file
            if (importPreviewUrl) URL.revokeObjectURL(importPreviewUrl);
            setImportPreviewUrl(null);
            setImportedFile(null);
            setBgOverrideUrl(newUrl);

            onBackgroundSaved?.(newUrl);
        } catch (err: any) {
            setUploadError(err?.message || 'Upload failed.');
        } finally {
            console.log('[FieldEditCard] finally');
            setIsUploading(false);
        }
    };

    // ======== Existing contour editor state ========
    const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [points, setPoints] = useState<Pt[]>([]);
    const [isClosed, setIsClosed] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [savedSvg, setSavedSvg] = useState<string | null>(null);

    const handleImageLoad = useCallback(() => {
        if (!imgRef.current) return;
        setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }, []);

    const svgWrapRef = useRef<HTMLDivElement | null>(null);
    const toImageSpace = useCallback(
        (clientX: number, clientY: number): Pt | null => {
            if (!svgWrapRef.current || !imgSize) return null;
            const rect = svgWrapRef.current.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;
            const scaleX = imgSize.w / rect.width;
            const scaleY = imgSize.h / rect.height;
            return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
        },
        [imgSize]
    );

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (!isDrawing || !imgSize) return;
            const p = toImageSpace(e.clientX, e.clientY);
            if (!p) return;
            setPoints((prev) => [...prev, p]);
        },
        [isDrawing, imgSize, toImageSpace]
    );

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            if (!isDrawing) return;
            e.preventDefault();
            if (points.length >= 3) {
                setIsClosed(true);
                setIsDrawing(false);
                setShowPreview(true);
            }
        },
        [isDrawing, points.length]
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDrawing(false);
                setPoints([]);
                setIsClosed(false);
                setShowPreview(false);
            } else if ((e.key === 'Backspace' || e.key === 'Delete') && isDrawing && points.length > 0 && !isClosed) {
                e.preventDefault();
                setPoints((prev) => prev.slice(0, -1));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isDrawing, isClosed, points.length]);

    const polygonPointsAttr = useMemo(
        () => points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
        [points]
    );

    const strokeW = useMemo(() => {
        if (!imgSize) return 2;
        return Math.max(1, Math.round(0.002 * Math.min(imgSize.w, imgSize.h)));
    }, [imgSize]);

    const startSelect = () => {
        setIsDrawing(true);
        setPoints([]);
        setIsClosed(false);
        setShowPreview(false);
    };
    const removeLast = () => {
        if (!isDrawing || isClosed || points.length === 0) return;
        setPoints((prev) => prev.slice(0, -1));
    };
    const cancelAll = () => {
        setIsDrawing(false);
        setPoints([]);
        setIsClosed(false);
        setShowPreview(false);
    };
    const toggleSee = () => setShowPreview((v) => !v);

    const buildSvgMarkup = (): string | null => {
        if (!imgSize || !isClosed || points.length < 3) return null;
        const polygon = `<polygon points="${polygonPointsAttr}" fill="rgba(0,128,255,0.22)" stroke="rgb(0,128,255)" stroke-width="${strokeW}" />`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imgSize.w} ${imgSize.h}" width="${imgSize.w}" height="${imgSize.h}">${polygon}</svg>`;
        return svg;
    };

    const saveContour = async () => {
        const svg = buildSvgMarkup();
        if (!svg) return;
        setSavedSvg(svg);
        setShowPreview(true);
        onSave?.(svg);

        // auto-upload
        await saveSvgToServer(svg);
    };

    const canSee = isClosed && points.length >= 3;
    const canSave = canSee;
    const canRemoveLast = isDrawing && !isClosed && points.length > 0;

    const previewSvgForRightPanel = savedSvg ?? (canSee && showPreview ? buildSvgMarkup() : null);

    return (
        <div className="card p-3">
            <div className="d-flex justify-content-between align-items-start mb-2">
                <h3 className="mb-0">{title}</h3>
                <span className="badge text-bg-secondary">Editor</span>
            </div>

            {/* Controls */}
            <div className="mb-3 d-flex gap-2 flex-wrap">
                {/* NEW: Import / Save background */}
                <button
                    type="button"
                    className="btn btn-sm btn-outline-dark"
                    onClick={onImportClick}
                    title="Pick a PNG or JPEG to preview as background"
                >
                    Import PNG/JPEG
                </button>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={saveImportedPng}
                    disabled={!importedFile || isUploading}
                    title="Upload the imported image to the backend"
                >
                    {isUploading ? 'Saving…' : 'Save imported PNG'}
                </button>

                {/* existing contour buttons */}
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={startSelect}
                    disabled={!effectiveBgUrl}
                >
                    Select field contour
                </button>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={toggleSee}
                    disabled={!canSee}
                    aria-pressed={showPreview}
                >
                    See selected contour
                </button>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={cancelAll}
                    disabled={!isDrawing && !isClosed && points.length === 0}
                >
                    Cancel field contour
                </button>

                <button
                    type="button"
                    className="btn btn-sm btn-outline-warning"
                    onClick={removeLast}
                    disabled={!canRemoveLast}
                >
                    Remove last point
                </button>

                <button
                    type="button"
                    className="btn btn-sm btn-success"
                    onClick={saveContour}
                    disabled={!canSave}
                    title="Create an SVG from the closed path and show it in the right pane"
                >
                    Save selected contour
                </button>

                {/* hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    style={{ display: 'none' }}
                    onChange={onFilePicked}
                />
            </div>

            {uploadError && <div className="alert alert-warning py-2 my-2">{uploadError}</div>}

            {!effectiveBgUrl ? (
                <div className="text-muted">No background image yet. Import one to begin.</div>
            ) : (
                <div className="row g-3 align-items-stretch">
                    {/* LEFT: Editor */}
                    <div className="col-12 col-lg-6">
                        <div className="border rounded overflow-hidden position-relative" style={{ background: '#f8f9fa', minHeight: 300 }}>
                            <img
                            ref={imgRef}
                            src={effectiveBgUrl || ''}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = '/static/fallback.png';
                            }}
                            alt="Field background"
                            className="w-100"
                            style={{ display: 'block', objectFit: 'contain' }}
                            onLoad={handleImageLoad}
                            />


                            <div
                                ref={svgWrapRef}
                                className="position-absolute top-0 start-0 w-100 h-100"
                                onClick={handleClick}
                                onDoubleClick={handleDoubleClick}
                                role="application"
                                aria-label="Field contour editor"
                                style={{ cursor: isDrawing ? 'crosshair' : 'default' }}
                            >
                                {imgSize && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
                                        preserveAspectRatio="xMidYMid meet"
                                        className="w-100 h-100"
                                    >
                                        {points.length > 0 && !isClosed && (
                                            <>
                                                <polyline points={polygonPointsAttr} fill="none" stroke="rgb(0,128,255)" strokeWidth={strokeW} />
                                                {points.map((p, i) => (
                                                    <circle key={i} cx={p.x} cy={p.y} r={Math.max(3, strokeW * 1.5)} fill="white" stroke="rgb(0,128,255)" strokeWidth={Math.max(1, strokeW * 0.75)} />
                                                ))}
                                            </>
                                        )}

                                        {isClosed && points.length >= 3 && (
                                            <polygon points={polygonPointsAttr} fill="rgba(0,128,255,0.22)" stroke="rgb(0,128,255)" strokeWidth={strokeW} />
                                        )}
                                    </svg>
                                )}
                            </div>
                        </div>

                        <div className="small text-muted mt-2">
                            Click to add vertices. Double-click to close. ESC cancels. Backspace/Delete removes last point while drawing.
                        </div>
                    </div>

                    {/* RIGHT: Result overlay */}
                    <div className="col-12 col-lg-6">
                        <div className="border rounded overflow-hidden position-relative" style={{ background: '#f8f9fa', minHeight: 300 }} aria-label="Result overlay">
                            <img src={effectiveBgUrl} alt="Field background (result)" className="w-100" style={{ display: 'block', objectFit: 'contain' }} />
                            {imgSize && previewSvgForRightPanel && (
                                <div className="position-absolute top-0 start-0 w-100 h-100" style={{ pointerEvents: 'none' }}>
                                    <object
                                        type="image/svg+xml"
                                        data={`data:image/svg+xml;utf8,${encodeURIComponent(previewSvgForRightPanel)}`}
                                        className="w-100 h-100"
                                        aria-label="Selected contour overlay"
                                    />
                                </div>
                            )}
                        </div>

                        {savedSvg && (
                            <details className="mt-2">
                                <summary>Show saved SVG markup</summary>
                                <pre className="small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{savedSvg}</pre>
                            </details>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FieldEditCard;
