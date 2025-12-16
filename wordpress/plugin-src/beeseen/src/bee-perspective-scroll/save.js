import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
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

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-persp' })}
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
        {(items || []).map((img, idx) => (
          <figure className="beeseen-persp__card" key={`${img.id ?? img.url}-${idx}`}>
            <div className="beeseen-persp__media">
              <img src={img.url} alt={img.alt || ''} loading="lazy" />
            </div>
            {!!img.caption && <figcaption className="beeseen-persp__cap">{img.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </div>
  );
}
