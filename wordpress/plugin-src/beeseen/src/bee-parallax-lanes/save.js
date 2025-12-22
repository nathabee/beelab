import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const {
    images,
    laneCount,
    laneGap,
    imageGap,
    maxShift,
    speeds,
    cropMode,
    rounded,
  } = attributes;

  const lc = Math.max(1, Math.min(6, Number(laneCount || 3)));
  const safeSpeeds = Array.isArray(speeds) ? speeds.slice(0, lc) : [];
  while (safeSpeeds.length < lc) safeSpeeds.push(0.25);

  const lanes = Array.from({ length: lc }, () => []);
  (images || []).forEach((img, i) => lanes[i % lc].push(img));

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-parallax' })}
      data-max-shift={maxShift}
      data-crop-mode={cropMode}
      data-rounded={rounded ? '1' : '0'}
      style={{
        '--beeseen-lane-gap': `${laneGap}px`,
        '--beeseen-image-gap': `${imageGap}px`,
      }}
    >
      <div className="beeseen-parallax__lanes">
        {lanes.map((laneImgs, laneIdx) => (
          <div
            className="beeseen-parallax__lane"
            key={`lane-${laneIdx}`}
            data-speed={String(safeSpeeds[laneIdx] ?? 0)}
          >
            {laneImgs.map((img, idx) => (
              <figure
                className={[
                  'beeseen-parallax__item',
                  rounded ? 'is-rounded' : '',
                ].join(' ')}
                key={`${img.id ?? img.url}-${idx}`}
              >
                <img src={img.url} alt={img.alt || ''} loading="lazy" />
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
