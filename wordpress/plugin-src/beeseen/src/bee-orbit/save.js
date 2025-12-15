import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const {
    images,
    radius,
    itemSize,
    enableWheel,
    enableInertia,
    friction,
  } = attributes;

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-orbit' })}
      data-radius={radius}
      data-item-size={itemSize}
      data-enable-wheel={enableWheel ? '1' : '0'}
      data-enable-inertia={enableInertia ? '1' : '0'}
      data-friction={friction}
    >
      <div className="beeseen-orbit__stage">
        {(images || []).map((img, idx) => (
          <figure className="beeseen-orbit__item" key={`${img.id ?? img.url}-${idx}`}>
            <img src={img.url} alt={img.alt || ''} loading="lazy" />
          </figure>
        ))}
      </div>
    </div>
  );
}
