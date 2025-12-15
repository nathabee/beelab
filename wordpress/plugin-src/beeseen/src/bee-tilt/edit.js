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
  ToggleControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
  return {
    id: img.id ?? null,
    url: img.url ?? img.source_url ?? '',
    alt: img.alt ?? img.alt_text ?? '',
  };
}

export default function Edit({ attributes, setAttributes }) {
  const {
    image,
    maxTilt,
    perspective,
    glare,
    glareStrength,
    borderRadius,
  } = attributes;

  const onSelect = (img) => setAttributes({ image: normalizeImage(img) });
  const onRemove = () => setAttributes({ image: null });

  const blockProps = useBlockProps({
    className: 'beeseen-tilt',
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Tilt settings', 'beeseen')}>
          <RangeControl
            label={__('Max tilt (degrees)', 'beeseen')}
            value={maxTilt}
            onChange={(v) => setAttributes({ maxTilt: v })}
            min={0}
            max={25}
          />
          <RangeControl
            label={__('Perspective', 'beeseen')}
            value={perspective}
            onChange={(v) => setAttributes({ perspective: v })}
            min={300}
            max={2000}
          />
          <RangeControl
            label={__('Border radius (px)', 'beeseen')}
            value={borderRadius}
            onChange={(v) => setAttributes({ borderRadius: v })}
            min={0}
            max={40}
          />
          <ToggleControl
            label={__('Glare highlight', 'beeseen')}
            checked={!!glare}
            onChange={(v) => setAttributes({ glare: !!v })}
          />
          <RangeControl
            label={__('Glare strength', 'beeseen')}
            value={glareStrength}
            onChange={(v) => setAttributes({ glareStrength: v })}
            min={0}
            max={0.6}
            step={0.01}
            disabled={!glare}
          />
        </PanelBody>

        <PanelBody title={__('Image', 'beeseen')} initialOpen={true}>
          <MediaUploadCheck>
            <MediaUpload
              onSelect={onSelect}
              allowedTypes={['image']}
              multiple={false}
              value={image?.id ?? 0}
              render={({ open }) => (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button variant="primary" onClick={open}>
                    {image ? __('Replace image', 'beeseen') : __('Select image', 'beeseen')}
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

          {!image && (
            <p className="beeseen-tilt__hint">
              {__('Select an image. Tilt runs on the front-end.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-max-tilt={maxTilt}
        data-perspective={perspective}
        data-glare={glare ? '1' : '0'}
        data-glare-strength={glareStrength}
        style={{ ['--beeseen-tilt-radius']: `${borderRadius}px` }}
      >
        <div className="beeseen-tilt__card">
          {image ? (
            <img className="beeseen-tilt__img" src={image.url} alt={image.alt || ''} />
          ) : (
            <div className="beeseen-tilt__empty">Bee Tilt — select an image.</div>
          )}
          <div className="beeseen-tilt__glare" aria-hidden="true" />
        </div>
      </div>
    </>
  );
}
