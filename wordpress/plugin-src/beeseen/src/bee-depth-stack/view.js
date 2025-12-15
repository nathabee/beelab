import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, clamp } from '../shared/dom/dataset';

function setupDepth(root) {
	const frame = root.querySelector('.beeseen-depth__frame');
	if (!frame) return;
	const layers = {
		bg: root.querySelector('.beeseen-depth__layerWrap--bg'),
		mid: root.querySelector('.beeseen-depth__layerWrap--mid'),
		fg: root.querySelector('.beeseen-depth__layerWrap--fg'),
	};


	if (!layers.bg && !layers.mid && !layers.fg) return;

	const reduced = prefersReducedMotion();
	if (reduced) return;

	const strength = clamp(readNumberDataset(root, 'strength', 24), 0, 200);
	const bgFactor = clamp(readNumberDataset(root, 'bgFactor', 0.35), 0, 4);
	const midFactor = clamp(readNumberDataset(root, 'midFactor', 0.7), 0, 4);
	const fgFactor = clamp(readNumberDataset(root, 'fgFactor', 1.0), 0, 4);
	const scale = clamp(readNumberDataset(root, 'scale', 1.05), 1, 1.4);
	const ease = clamp(readNumberDataset(root, 'ease', 0.14), 0.02, 0.5);

	// current / target
	let x = 0, y = 0;
	let tx = 0, ty = 0;
	let active = false;

	function setLayer(el, dx, dy, layerScale, globalScale, isFg = false) {
		if (!el) return;

		const s = layerScale * globalScale;

		const base = isFg ? 'translate(-50%, -50%) ' : '';
		el.style.transform = `${base}translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${s})`;
	}


	const loop = createRafLoop(() => {
		x += (tx - x) * ease;
		y += (ty - y) * ease;

		const bgScale = clamp(readNumberDataset(root, 'bgScale', 1.08), 1, 1.4);
		const midScale = clamp(readNumberDataset(root, 'midScale', 1.04), 1, 1.3);
		const fgScale = clamp(readNumberDataset(root, 'fgScale', 1.0), 0.8, 1.2);

		setLayer(layers.bg, x * bgFactor, y * bgFactor, bgScale, scale, false);
		setLayer(layers.mid, x * midFactor, y * midFactor, midScale, scale, false);
		setLayer(layers.fg, x * fgFactor, y * fgFactor, fgScale, scale, true);

	});

	function onEnter() {
		active = true;
		if (!loop.isRunning()) loop.start();
	}

	function onMove(e) {
		if (!active) return;
		const r = frame.getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * 2 - 1;  // -1..1
		const py = ((e.clientY - r.top) / r.height) * 2 - 1;  // -1..1
		tx = px * strength;
		ty = py * strength;
	}

	function onLeave() {
		active = false;
		tx = 0;
		ty = 0;
		window.setTimeout(() => {
			loop.stop();
			// reset transforms cleanly
			setLayer(layers.bg, 0, 0, bgScale, scale, false);
			setLayer(layers.mid, 0, 0, midScale, scale, false);
			setLayer(layers.fg, 0, 0, fgScale, scale, true);

		}, 260);
	}

	frame.addEventListener('pointerenter', onEnter, { passive: true });
	frame.addEventListener('pointermove', onMove, { passive: true });
	frame.addEventListener('pointerleave', onLeave, { passive: true });
	frame.addEventListener('pointercancel', onLeave, { passive: true });

	root.__beeseenCleanup = () => loop.stop();
}

function init() {
	document.querySelectorAll('.wp-block-beeseen-bee-depth-stack').forEach(setupDepth);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
