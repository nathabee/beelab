import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
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



	return (
		<div
			{...useBlockProps.save({ className: 'beeseen-depth' })}
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
				{bgImage?.url ? (
						<div className="beeseen-depth__layerWrap beeseen-depth__layerWrap--bg">
					<img className="beeseen-depth__layer beeseen-depth__layer--bg" src={bgImage.url} alt={bgImage.alt || ''} loading="lazy" />
						</div>
				) : null}
				{midImage?.url ? (
						<div className="beeseen-depth__layerWrap beeseen-depth__layerWrap--mid">
					<img className="beeseen-depth__layer beeseen-depth__layer--mid" src={midImage.url} alt={midImage.alt || ''} loading="lazy" />
						</div>
				) : null}
				{fgImage?.url ? (
						<div className="beeseen-depth__layerWrap beeseen-depth__layerWrap--fg">
					<img className="beeseen-depth__layer beeseen-depth__layer--fg" src={fgImage.url} alt={fgImage.alt || ''} loading="lazy" />
						</div>
				) : null}
			</div>
		</div>
	);
}
