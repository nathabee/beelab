import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const {
    image,
    maxTilt,
    perspective,
    glare,
    glareStrength,
    borderRadius,
  } = attributes;

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-tilt' })}
      data-max-tilt={maxTilt}
      data-perspective={perspective}
      data-glare={glare ? '1' : '0'}
      data-glare-strength={glareStrength}
      style={{ ['--beeseen-tilt-radius']: `${borderRadius}px` }}
    >
      <div className="beeseen-tilt__card">
        {image?.url ? (
          <img className="beeseen-tilt__img" src={image.url} alt={image.alt || ''} loading="lazy" />
        ) : null}
        <div className="beeseen-tilt__glare" aria-hidden="true" />
      </div>
    </div>
  );
}
