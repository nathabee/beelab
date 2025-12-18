import { __ } from '@wordpress/i18n';
import {
  useBlockProps,
  InspectorControls,
  MediaUpload,
  MediaUploadCheck,
} from '@wordpress/block-editor';
import {
  PanelBody,
  Button,
  TextControl,
  TextareaControl,
  RangeControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
  return {
    id: img?.id ?? null,
    url: img?.url ?? img?.source_url ?? '',
    alt: img?.alt ?? img?.alt_text ?? '',
  };
}

function normalizeCard(card) {
  return {
    title: card?.title ?? '',
    text: card?.text ?? '',
    linkUrl: card?.linkUrl ?? '',
    image: {
      id: card?.image?.id ?? null,
      url: card?.image?.url ?? '',
      alt: card?.image?.alt ?? '',
    },
  };
}

export default function Edit({ attributes, setAttributes }) {
  const { cards, throwX, throwY, throwRot, throwMs } = attributes;
  const deck = (cards || []).map(normalizeCard);

  const setDeck = (next) => setAttributes({ cards: next.map(normalizeCard) });

  const addCard = () => {
    setDeck([
      ...deck,
      {
        title: __('New card', 'beeseen'),
        text: '',
        linkUrl: '',
        image: { id: null, url: '', alt: '' },
      },
    ]);
  };

  const removeCard = (idx) => {
    const next = deck.slice();
    next.splice(idx, 1);
    setDeck(next);
  };

  const updateCard = (idx, patch) => {
    const next = deck.slice();
    next[idx] = normalizeCard({ ...next[idx], ...patch });
    setDeck(next);
  };

  const updateCardImage = (idx, img) => {
    updateCard(idx, { image: normalizeImage(img) });
  };

  const blockProps = useBlockProps({ className: 'bee-shuffle' });

  // Editor preview: show the TOP card as the last one (because absolute-positioned last paints on top)
  const previewCards = deck.slice(Math.max(0, deck.length - 4));

  return (
    <>
      <InspectorControls>
        <PanelBody title={__('Bee Shuffle Deck settings', 'beeseen')}>
          <RangeControl
            label={__('Throw X (px)', 'beeseen')}
            value={throwX}
            onChange={(v) => setAttributes({ throwX: v })}
            min={-300}
            max={300}
          />
          <RangeControl
            label={__('Throw Y (px)', 'beeseen')}
            value={throwY}
            onChange={(v) => setAttributes({ throwY: v })}
            min={-300}
            max={300}
          />
          <RangeControl
            label={__('Throw rotation (deg)', 'beeseen')}
            value={throwRot}
            onChange={(v) => setAttributes({ throwRot: v })}
            min={-45}
            max={45}
          />
          <RangeControl
            label={__('Duration (ms)', 'beeseen')}
            value={throwMs}
            onChange={(v) => setAttributes({ throwMs: v })}
            min={150}
            max={1200}
          />
        </PanelBody>

        <PanelBody title={__('Cards', 'beeseen')} initialOpen={true}>
          <Button variant="primary" onClick={addCard}>
            {__('Add card', 'beeseen')}
          </Button>

          <div className="bee-shuffle__cardsEditor">
            {deck.length ? (
              deck.map((c, idx) => (
                <div className="bee-shuffle__cardEditor" key={idx}>
                  <div className="bee-shuffle__cardEditorRow">
                    <strong>
                      {__('Card', 'beeseen')} {idx + 1}
                    </strong>
                    <Button
                      variant="tertiary"
                      isDestructive
                      onClick={() => removeCard(idx)}
                    >
                      {__('Remove', 'beeseen')}
                    </Button>
                  </div>

                  <TextControl
                    label={__('Title', 'beeseen')}
                    value={c.title}
                    onChange={(v) => updateCard(idx, { title: v })}
                  />

                  <TextareaControl
                    label={__('Text', 'beeseen')}
                    value={c.text}
                    onChange={(v) => updateCard(idx, { text: v })}
                  />

                  <TextControl
                    label={__('Link URL', 'beeseen')}
                    value={c.linkUrl}
                    onChange={(v) => updateCard(idx, { linkUrl: v })}
                    placeholder="https://..."
                  />

                  <MediaUploadCheck>
                    <MediaUpload
                      onSelect={(img) => updateCardImage(idx, img)}
                      allowedTypes={['image']}
                      value={c.image?.id || undefined}
                      render={({ open }) => (
                        <Button variant="secondary" onClick={open}>
                          {c.image?.url
                            ? __('Change image', 'beeseen')
                            : __('Select image', 'beeseen')}
                        </Button>
                      )}
                    />
                  </MediaUploadCheck>

                  {c.image?.url ? (
                    <div className="bee-shuffle__thumb">
                      <img src={c.image.url} alt={c.image.alt || ''} />
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="bee-shuffle__hint">{__('Add at least one card.', 'beeseen')}</p>
            )}
          </div>
        </PanelBody>
      </InspectorControls>

      <div
        {...blockProps}
        data-throw-x={throwX}
        data-throw-y={throwY}
        data-throw-rot={throwRot}
        data-throw-ms={throwMs}
      >
        <div className="bee-shuffle__deckPreview" aria-label="Deck preview">
          <div className="bee-shuffle__stack">
            {previewCards.length ? (
              previewCards.map((c, idx) => (
                <article className="bee-shuffle__card" key={idx}>
                  {c.image?.url ? (
                    <div className="bee-shuffle__media">
                      <img src={c.image.url} alt={c.image.alt || ''} />
                    </div>
                  ) : null}

                  <div className="bee-shuffle__body">
                    {c.title ? <h3 className="bee-shuffle__title">{c.title}</h3> : null}
                    {c.text ? <p className="bee-shuffle__text">{c.text}</p> : null}
                    <p className="bee-shuffle__meta">
                      {__('Front-end: click to throw & cycle.', 'beeseen')}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <div className="bee-shuffle__empty">
                Bee Shuffle Deck — {__('add cards in the sidebar.', 'beeseen')}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
