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
	RangeControl,
} from '@wordpress/components';

import './editor.scss';

function normalizeImage(img) {
	return {
		id: img.id ?? null,
		url: img.url ?? img.source_url ?? '',
		alt: img.alt ?? img.alt_text ?? '',
	};
}

function LayerPicker({ label, image, onSelect, onRemove }) {
	return (
		<div style={{ display: 'grid', gap: '8px' }}>
			<strong>{label}</strong>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={(img) => onSelect(normalizeImage(img))}
					allowedTypes={['image']}
					multiple={false}
					value={image?.id ?? 0}
					render={({ open }) => (
						<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
							<Button variant="primary" onClick={open}>
								{image ? __('Replace', 'beeseen') : __('Select', 'beeseen')}
							</Button>
							{image && (
								<Button variant="secondary" onClick={onRemove}>
									{__('Remove', 'beeseen')}
								</Button>
							)}
						</div>
					)}
				/>
			</MediaUploadCheck>
		</div>
	);
}

export default function Edit({ attributes, setAttributes }) {
	const {
		bgImage,
		midImage,
		fgImage,
		strength,
		bgFactor,
		midFactor,
		fgFactor,
		scale,
		ease,
		borderRadius,
		bgScale,
		midScale,
		fgScale,
		fgWidth,
		fgHeight,
	} = attributes;


	const blockProps = useBlockProps({ className: 'beeseen-depth' });

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Bee Depth Stack settings', 'beeseen')}>
					<RangeControl
						label={__('Strength (px)', 'beeseen')}
						value={strength}
						onChange={(v) => setAttributes({ strength: v })}
						min={0}
						max={80}
					/>
					<RangeControl
						label={__('Background factor', 'beeseen')}
						value={bgFactor}
						onChange={(v) => setAttributes({ bgFactor: v })}
						min={0}
						max={1.5}
						step={0.05}
					/>
					<RangeControl
						label={__('Mid factor', 'beeseen')}
						value={midFactor}
						onChange={(v) => setAttributes({ midFactor: v })}
						min={0}
						max={1.5}
						step={0.05}
					/>
					<RangeControl
						label={__('Foreground factor', 'beeseen')}
						value={fgFactor}
						onChange={(v) => setAttributes({ fgFactor: v })}
						min={0}
						max={1.8}
						step={0.05}
					/>
					<RangeControl
						label={__('Layer scale', 'beeseen')}
						value={scale}
						onChange={(v) => setAttributes({ scale: v })}
						min={1}
						max={1.2}
						step={0.01}
					/>
					<RangeControl
						label={__('Ease (smoothing)', 'beeseen')}
						value={ease}
						onChange={(v) => setAttributes({ ease: v })}
						min={0.05}
						max={0.35}
						step={0.01}
					/>
					<RangeControl
						label={__('Border radius (px)', 'beeseen')}
						value={borderRadius}
						onChange={(v) => setAttributes({ borderRadius: v })}
						min={0}
						max={40}
					/>
					<RangeControl
						label={__('Background scale', 'beeseen')}
						value={bgScale}
						onChange={(v) => setAttributes({ bgScale: v })}
						min={1}
						max={1.2}
						step={0.01}
					/>

					<RangeControl
						label={__('Mid scale', 'beeseen')}
						value={midScale}
						onChange={(v) => setAttributes({ midScale: v })}
						min={1}
						max={1.15}
						step={0.01}
					/>

					<RangeControl
						label={__('Foreground scale', 'beeseen')}
						value={fgScale}
						onChange={(v) => setAttributes({ fgScale: v })}
						min={0.9}
						max={1.1}
						step={0.01}
					/>
					<RangeControl
						label={__('Foreground width (%)', 'beeseen')}
						value={fgWidth}
						onChange={(v) => setAttributes({ fgWidth: v })}
						min={30}
						max={100}
						step={1}
					/>

					<RangeControl
						label={__('Foreground height (%)', 'beeseen')}
						value={fgHeight}
						onChange={(v) => setAttributes({ fgHeight: v })}
						min={30}
						max={120}
						step={1}
					/>

				</PanelBody>

				<PanelBody title={__('Layers', 'beeseen')} initialOpen={true}>
					<LayerPicker
						label={__('Background', 'beeseen')}
						image={bgImage}
						onSelect={(img) => setAttributes({ bgImage: img })}
						onRemove={() => setAttributes({ bgImage: null })}
					/>
					<div style={{ height: '8px' }} />
					<LayerPicker
						label={__('Mid', 'beeseen')}
						image={midImage}
						onSelect={(img) => setAttributes({ midImage: img })}
						onRemove={() => setAttributes({ midImage: null })}
					/>
					<div style={{ height: '8px' }} />
					<LayerPicker
						label={__('Foreground', 'beeseen')}
						image={fgImage}
						onSelect={(img) => setAttributes({ fgImage: img })}
						onRemove={() => setAttributes({ fgImage: null })}
					/>

					{(!bgImage && !midImage && !fgImage) && (
						<p className="beeseen-depth__hint">
							{__('Select at least one layer. Parallax runs on the front-end.', 'beeseen')}
						</p>
					)}
				</PanelBody>
			</InspectorControls>

			<div
				{...blockProps}
				data-strength={strength}
				data-bg-factor={bgFactor}
				data-mid-factor={midFactor}
				data-fg-factor={fgFactor}
				data-scale={scale}
				data-ease={ease}
				data-bg-scale={bgScale}
				data-mid-scale={midScale}
				data-fg-scale={fgScale}
				style={{
					['--beeseen-depth-br']: `${borderRadius}px`,
					['--beeseen-fg-w']: `${fgWidth}%`,
					['--beeseen-fg-h']: `${fgHeight}%`,
				}}
			>
				<div className="beeseen-depth__frame">
					{bgImage?.url && (
						<div className="beeseen-depth__layerWrap beeseen-depth__layerWrap--bg">
							<img className="beeseen-depth__layer beeseen-depth__layer--bg" src={bgImage.url} alt={bgImage.alt || ''} />
						</div>
					)}
					{midImage?.url && (
						<div className="beeseen-depth__layerWrap beeseen-depth__layerWrap--mid">
							<img className="beeseen-depth__layer beeseen-depth__layer--mid" src={midImage.url} alt={midImage.alt || ''} />
						</div>
					)}
					{fgImage?.url && (
						<div className="beeseen-depth__layerWrap beeseen-depth__layerWrap--fg">
							<img className="beeseen-depth__layer beeseen-depth__layer--fg" src={fgImage.url} alt={fgImage.alt || ''} />
						</div>
					)}

					{(!bgImage && !midImage && !fgImage) && (
						<div className="beeseen-depth__empty">Bee Depth Stack — add layers.</div>
					)}
				</div>
			</div>
		</>
	);
}


