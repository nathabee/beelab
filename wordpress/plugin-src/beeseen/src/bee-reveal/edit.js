import { __ } from '@wordpress/i18n';
import {
  useBlockProps,
  InspectorControls,
  MediaUpload,
  MediaUploadCheck,
} from '@wordpress/block-editor';
import {
  PanelBody,
  Button,
  RangeControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
  return {
    id: img.id ?? null,
    url: img.url ?? img.source_url ?? '',
    alt: img.alt ?? img.alt_text ?? '',
  };
}

function ImagePicker({ label, image, onSelect, onRemove }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <strong>{label}</strong>
      <MediaUploadCheck>
        <MediaUpload
          onSelect={(img) => onSelect(normalizeImage(img))}
          allowedTypes={['image']}
          multiple={false}
          value={image?.id ?? 0}
          render={({ open }) => (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button variant="primary" onClick={open}>
                {image ? __('Replace', 'beeseen') : __('Select', 'beeseen')}
              </Button>
              {image && (
                <Button variant="secondary" onClick={onRemove}>
                  {__('Remove', 'beeseen')}
                </Button>
              )}
            </div>
          )}
        />
      </MediaUploadCheck>
    </div>
  );
}

export default function Edit({ attributes, setAttributes }) {
  const {
    baseImage,
    revealImage,
    radius,
    feather,
    ease,
    borderRadius,
  } = attributes;

  const blockProps = useBlockProps({ className: 'beeseen-reveal' });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Reveal settings', 'beeseen')}>
          <RangeControl
            label={__('Reveal radius (px)', 'beeseen')}
            value={radius}
            onChange={(v) => setAttributes({ radius: v })}
            min={40}
            max={320}
          />
          <RangeControl
            label={__('Feather (px)', 'beeseen')}
            value={feather}
            onChange={(v) => setAttributes({ feather: v })}
            min={0}
            max={220}
          />
          <RangeControl
            label={__('Ease (smoothing)', 'beeseen')}
            value={ease}
            onChange={(v) => setAttributes({ ease: v })}
            min={0.05}
            max={0.35}
            step={0.01}
          />
          <RangeControl
            label={__('Border radius (px)', 'beeseen')}
            value={borderRadius}
            onChange={(v) => setAttributes({ borderRadius: v })}
            min={0}
            max={40}
          />
        </PanelBody>

        <PanelBody title={__('Images', 'beeseen')} initialOpen={true}>
          <ImagePicker
            label={__('Base image', 'beeseen')}
            image={baseImage}
            onSelect={(img) => setAttributes({ baseImage: img })}
            onRemove={() => setAttributes({ baseImage: null })}
          />
          <div style={{ height: '8px' }} />
          <ImagePicker
            label={__('Reveal image', 'beeseen')}
            image={revealImage}
            onSelect={(img) => setAttributes({ revealImage: img })}
            onRemove={() => setAttributes({ revealImage: null })}
          />
          {(!baseImage || !revealImage) && (
            <p className="beeseen-reveal__hint">
              {__('Select both images. Reveal runs on the front-end.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-radius={radius}
        data-feather={feather}
        data-ease={ease}
        style={{
          ['--beeseen-reveal-radius']: `${radius}px`,
          ['--beeseen-reveal-feather']: `${feather}px`,
          ['--beeseen-reveal-br']: `${borderRadius}px`,
        }}
      >
        <div className="beeseen-reveal__frame">
          {baseImage?.url ? (
            <img className="beeseen-reveal__img beeseen-reveal__img--base" src={baseImage.url} alt={baseImage.alt || ''} />
          ) : (
            <div className="beeseen-reveal__empty">Bee Reveal — select base + reveal images.</div>
          )}

          {revealImage?.url ? (
            <img className="beeseen-reveal__img beeseen-reveal__img--reveal" src={revealImage.url} alt={revealImage.alt || ''} />
          ) : null}
        </div>
      </div>
    </>
  );
}
