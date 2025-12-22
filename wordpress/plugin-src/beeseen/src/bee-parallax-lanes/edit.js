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
  TextControl,
  ToggleControl,
  SelectControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
  return {
    id: img.id ?? null,
    url: img.url ?? img.source_url ?? '',
    alt: img.alt ?? img.alt_text ?? '',
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ensureSpeedsArray(speeds, laneCount) {
  const base = Array.isArray(speeds) ? speeds.slice(0, laneCount) : [];
  while (base.length < laneCount) {
    const last = base.length ? base[base.length - 1] : 0.25;
    base.push(last);
  }
  return base;
}

export default function Edit({ attributes, setAttributes }) {
  const {
    images,
    laneCount,
    laneGap,
    imageGap,
    maxShift,
    speeds,
    cropMode,
    rounded,
		 aspectRatio, focusX, focusY,
  } = attributes;



  const safeLaneCount = clamp(Number(laneCount || 3), 1, 6);
  const safeSpeeds = ensureSpeedsArray(speeds, safeLaneCount);

  const onSelectImages = (newImages) => {
    const normalized = (newImages || [])
      .map(normalizeImage)
      .filter((x) => x.url);
    setAttributes({ images: normalized });
  };

  const updateLaneCount = (v) => {
    const next = clamp(Number(v || 3), 1, 6);
    setAttributes({
      laneCount: next,
      speeds: ensureSpeedsArray(safeSpeeds, next),
    });
  };

  const updateSpeedAt = (idx, value) => {
    const next = safeSpeeds.slice();
    next[idx] = Number(value ?? 0);
    setAttributes({ speeds: next });
  };

  const blockProps = useBlockProps({
    className: 'beeseen-parallax',
  });

  // Simple static preview layout: distribute images into lanes round-robin
  const lanes = Array.from({ length: safeLaneCount }, () => []);
  (images || []).forEach((img, i) => lanes[i % safeLaneCount].push(img));

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Parallax Lanes settings', 'beeseen')}>
          <RangeControl
            label={__('Lane count', 'beeseen')}
            value={safeLaneCount}
            onChange={updateLaneCount}
            min={1}
            max={6}
          />
          <RangeControl
            label={__('Lane gap (px)', 'beeseen')}
            value={laneGap}
            onChange={(v) => setAttributes({ laneGap: v })}
            min={0}
            max={64}
          />
          <RangeControl
            label={__('Image gap (px)', 'beeseen')}
            value={imageGap}
            onChange={(v) => setAttributes({ imageGap: v })}
            min={0}
            max={64}
          />
          <RangeControl
            label={__('Max shift (px)', 'beeseen')}
            value={maxShift}
            onChange={(v) => setAttributes({ maxShift: v })}
            min={0}
            max={420}
          />

          <SelectControl
            label={__('Crop mode', 'beeseen')}
            value={cropMode}
            options={[
              { label: __('Cover', 'beeseen'), value: 'cover' },
              { label: __('Contain', 'beeseen'), value: 'contain' },
            ]}
            onChange={(v) => setAttributes({ cropMode: v })}
          />

					<SelectControl
						label={__('Image ratio', 'beeseen')}
						value={aspectRatio}
						options={[
							{ label: __('Auto (natural)', 'beeseen'), value: 'auto' },
							{ label: '1:1', value: '1/1' },
							{ label: '4:3', value: '4/3' },
							{ label: '3:4', value: '3/4' },
							{ label: '16:9', value: '16/9' },
							{ label: '9:16', value: '9/16' },
						]}
						onChange={(v) => setAttributes({ aspectRatio: v })}
					/>

					<RangeControl
						label={__('Crop focus X (%)', 'beeseen')}
						value={focusX}
						onChange={(v) => setAttributes({ focusX: v })}
						min={0}
						max={100}
					/>

					<RangeControl
						label={__('Crop focus Y (%)', 'beeseen')}
						value={focusY}
						onChange={(v) => setAttributes({ focusY: v })}
						min={0}
						max={100}
					/>

          <ToggleControl
            label={__('Rounded images', 'beeseen')}
            checked={!!rounded}
            onChange={(v) => setAttributes({ rounded: !!v })}
          />
        </PanelBody>

        <PanelBody title={__('Lane speeds', 'beeseen')} initialOpen={false}>
          {safeSpeeds.map((s, idx) => (
            <TextControl
              key={`speed-${idx}`}
              label={sprintf(__('Lane %d speed', 'beeseen'), idx + 1)}
              help={__('Use values like 0.35, -0.2, 0.1. Negative reverses direction.', 'beeseen')}
              value={String(s)}
              onChange={(v) => updateSpeedAt(idx, v)}
            />
          ))}
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
            <p className="beeseen-parallax__hint">
              {__(
                'Front-end preview animates on scroll. Editor preview is static.',
                'beeseen'
              )}
            </p>
          ) : (
            <p className="beeseen-parallax__hint">
              {__('Select a few images to start.', 'beeseen')}
            </p>
          )}
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        style={{
          '--beeseen-lane-gap': `${laneGap}px`,
          '--beeseen-image-gap': `${imageGap}px`,
        }}
      >
        {images?.length ? (
          <div className="beeseen-parallax__lanes">
            {lanes.map((laneImgs, laneIdx) => (
              <div className="beeseen-parallax__lane" key={`lane-${laneIdx}`}>
                {laneImgs.map((img, i) => (
                  <figure
                    className={[
                      'beeseen-parallax__item',
                      rounded ? 'is-rounded' : '',
                    ].join(' ')}
                    key={`${img.id ?? img.url}-${i}`}
                  >
									<img
										src={img.url}
										alt={img.alt || ''}
										style={{
											objectFit: cropMode,
											objectPosition: `${focusX}% ${focusY}%`,
										}}
									/>

                  </figure>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="beeseen-parallax__empty">
            Bee Parallax Lanes — select images in the sidebar.
          </div>
        )}
      </div>
    </>
  );
}

// WP i18n sprintf (small helper)
function sprintf(format, ...args) {
  let i = 0;
  return format.replace(/%d/g, () => String(args[i++]));
}
