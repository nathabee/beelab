import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { readBoolDataset, readNumberDataset } from '../shared/dom/dataset';

function safeText(s) {
	return String(s ?? '').replace(/[&<>"']/g, (c) => (
		{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
	));
}

function buildConicGradient(items) {
	const n = items.length;
	if (!n) return '';
	const step = 360 / n;

	// Each slice: color start..end
	// Using degrees keeps it deterministic.
	const parts = items.map((it, i) => {
		const color = it?.color || '#e6e6e6';
		const a0 = i * step;
		const a1 = (i + 1) * step;
		return `${color} ${a0}deg ${a1}deg`;
	});

	return `conic-gradient(from -90deg, ${parts.join(', ')})`;
}

function setupSpinWheel(root) {
	const items = JSON.parse(root.dataset.items || '[]');
	if (!items.length) return;

	const durationMs = readNumberDataset(root, 'durationMs', 5200);
	const minTurns = readNumberDataset(root, 'minTurns', 6);
	const autoplay = readBoolDataset(root, 'autoplay', false);
	const newTab = readBoolDataset(root, 'newTab', false);

	const wheel = root.querySelector('.beeseen-spin-wheel__wheel');
	const segments = Array.from(root.querySelectorAll('.beeseen-spin-wheel__segment'));
	const result = root.querySelector('.beeseen-spin-wheel__result');
	const resultInner = root.querySelector('.beeseen-spin-wheel__resultInner');

	// Inject slice background
	const bg = buildConicGradient(items);
	if (bg) wheel.style.setProperty('--bee-wheel-bg', bg);

	let lastChoiceIndex = null;

	function finish(index) {
		lastChoiceIndex = index;
		const item = items[index] || {};
		const label = safeText(item.label || '');
		const text = safeText(item.resultText || '');
		const url = String(item.linkUrl || '').trim();

		const heading = label ? `<strong>${label}</strong>` : '';
		const body = text ? `<div class="beeseen-spin-wheel__resultText">${text}</div>` : '';
		const cta = url
			? `<a class="beeseen-spin-wheel__cta" href="${safeText(url)}" ${newTab ? 'target="_blank" rel="noopener noreferrer"' : ''}>Choose me</a>`
			: `<span class="beeseen-spin-wheel__cta" aria-disabled="true">Choose me</span>`;

		resultInner.innerHTML = `${heading}${body}${cta}`;
		result.hidden = false;
		result.classList.add('is-active');
	}

	function spin() {
		if (prefersReducedMotion()) {
			const target = Math.floor(Math.random() * items.length);
			finish(target);
			return;
		}

		const n = items.length;
		const step = 360 / n;

		// Choose the result index (this is the "winner" we will display)
		const target = Math.floor(Math.random() * n);

		// Convert target index -> the rotation needed so that target ends up under the pointer (top).
		// With your layout: index 0 starts at top; after +step rotation, index n-1 is at top.
		const targetRotSteps = (n - target) % n;

		const endAngle = (minTurns * 360) + (targetRotSteps * step);

		let start = null;

		function frame(ts) {
			if (!start) start = ts;
			const p = Math.min((ts - start) / durationMs, 1);
			const eased = 1 - Math.pow(1 - p, 3);

			const angle = endAngle * eased;
			wheel.style.transform = `rotate(${angle}deg)`;

			// Which segment is currently at the pointer (top)?
			const norm = ((angle % 360) + 360) % 360;
			const rotSteps = Math.round(norm / step) % n;
			const active = (n - rotSteps) % n;

			segments.forEach((s, i) => s.classList.toggle('is-active', i === active));

			if (p < 1) {
				requestAnimationFrame(frame);
			} else {
				// Ensure the displayed result matches what the pointer shows
				finish(target);
			}
		}

		requestAnimationFrame(frame);
	}


	// Click-to-spin

	const btn = root.querySelector('.beeseen-spin-wheel__spinBtn');
	if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); spin(); });


	root.addEventListener('click', (e) => {
		// Let result link clicks work normally
		if (e.target && e.target.closest && e.target.closest('a')) return;
		spin();
	});

	// Optional autoplay: spin once when visible
	if (autoplay && !prefersReducedMotion()) {
		const io = new IntersectionObserver((entries) => {
			for (const ent of entries) {
				if (ent.isIntersecting) {
					io.disconnect();
					spin();
					break;
				}
			}
		}, { threshold: 0.35 });
		io.observe(root);
	}
}

document.querySelectorAll('.beeseen-spin-wheel').forEach(setupSpinWheel);
