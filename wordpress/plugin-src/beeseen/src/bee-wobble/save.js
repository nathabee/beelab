import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const { images, columns, gap, intensity, lift, enableWobble } = attributes;

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-wobble' })}
      data-columns={columns}
      data-gap={gap}
      data-intensity={intensity}
      data-lift={lift}
      data-enable-wobble={enableWobble ? '1' : '0'}
      style={{
        ['--beeseen-wobble-columns']: columns,
        ['--beeseen-wobble-gap']: `${gap}px`,
      }}
    >
      <div className="beeseen-wobble__grid">
        {(images || []).map((img, idx) => (
          <figure className="beeseen-wobble__item" key={`${img.id ?? img.url}-${idx}`}>
            <img src={img.url} alt={img.alt || ''} loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}
