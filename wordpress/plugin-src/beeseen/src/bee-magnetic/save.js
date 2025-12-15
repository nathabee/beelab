import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const { image, strength, maxOffset, ease, lift, borderRadius } = attributes;

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-magnetic' })}
      data-strength={strength}
      data-max-offset={maxOffset}
      data-ease={ease}
      data-lift={lift}
      style={{ ['--beeseen-magnetic-radius']: `${borderRadius}px` }}
    >
      <div className="beeseen-magnetic__frame">
        {image?.url ? (
          <img
            className="beeseen-magnetic__img"
            src={image.url}
            alt={image.alt || ''}
            loading="lazy"
          />
        ) : null}
      </div>
    </div>
  );
}
