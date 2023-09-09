import * as canvas from './canvas.js';

const eventCache: PointerEvent[] = [];
const draggingThreshold = 1;
const selectingThreshold = 400;
let oldX = 0;
let oldY = 0;
let oldDiff = -1;
let firstDelta = true;
let timeOfInitialDelta = -1;
export let isDragging = false;
export let isSelecting = false;
export let wasSelecting = false;
export let hasClicked = false;
export let isAuxiliaryButtonHeld = false;
export let isSecondaryButtonHeld = false;
export let deltaX = 0;
export let deltaY = 0;
export let centerX = 0;
export let centerY = 0;
export let deltaScale = 0;

function pointerdownHandler(event: PointerEvent) {
	eventCache.push(event);

	if (event.button === 1) {
		isAuxiliaryButtonHeld = true;
		isDragging = true;
	}

	if (event.button === 2) {
		isSecondaryButtonHeld = true;
	}

	if (timeOfInitialDelta === -1) {
		timeOfInitialDelta = performance.now();
	}
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
		isSelecting = false;
	} else if (!isDragging && Math.abs(deltaX + deltaY) >= draggingThreshold) {
		isDragging = true;

		if (
			event.shiftKey ||
			isSecondaryButtonHeld ||
			timeOfInitialDelta + selectingThreshold <= performance.now()
		) {
			isSelecting = true;
		}
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
		timeOfInitialDelta = -1;
	}

	if (eventCache.length === 0 && index !== -1) {
		if (event.button === 1) {
			isAuxiliaryButtonHeld = false;
		}

		if (event.button === 2) {
			isSecondaryButtonHeld = false;
		}

		if (isDragging) {
			isDragging = false;
			wasSelecting = isSelecting;
			isSelecting = false;
		} else {
			hasClicked = true;
		}
	}
}

export function setup() {
	canvas.canvas.addEventListener('pointerdown', pointerdownHandler);
	canvas.canvas.addEventListener('pointermove', pointermoveHandler);
	canvas.canvas.addEventListener('pointerover', pointermoveHandler);
	canvas.canvas.addEventListener('pointerup', pointerupHandler);
	canvas.canvas.addEventListener('pointercancel', pointerupHandler);
	canvas.canvas.addEventListener('pointerout', pointerupHandler);
	canvas.canvas.addEventListener('pointerleave', pointerupHandler);

	canvas.canvas.addEventListener('contextmenu', (event) => {
		event.preventDefault();
	});
}

export function commit() {
	deltaX = 0;
	deltaY = 0;
	deltaScale = 0;
	hasClicked = false;
	wasSelecting = isSelecting;
}
