import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const { images, gap, height, radius, expand, fit, showCaption } = attributes;

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-accordion' })}
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
        {(images || []).map((img, idx) => (
          <button
            type="button"
            className="beeseen-accordion__panel"
            key={`${img.id ?? img.url}-${idx}`}
          >
            <img
              className="beeseen-accordion__img"
              src={img.url}
              alt={img.alt || ''}
              loading="lazy"
            />
            {showCaption ? (
              <span className="beeseen-accordion__caption">{img.caption || ''}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
