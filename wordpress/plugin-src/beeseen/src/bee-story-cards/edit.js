import { __ } from '@wordpress/i18n';
import {
  useBlockProps,
  InspectorControls,
  MediaUpload,
  MediaUploadCheck,
  RichText,
} from '@wordpress/block-editor';
import {
  PanelBody,
  Button,
  RangeControl,
  SelectControl,
  ToggleControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
  return {
    id: img?.id ?? null,
    url: img?.url ?? img?.source_url ?? '',
    alt: img?.alt ?? img?.alt_text ?? '',
  };
}

function makeCardFromImage(img) {
  const n = normalizeImage(img);
  return {
    id: n.id,
    url: n.url,
    alt: n.alt,
    title: '',
    text: '',
    linkUrl: '',
    durationMs: null, // optional per-card override
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function Edit({ attributes, setAttributes }) {
  const {
    cards,
    autoplay,
    durationMs,
    transitionMs,
    transition,
    pauseOnHover,
    showControls,
    overlay,
    textAlign,
    textPosition,
    rounded,
    imageFit,
    aspect,
  } = attributes;

  const safeDuration = clamp(Number(durationMs ?? 4500), 800, 20000);
  const safeTransitionMs = clamp(Number(transitionMs ?? 380), 0, 2000);

  const onSelectImages = (imgs) => {
    const next = (imgs || []).map(makeCardFromImage).filter((c) => c.url);
    setAttributes({ cards: next });
  };

  const updateCard = (idx, patch) => {
    const next = (cards || []).slice();
    next[idx] = { ...next[idx], ...patch };
    setAttributes({ cards: next });
  };

  const removeCard = (idx) => {
    const next = (cards || []).slice();
    next.splice(idx, 1);
    setAttributes({ cards: next });
  };

  const moveCard = (from, to) => {
    const next = (cards || []).slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setAttributes({ cards: next });
  };

  const blockProps = useBlockProps({ className: 'beeseen-story-cards' });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Story Cards settings', 'beeseen')}>
          <ToggleControl
            label={__('Autoplay', 'beeseen')}
            checked={!!autoplay}
            onChange={(v) => setAttributes({ autoplay: !!v })}
          />
          <RangeControl
            label={__('Duration per card (ms)', 'beeseen')}
            value={safeDuration}
            onChange={(v) => setAttributes({ durationMs: v })}
            min={800}
            max={20000}
            step={100}
          />
          <RangeControl
            label={__('Transition duration (ms)', 'beeseen')}
            value={safeTransitionMs}
            onChange={(v) => setAttributes({ transitionMs: v })}
            min={0}
            max={2000}
            step={20}
          />
          <SelectControl
            label={__('Transition style', 'beeseen')}
            value={transition}
            options={[
              { label: __('Fade', 'beeseen'), value: 'fade' },
              { label: __('Fade + slide up', 'beeseen'), value: 'fade-up' },
              { label: __('Fade + slide left', 'beeseen'), value: 'fade-left' },
            ]}
            onChange={(v) => setAttributes({ transition: v })}
          />
          <ToggleControl
            label={__('Pause on hover / focus', 'beeseen')}
            checked={!!pauseOnHover}
            onChange={(v) => setAttributes({ pauseOnHover: !!v })}
          />
          <ToggleControl
            label={__('Show controls (dots + prev/next)', 'beeseen')}
            checked={!!showControls}
            onChange={(v) => setAttributes({ showControls: !!v })}
          />
          <RangeControl
            label={__('Overlay strength', 'beeseen')}
            value={overlay}
            onChange={(v) => setAttributes({ overlay: v })}
            min={0}
            max={0.75}
            step={0.01}
          />
          <SelectControl
            label={__('Text align', 'beeseen')}
            value={textAlign}
            options={[
              { label: __('Left', 'beeseen'), value: 'left' },
              { label: __('Center', 'beeseen'), value: 'center' },
              { label: __('Right', 'beeseen'), value: 'right' },
            ]}
            onChange={(v) => setAttributes({ textAlign: v })}
          />
          <SelectControl
            label={__('Text position', 'beeseen')}
            value={textPosition}
            options={[
              { label: __('Bottom left', 'beeseen'), value: 'bottom-left' },
              { label: __('Bottom center', 'beeseen'), value: 'bottom-center' },
              { label: __('Bottom right', 'beeseen'), value: 'bottom-right' },
              { label: __('Center', 'beeseen'), value: 'center' },
              { label: __('Top left', 'beeseen'), value: 'top-left' },
              { label: __('Top right', 'beeseen'), value: 'top-right' },
            ]}
            onChange={(v) => setAttributes({ textPosition: v })}
          />
          <ToggleControl
            label={__('Rounded frame', 'beeseen')}
            checked={!!rounded}
            onChange={(v) => setAttributes({ rounded: !!v })}
          />
          <SelectControl
            label={__('Image fit', 'beeseen')}
            value={imageFit}
            options={[
              { label: __('Cover (crop)', 'beeseen'), value: 'cover' },
              { label: __('Contain (fit)', 'beeseen'), value: 'contain' },
            ]}
            onChange={(v) => setAttributes({ imageFit: v })}
          />
          <SelectControl
            label={__('Aspect ratio', 'beeseen')}
            value={aspect}
            options={[
              { label: '16:9', value: '16:9' },
              { label: '4:3', value: '4:3' },
              { label: '1:1', value: '1:1' },
              { label: '3:4', value: '3:4' }
            ]}
            onChange={(v) => setAttributes({ aspect: v })}
          />
        </PanelBody>

        <PanelBody title={__('Cards', 'beeseen')} initialOpen={true}>
          <MediaUploadCheck>
            <MediaUpload
              onSelect={onSelectImages}
              allowedTypes={['image']}
              multiple
              gallery
              value={(cards || []).map((c) => c.id).filter(Boolean)}
              render={({ open }) => (
                <Button variant="primary" onClick={open}>
                  {(cards || []).length
                    ? __('Replace card images', 'beeseen')
                    : __('Select card images', 'beeseen')}
                </Button>
              )}
            />
          </MediaUploadCheck>
          {(cards || []).length ? (
            <p className="beeseen-story-cards__hint">
              {__('Tip: order matters. Use Up/Down to reorder.', 'beeseen')}
            </p>
          ) : (
            <p className="beeseen-story-cards__hint">
              {__('Select images to create cards.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        style={{
          '--beeseen-sc-overlay': overlay,
          textAlign,
        }}
        data-rounded={rounded ? '1' : '0'}
        data-image-fit={imageFit}
        data-aspect={aspect}
      >
        {(cards || []).length ? (
          <div className={['beeseen-sc__editorList', rounded ? 'is-rounded' : ''].join(' ')}>
            {(cards || []).map((c, idx) => (
              <div className="beeseen-sc__editorRow" key={`${c.id ?? c.url}-${idx}`}>
                <div className="beeseen-sc__thumb">
                  <img src={c.url} alt={c.alt || ''} />
                </div>

                <div className="beeseen-sc__fields">
                  <RichText
                    tagName="h3"
                    value={c.title}
                    allowedFormats={[]}
                    placeholder={__('Card title…', 'beeseen')}
                    onChange={(v) => updateCard(idx, { title: v })}
                  />
                  <RichText
                    tagName="p"
                    value={c.text}
                    placeholder={__('Card text…', 'beeseen')}
                    onChange={(v) => updateCard(idx, { text: v })}
                  />

                  <div className="beeseen-sc__rowActions">
                    <Button
                      variant="secondary"
                      onClick={() => idx > 0 && moveCard(idx, idx - 1)}
                      disabled={idx === 0}
                    >
                      {__('Up', 'beeseen')}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => idx < cards.length - 1 && moveCard(idx, idx + 1)}
                      disabled={idx === cards.length - 1}
                    >
                      {__('Down', 'beeseen')}
                    </Button>
                    <Button variant="link" isDestructive onClick={() => removeCard(idx)}>
                      {__('Remove', 'beeseen')}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="beeseen-sc__empty">
            Bee Story Cards — select images in the sidebar to create cards.
          </div>
        )}
      </div>
    </>
  );
}
