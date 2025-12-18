import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const { cards, throwX, throwY, throwRot, throwMs } = attributes;

  return (
    <div
      {...useBlockProps.save({
        className: 'bee-shuffle',
        'data-throw-x': String(throwX),
        'data-throw-y': String(throwY),
        'data-throw-rot': String(throwRot),
        'data-throw-ms': String(throwMs),
      })}
    >
      <div className="bee-shuffle__deck" role="group" aria-label="Shuffle deck">
        <div className="bee-shuffle__stack">
          {(cards || []).map((c, idx) => (
            <article className="bee-shuffle__card" key={idx}>
              {c?.image?.url ? (
                <div className="bee-shuffle__media">
                  <img src={c.image.url} alt={c.image.alt || ''} loading="lazy" />
                </div>
              ) : null}

              <div className="bee-shuffle__body">
                {c?.title ? <h3 className="bee-shuffle__title">{c.title}</h3> : null}
                {c?.text ? <p className="bee-shuffle__text">{c.text}</p> : null}

                {c?.linkUrl ? (
                  <a className="bee-shuffle__link" href={c.linkUrl}>
                    Open
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
