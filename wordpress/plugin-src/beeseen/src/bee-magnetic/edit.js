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

export default function Edit({ attributes, setAttributes }) {
  const {
    image,
    strength,
    maxOffset,
    ease,
    lift,
    borderRadius,
  } = attributes;

  const onSelect = (img) => setAttributes({ image: normalizeImage(img) });
  const onRemove = () => setAttributes({ image: null });

  const blockProps = useBlockProps({
    className: 'beeseen-magnetic',
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Magnetic settings', 'beeseen')}>
          <RangeControl
            label={__('Strength', 'beeseen')}
            value={strength}
            onChange={(v) => setAttributes({ strength: v })}
            min={0}
            max={60}
          />
          <RangeControl
            label={__('Max offset (px)', 'beeseen')}
            value={maxOffset}
            onChange={(v) => setAttributes({ maxOffset: v })}
            min={0}
            max={80}
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
            label={__('Hover lift (px)', 'beeseen')}
            value={lift}
            onChange={(v) => setAttributes({ lift: v })}
            min={0}
            max={24}
          />
          <RangeControl
            label={__('Border radius (px)', 'beeseen')}
            value={borderRadius}
            onChange={(v) => setAttributes({ borderRadius: v })}
            min={0}
            max={40}
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
            <p className="beeseen-magnetic__hint">
              {__('Select an image. Magnetic drift runs on the front-end.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-strength={strength}
        data-max-offset={maxOffset}
        data-ease={ease}
        data-lift={lift}
        style={{ ['--beeseen-magnetic-radius']: `${borderRadius}px` }}
      >
        <div className="beeseen-magnetic__frame">
          {image ? (
            <img className="beeseen-magnetic__img" src={image.url} alt={image.alt || ''} />
          ) : (
            <div className="beeseen-magnetic__empty">Bee Magnetic — select an image.</div>
          )}
        </div>
      </div>
    </>
  );
}
