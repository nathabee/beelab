import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, Button, TextControl, ColorPicker } from '@wordpress/components';

function normalizeItem(item) {
  return {
    label: item?.label ?? 'Choice',
    imgUrl: item?.imgUrl ?? '',
    linkUrl: item?.linkUrl ?? '',
    resultText: item?.resultText ?? '',
    color: item?.color ?? '#e6e6e6',
  };
}

export default function Edit({ attributes, setAttributes }) {
  const items = (attributes.items || []).map(normalizeItem);
  const blockProps = useBlockProps();

  const setItem = (idx, patch) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    setAttributes({ items: next });
  };

  const addItem = () => {
    setAttributes({
      items: [...items, normalizeItem({ label: 'Choice', color: '#e6e6e6' })],
    });
  };

  const removeItem = (idx) => {
    const next = items.filter((_, i) => i !== idx);
    setAttributes({ items: next });
  };

  return (
    <>
      <InspectorControls>
        <PanelBody title="Spin Wheel Items">
          {items.length === 0 ? <p>Add at least 2–3 items.</p> : null}

          {items.map((item, i) => (
            <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px solid rgba(0,0,0,.08)' : 'none' }}>
              <TextControl
                label={`Label (${i + 1})`}
                value={item.label}
                onChange={(val) => setItem(i, { label: val })}
              />

              <TextControl
                label="Result text (optional)"
                value={item.resultText}
                onChange={(val) => setItem(i, { resultText: val })}
                help="Text shown in the result panel after the wheel stops."
              />

              <TextControl
                label="Link URL"
                value={item.linkUrl}
                onChange={(val) => setItem(i, { linkUrl: val })}
                placeholder="https://..."
              />

              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Slice color</div>
                <ColorPicker
                  color={item.color}
                  onChangeComplete={(val) => setItem(i, { color: val?.hex || '#e6e6e6' })}
                  disableAlpha={true}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <Button variant="tertiary" onClick={() => removeItem(i)}>
                  Remove item
                </Button>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <Button onClick={addItem} variant="secondary">
              Add item
            </Button>
          </div>
        </PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        <strong>Bee Spin Wheel</strong>
        <p>{items.length} choices configured.</p>
        <em>Spin logic runs on the frontend.</em>
      </div>
    </>
  );
}
