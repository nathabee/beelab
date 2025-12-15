import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const { baseImage, revealImage, radius, feather, ease, borderRadius } = attributes;

  return (
    <div
      {...useBlockProps.save({ className: 'beeseen-reveal' })}
      data-radius={radius}
      data-feather={feather}
      data-ease={ease}
      style={{
        ['--beeseen-reveal-radius']: `${radius}px`,
        ['--beeseen-reveal-feather']: `${feather}px`,
        ['--beeseen-reveal-br']: `${borderRadius}px`,
      }}
    >
      <div className="beeseen-reveal__frame">
        {baseImage?.url ? (
          <img className="beeseen-reveal__img beeseen-reveal__img--base" src={baseImage.url} alt={baseImage.alt || ''} loading="lazy" />
        ) : null}

        {revealImage?.url ? (
          <img className="beeseen-reveal__img beeseen-reveal__img--reveal" src={revealImage.url} alt={revealImage.alt || ''} loading="lazy" />
        ) : null}
      </div>
    </div>
  );
}
