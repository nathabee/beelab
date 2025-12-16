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
    items,
    height,
    gap,
    radius,
    perspective,
    rotateMax,
    scaleMin,
    liftMax,
    fade,
    fit,
  } = attributes;

  const onSelectImages = (newImages) => {
    const normalized = (newImages || []).map(normalizeImage).filter((x) => x.url);
    setAttributes({ items: normalized });
  };

  const blockProps = useBlockProps({ className: 'beeseen-persp' });

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Perspective Scroll', 'beeseen')}>
          <RangeControl
            label={__('Card height (px)', 'beeseen')}
            value={height}
            onChange={(v) => setAttributes({ height: v })}
            min={220}
            max={820}
          />
          <RangeControl
            label={__('Gap (px)', 'beeseen')}
            value={gap}
            onChange={(v) => setAttributes({ gap: v })}
            min={0}
            max={80}
          />
          <RangeControl
            label={__('Radius (px)', 'beeseen')}
            value={radius}
            onChange={(v) => setAttributes({ radius: v })}
            min={0}
            max={40}
          />
          <RangeControl
            label={__('Perspective', 'beeseen')}
            value={perspective}
            onChange={(v) => setAttributes({ perspective: v })}
            min={400}
            max={1600}
            step={10}
          />
          <RangeControl
            label={__('Max rotateX (deg)', 'beeseen')}
            value={rotateMax}
            onChange={(v) => setAttributes({ rotateMax: v })}
            min={0}
            max={24}
            step={1}
          />
          <RangeControl
            label={__('Min scale', 'beeseen')}
            value={scaleMin}
            onChange={(v) => setAttributes({ scaleMin: v })}
            min={0.85}
            max={1}
            step={0.01}
          />
          <RangeControl
            label={__('Max lift (px)', 'beeseen')}
            value={liftMax}
            onChange={(v) => setAttributes({ liftMax: v })}
            min={0}
            max={60}
            step={1}
          />
          <ToggleControl
            label={__('Fade out when far', 'beeseen')}
            checked={!!fade}
            onChange={(v) => setAttributes({ fade: !!v })}
          />
          <SelectControl
            label={__('Image fit', 'beeseen')}
            value={fit}
            options={[
              { label: __('Fill (crop)', 'beeseen'), value: 'cover' },
              { label: __('Show full image', 'beeseen'), value: 'contain' }
            ]}
            onChange={(v) => setAttributes({ fit: v })}
          />
        </PanelBody>

        <PanelBody title={__('Images', 'beeseen')} initialOpen={true}>
          <MediaUploadCheck>
            <MediaUpload
              onSelect={onSelectImages}
              allowedTypes={['image']}
              multiple
              gallery
              value={(items || []).map((i) => i.id).filter(Boolean)}
              render={({ open }) => (
                <Button variant="primary" onClick={open}>
                  {items?.length ? __('Edit images', 'beeseen') : __('Select images', 'beeseen')}
                </Button>
              )}
            />
          </MediaUploadCheck>
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-fit={fit}
        data-fade={fade ? '1' : '0'}
        data-perspective={perspective}
        data-rotate-max={rotateMax}
        data-scale-min={scaleMin}
        data-lift-max={liftMax}
        style={{
          ['--beeseen-persp-height']: `${height}px`,
          ['--beeseen-persp-gap']: `${gap}px`,
          ['--beeseen-persp-radius']: `${radius}px`,
          ['--beeseen-persp-perspective']: `${perspective}px`,
        }}
      >
        <div className="beeseen-persp__track">
          {items?.length ? (
            items.map((img, idx) => (
              <figure className="beeseen-persp__card" key={`${img.id ?? img.url}-${idx}`}>
                <div className="beeseen-persp__media">
                  <img src={img.url} alt={img.alt || ''} />
                </div>
                {!!img.caption && <figcaption className="beeseen-persp__cap">{img.caption}</figcaption>}
              </figure>
            ))
          ) : (
            <div className="beeseen-persp__empty">Bee Perspective Scroll — select images.</div>
          )}
        </div>
      </div>
    </>
  );
}
