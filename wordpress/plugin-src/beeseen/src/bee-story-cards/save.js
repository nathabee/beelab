import { useBlockProps, RichText } from '@wordpress/block-editor';

export default function save({ attributes }) {
  const {
    cards,
    autoplay,
    durationMs,
    transitionMs,
    transition,
    pauseOnHover,
    showControls,
    overlay,
    textAlign,
    textPosition, // now used for caption alignment, not overlay position
    rounded,
    imageFit,
    aspect,
  } = attributes;

  return (
    <section
      {...useBlockProps.save({ className: 'beeseen-story-cards' })}
      data-autoplay={autoplay ? '1' : '0'}
      data-duration-ms={durationMs}
      data-transition-ms={transitionMs}
      data-transition={transition}
      data-pause-on-hover={pauseOnHover ? '1' : '0'}
      data-show-controls={showControls ? '1' : '0'}
      data-text-position={textPosition}
      data-rounded={rounded ? '1' : '0'}
      data-image-fit={imageFit}
      data-aspect={aspect}
      style={{ '--beeseen-sc-overlay': overlay, textAlign }}
    >
      {/* STAGE: IMAGE ONLY */}
      <div className="beeseen-sc__stage" aria-live="off">
        <div className="beeseen-sc__slides beeseen-sc__slides--media">
          {(cards || []).map((c, idx) => (
            <article
              className="beeseen-sc__slide beeseen-sc__slide--media"
              key={`media-${c.id ?? c.url}-${idx}`}
              data-index={idx}
              aria-hidden="true"
            >
              <div className="beeseen-sc__media">
                <img src={c.url} alt={c.alt || ''} loading="lazy" />
              </div>
            </article>
          ))}
        </div>

        <div className="beeseen-sc__ui" aria-hidden="true">
          <button className="beeseen-sc__btn beeseen-sc__prev" type="button">Prev</button>
          <div className="beeseen-sc__dots" />
          <button className="beeseen-sc__btn beeseen-sc__next" type="button">Next</button>
        </div>
      </div>

      {/* CAPTION: BELOW IMAGE */}
      <div className="beeseen-sc__captionWrap">
        <div className="beeseen-sc__slides beeseen-sc__slides--caption">
          {(cards || []).map((c, idx) => (
            <article
              className={['beeseen-sc__slide', 'beeseen-sc__slide--caption'].join(' ')}
              key={`cap-${c.id ?? c.url}-${idx}`}
              data-index={idx}
            >
              <div className={['beeseen-sc__content', `pos-${textPosition}`].join(' ')}>
                <RichText.Content tagName="h2" value={c.title} />
                <RichText.Content tagName="p" value={c.text} />
              </div>
            </article>
          ))}
        </div>
      </div>

      <noscript>
        <div className="beeseen-sc__noscript">
          {(cards || []).map((c, idx) => (
            <div key={`${c.id ?? c.url}-${idx}`} className="beeseen-sc__noscriptRow">
              <img src={c.url} alt={c.alt || ''} loading="lazy" />
              {c.title ? <h3>{c.title}</h3> : null}
              {c.text ? <p>{c.text}</p> : null}
            </div>
          ))}
        </div>
      </noscript>
    </section>
  );
}
