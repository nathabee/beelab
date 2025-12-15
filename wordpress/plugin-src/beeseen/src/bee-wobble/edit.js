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
	ToggleControl,
	SelectControl,
} from '@wordpress/components';


import './editor.scss';

function normalizeImage(img) {
	return {
		id: img.id ?? null,
		url: img.url ?? img.source_url ?? '',
		alt: img.alt ?? img.alt_text ?? '',
	};
}

export default function Edit({ attributes, setAttributes }) {
	const { images, columns, gap, intensity, lift, enableWobble, fit } = attributes;


	const onSelectImages = (newImages) => {
		const normalized = (newImages || [])
			.map(normalizeImage)
			.filter((x) => x.url);
		setAttributes({ images: normalized });
	};

	const blockProps = useBlockProps({
		className: 'beeseen-wobble',
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Bee Wobble settings', 'beeseen')}>
					<RangeControl
						label={__('Columns', 'beeseen')}
						value={columns}
						onChange={(v) => setAttributes({ columns: v })}
						min={1}
						max={6}
					/>
					<RangeControl
						label={__('Gap (px)', 'beeseen')}
						value={gap}
						onChange={(v) => setAttributes({ gap: v })}
						min={0}
						max={48}
					/>
					<RangeControl
						label={__('Intensity', 'beeseen')}
						value={intensity}
						onChange={(v) => setAttributes({ intensity: v })}
						min={0}
						max={48}
					/>
					<RangeControl
						label={__('Hover lift', 'beeseen')}
						value={lift}
						onChange={(v) => setAttributes({ lift: v })}
						min={0}
						max={24}
					/>
					<ToggleControl
						label={__('Enable wobble motion', 'beeseen')}
						checked={!!enableWobble}
						onChange={(v) => setAttributes({ enableWobble: !!v })}
					/>
					<SelectControl
						label={__('Image fit', 'beeseen')}
						value={fit}
						options={[
							{ label: __('Show full image (no crop)', 'beeseen'), value: 'contain' },
							{ label: __('Fill tile (crop)', 'beeseen'), value: 'cover' },
							{ label: __('Natural height', 'beeseen'), value: 'auto' },
						]}
						onChange={(v) => setAttributes({ fit: v })}
					/>

				</PanelBody>

				<PanelBody title={__('Images', 'beeseen')} initialOpen={true}>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={onSelectImages}
							allowedTypes={['image']}
							multiple
							gallery
							value={(images || []).map((i) => i.id).filter(Boolean)}
							render={({ open }) => (
								<Button variant="primary" onClick={open}>
									{images?.length ? __('Edit images', 'beeseen') : __('Select images', 'beeseen')}
								</Button>
							)}
						/>
					</MediaUploadCheck>

					{!images?.length && (
						<p className="beeseen-wobble__hint">
							{__('Select images to populate the grid.', 'beeseen')}
						</p>
					)}
				</PanelBody>
			</InspectorControls>



			<div
				{...blockProps}
				data-fit={fit}
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
					{images?.length ? (
						images.map((img, idx) => (
							<figure className="beeseen-wobble__item" key={`${img.id ?? img.url}-${idx}`}>
								<img src={img.url} alt={img.alt || ''} />
							</figure>
						))
					) : (
						<div className="beeseen-wobble__empty">Bee Wobble (placeholder) — select images.</div>
					)}
				</div>
			</div>
		</>
	);
}
