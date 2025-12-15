import { prefersReducedMotion } from '../shared/a11y/reducedMotion';
import { createRafLoop } from '../shared/dom/raf';
import { readNumberDataset, readBoolDataset, clamp } from '../shared/dom/dataset';
import { attachPointerDrag } from '../shared/motion/pointerDrag';
import { createInertia } from '../shared/motion/inertia';

function setupOrbit(root) {
	const stage = root.querySelector('.beeseen-orbit__stage');
	if (!stage) return;

	const items = Array.from(root.querySelectorAll('.beeseen-orbit__item'));
	if (!items.length) return;

	const reduced = prefersReducedMotion();

	const radius = clamp(readNumberDataset(root, 'radius', 180), 40, 1000);
	const itemSize = clamp(readNumberDataset(root, 'itemSize', 96), 24, 400);
	const enableWheel = readBoolDataset(root, 'enableWheel', true);
	const enableInertia = readBoolDataset(root, 'enableInertia', true) && !reduced;
	const friction = clamp(readNumberDataset(root, 'friction', 10), 2, 30);

	// Stage sizing/behavior
	stage.style.position = 'relative';
	stage.style.height = `${Math.max(260, radius * 2 + itemSize)}px`;
	stage.style.touchAction = 'none';

	// Item base positioning (centered absolute)
	for (const el of items) {
		el.style.position = 'absolute';
		el.style.left = '50%';
		el.style.top = '50%';
		el.style.width = `${itemSize}px`;
		el.style.height = `${itemSize}px`;
		el.style.marginLeft = `${-itemSize / 2}px`;
		el.style.marginTop = `${-itemSize / 2}px`;
		el.style.transformOrigin = 'center center';
		el.style.willChange = 'transform';
	}

	let angle = 0; // radians

	function layout() {
		const n = items.length;
		const step = (Math.PI * 2) / n;

		for (let i = 0; i < n; i++) {
			const a = angle + i * step;
			items[i].style.transform = `rotate(${a}rad) translateX(${radius}px) rotate(${-a}rad)`;
		}
	}

	layout();

	// Inertia in "radians per second"
	const inertia = createInertia({
		initialVelocity: 0,
		friction,
		minVelocity: 0.02, // rad/s
	});

	const loop = createRafLoop(({ dt }) => {
		if (!inertia.isActive()) return;
		const { delta } = inertia.step(dt);
		angle += delta; // delta is radians
		layout();
	});

	function stopMotion() {
		inertia.stop();
		loop.stop();
	}

	// Drag rotates orbit
	const pxToRad = 0.008; // tweak feel

	let startAngle = 0;

	const detach = attachPointerDrag(stage, {
		onStart: () => {
			stopMotion();
			startAngle = angle;
			stage.classList.add('is-dragging');
		},
		onMove: ({ dxFromStart }) => {
			angle = startAngle + dxFromStart * pxToRad;
			layout();
		},
		onEnd: ({ vx }) => {
			stage.classList.remove('is-dragging');
			if (!enableInertia) return;

			const vxPxPerSec = vx * 1000;
			const vRadPerSec = vxPxPerSec * pxToRad;

			inertia.start(vRadPerSec);
			if (inertia.isActive()) loop.start();
		},
	});


	// Wheel rotates orbit
	function onWheel(e) {
		if (!enableWheel) return;
		if (reduced) return;

		e.preventDefault();
		stopMotion();

		angle += e.deltaY * 0.0012;
		layout();
	}

	if (enableWheel) {
		stage.addEventListener('wheel', onWheel, { passive: false });
	}

	// Cleanup if needed (not strictly required for WP, but good hygiene)
	root.__beeseenCleanup = () => {
		detach?.();
		stage.removeEventListener('wheel', onWheel);
		stopMotion();
	};
}

function init() {
	const roots = document.querySelectorAll('.wp-block-beeseen-bee-orbit');
	roots.forEach(setupOrbit);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}
