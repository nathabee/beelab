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
    images,
    radius,
    itemSize,
    enableWheel,
    enableInertia,
    friction,
  } = attributes;

  const onSelectImages = (newImages) => {
    const normalized = (newImages || [])
      .map(normalizeImage)
      .filter((x) => x.url);
    setAttributes({ images: normalized });
  };

  const blockProps = useBlockProps({
    className: 'beeseen-orbit',
  });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Orbit settings', 'beeseen')}>
          <RangeControl
            label={__('Radius', 'beeseen')}
            value={radius}
            onChange={(v) => setAttributes({ radius: v })}
            min={80}
            max={420}
          />
          <RangeControl
            label={__('Item size', 'beeseen')}
            value={itemSize}
            onChange={(v) => setAttributes({ itemSize: v })}
            min={48}
            max={180}
          />
          <ToggleControl
            label={__('Enable mouse wheel rotation', 'beeseen')}
            checked={!!enableWheel}
            onChange={(v) => setAttributes({ enableWheel: !!v })}
          />
          <ToggleControl
            label={__('Enable inertia', 'beeseen')}
            checked={!!enableInertia}
            onChange={(v) => setAttributes({ enableInertia: !!v })}
          />
          <RangeControl
            label={__('Inertia friction', 'beeseen')}
            value={friction}
            onChange={(v) => setAttributes({ friction: v })}
            min={4}
            max={20}
            disabled={!enableInertia}
          />
        </PanelBody>

        <PanelBody title={__('Images', 'beeseen')} initialOpen={true}>
          <MediaUploadCheck>
            <MediaUpload
              onSelect={onSelectImages}
              allowedTypes={['image']}
              multiple
              gallery
              value={(images || []).map((i) => i.id).filter(Boolean)}
              render={({ open }) => (
                <Button variant="primary" onClick={open}>
                  {images?.length
                    ? __('Edit images', 'beeseen')
                    : __('Select images', 'beeseen')}
                </Button>
              )}
            />
          </MediaUploadCheck>

          {images?.length ? (
            <p className="beeseen-orbit__hint">
              {__(
                'Tip: drag rotation runs on the front-end. Editor preview is static.',
                'beeseen'
              )}
            </p>
          ) : (
            <p className="beeseen-orbit__hint">
              {__('Select a few images to start.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-radius={radius}
        data-item-size={itemSize}
        data-enable-wheel={enableWheel ? '1' : '0'}
        data-enable-inertia={enableInertia ? '1' : '0'}
        data-friction={friction}
      >
        <div
          className="beeseen-orbit__stage"
          style={{ height: Math.max(260, radius * 2 + itemSize) }}
        >
          {images?.length ? (
            images.map((img, idx) => (
              <figure
                className="beeseen-orbit__item"
                key={`${img.id ?? img.url}-${idx}`}
                style={{ width: itemSize, height: itemSize }}
              >
                <img src={img.url} alt={img.alt || ''} />
              </figure>
            ))
          ) : (
            <div className="beeseen-orbit__empty">
              Bee Orbit (placeholder) — select images in the sidebar.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
