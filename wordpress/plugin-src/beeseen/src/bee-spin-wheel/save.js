import { useBlockProps } from '@wordpress/block-editor';

export default function save({ attributes }) {
	const { items, durationMs, minTurns, autoplay, openInNewTab, spinLabel } = attributes;

	return (
		<div
			{...useBlockProps.save({
				className: 'beeseen-spin-wheel',
				'data-items': JSON.stringify(items || []),
				'data-duration-ms': String(durationMs),
				'data-min-turns': String(minTurns),
				'data-autoplay': autoplay ? '1' : '0',
				'data-new-tab': openInNewTab ? '1' : '0',
			})}
		>
			<div className="beeseen-spin-wheel__layout">
				<div className="beeseen-spin-wheel__left">
					<div className="beeseen-spin-wheel__arrow" aria-hidden="true"></div>

					<ul className="beeseen-spin-wheel__wheel" aria-label="Spin wheel">
						{(items || []).map((item, i) => (
							<li
								className="beeseen-spin-wheel__segment"
								key={i}
								style={{ '--i': i, '--n': (items || []).length }}
							>
								<span className="beeseen-spin-wheel__label">{item?.label || ''}</span>
							</li>
						))}
					</ul>
				</div>

				<div className="beeseen-spin-wheel__right">
					<button type="button" className="beeseen-spin-wheel__spinBtn">
						{spinLabel}
					</button>

					<div className="beeseen-spin-wheel__result" hidden>
						<div className="beeseen-spin-wheel__resultInner"></div>
					</div>
				</div>
			</div>

		</div>
	);
}
