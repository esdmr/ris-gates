import {canvas} from './canvas.js';

const eventCache: PointerEvent[] = [];
const draggingThreshold = 1;
let oldX = 0;
let oldY = 0;
let oldDiff = -1;
let firstDelta = true;
export let isDragging = false;
export let hasClicked = false;
export let deltaX = 0;
export let deltaY = 0;
export let centerX = 0;
export let centerY = 0;
export let deltaScale = 0;

function pointerdownHandler(event: PointerEvent) {
	eventCache.push(event);
}

function pointermoveHandler(event: PointerEvent) {
	const index = eventCache.findIndex(
		(cachedEvent) => cachedEvent.pointerId === event.pointerId,
	);

	eventCache[index] = event;

	if (eventCache.length === 0) {
		centerX = event.clientX;
		centerY = event.clientY;
		return;
	}

	// Cast safety: length is at least one, so canvas 0 always exist.
	const first = eventCache[0]!;

	if (!firstDelta) {
		deltaX += first.clientX - oldX;
		deltaY += first.clientY - oldY;
	}

	oldX = first.clientX;
	oldY = first.clientY;
	centerX = oldX;
	centerY = oldY;
	firstDelta = false;

	if (eventCache.length === 2) {
		// Cast safety: length is two, so elements 1 always exist.
		const second = eventCache[1]!;

		centerX = (second.clientX + first.clientX) / 2;
		centerY = (second.clientY + first.clientY) / 2;

		const diff = Math.hypot(
			second.clientX - first.clientX,
			second.clientY - first.clientY,
		);

		if (oldDiff > 0) {
			deltaScale += diff - oldDiff;
		}

		oldDiff = diff;
		isDragging = true;
	} else if (!isDragging && Math.abs(deltaX + deltaY) >= draggingThreshold) {
		isDragging = true;
	}
}

function pointerupHandler(event: PointerEvent) {
	const index = eventCache.findIndex(
		(cachedEvent) => cachedEvent.pointerId === event.pointerId,
	);

	eventCache.splice(index, 1);

	if (eventCache.length !== 2) {
		oldDiff = -1;
		firstDelta = true;
	}

	if (eventCache.length === 0 && index !== -1) {
		if (isDragging) {
			isDragging = false;
		} else {
			hasClicked = true;
		}
	}
}

export function setup() {
	canvas.addEventListener('pointerdown', pointerdownHandler);
	canvas.addEventListener('pointermove', pointermoveHandler);
	canvas.addEventListener('pointerover', pointermoveHandler);
	canvas.addEventListener('pointerup', pointerupHandler);
	canvas.addEventListener('pointercancel', pointerupHandler);
	canvas.addEventListener('pointerout', pointerupHandler);
	canvas.addEventListener('pointerleave', pointerupHandler);
}

export function commit() {
	deltaX = 0;
	deltaY = 0;
	deltaScale = 0;
	hasClicked = false;
}
