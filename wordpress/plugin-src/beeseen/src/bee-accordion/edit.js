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
  SelectControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
  return {
    id: img.id ?? null,
    url: img.url ?? img.source_url ?? '',
    alt: img.alt ?? img.alt_text ?? '',
    caption: img.caption ?? img.title ?? '',
  };
}

export default function Edit({ attributes, setAttributes }) {
  const {
    images,
    gap,
    height,
    radius,
    expand,
    fit,
    showCaption,
  } = attributes;

  const onSelectImages = (newImages) => {
    const normalized = (newImages || [])
      .map(normalizeImage)
      .filter((x) => x.url);
    setAttributes({ images: normalized });
  };

  const blockProps = useBlockProps({ className: 'beeseen-accordion' });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Accordion settings', 'beeseen')}>
          <RangeControl
            label={__('Height (px)', 'beeseen')}
            value={height}
            onChange={(v) => setAttributes({ height: v })}
            min={220}
            max={720}
          />
          <RangeControl
            label={__('Gap (px)', 'beeseen')}
            value={gap}
            onChange={(v) => setAttributes({ gap: v })}
            min={0}
            max={48}
          />
          <RangeControl
            label={__('Radius (px)', 'beeseen')}
            value={radius}
            onChange={(v) => setAttributes({ radius: v })}
            min={0}
            max={40}
          />
          <RangeControl
            label={__('Expand factor', 'beeseen')}
            value={expand}
            onChange={(v) => setAttributes({ expand: v })}
            min={2}
            max={12}
          />
          <SelectControl
            label={__('Image fit', 'beeseen')}
            value={fit}
            options={[
              { label: __('Fill (crop)', 'beeseen'), value: 'cover' },
              { label: __('Show full image', 'beeseen'), value: 'contain' },
            ]}
            onChange={(v) => setAttributes({ fit: v })}
          />
          <ToggleControl
            label={__('Show caption overlay', 'beeseen')}
            checked={!!showCaption}
            onChange={(v) => setAttributes({ showCaption: !!v })}
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
                  {images?.length ? __('Edit images', 'beeseen') : __('Select images', 'beeseen')}
                </Button>
              )}
            />
          </MediaUploadCheck>

          {!images?.length && (
            <p className="beeseen-accordion__hint">
              {__('Select images to build the accordion.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-fit={fit}
        data-show-caption={showCaption ? '1' : '0'}
        style={{
          ['--beeseen-acc-gap']: `${gap}px`,
          ['--beeseen-acc-height']: `${height}px`,
          ['--beeseen-acc-radius']: `${radius}px`,
          ['--beeseen-acc-expand']: expand,
        }}
      >
        <div className="beeseen-accordion__track">
          {images?.length ? (
            images.map((img, idx) => (
              <button
                type="button"
                className="beeseen-accordion__panel"
                key={`${img.id ?? img.url}-${idx}`}
              >
                <img className="beeseen-accordion__img" src={img.url} alt={img.alt || ''} />
                {showCaption && (
                  <span className="beeseen-accordion__caption">
                    {img.caption || __('Image', 'beeseen')}
                  </span>
                )}
              </button>
            ))
          ) : (
            <div className="beeseen-accordion__empty">Bee Accordion Gallery — select images.</div>
          )}
        </div>
      </div>
    </>
  );
}
