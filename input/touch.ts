import {canvas} from '../canvas.js';

const eventCache: PointerEvent[] = [];
let oldX = 0;
let oldY = 0;
let firstDelta = true;
export let deltaX = 0;
export let deltaY = 0;
let oldDiff = -1;
export let deltaScale = 0;

const pointerdownHandler = (event: PointerEvent) => {
	eventCache.push(event);
};

const pointermoveHandler = (event: PointerEvent) => {
	const index = eventCache.findIndex(
		(cachedEvent) => cachedEvent.pointerId === event.pointerId,
	);

	eventCache[index] = event;

	if (eventCache.length === 2) {
		// Cast safety: length is two, so canvass 0 and 1 always exist.
		const diff = Math.hypot(
			eventCache[1]!.clientX - eventCache[0]!.clientX,
			eventCache[1]!.clientY - eventCache[0]!.clientY,
		);

		if (oldDiff > 0) {
			if (diff > oldDiff) {
				deltaScale += diff - oldDiff;
			} else if (diff < oldDiff) {
				deltaScale += diff - oldDiff;
			}
		}

		oldDiff = diff;
	}

	if (eventCache.length > 0) {
		if (!firstDelta) {
			// Cast safety: length is at least one, so canvas 0 always exist.
			deltaX += eventCache[0]!.clientX - oldX;
			// Cast safety: length is at least one, so canvas 0 always exist.
			deltaY += eventCache[0]!.clientY - oldY;
		}

		// Cast safety: length is at least one, so canvas 0 always exist.
		oldX = eventCache[0]!.clientX;
		// Cast safety: length is at least one, so canvas 0 always exist.
		oldY = eventCache[0]!.clientY;
		firstDelta = false;
	}
};

const pointerupHandler = (event: PointerEvent) => {
	const index = eventCache.findIndex(
		(cachedEvent) => cachedEvent.pointerId === event.pointerId,
	);

	eventCache.splice(index, 1);

	if (eventCache.length < 2) {
		oldDiff = -1;
		firstDelta = true;
	}
};

canvas.addEventListener('pointerdown', pointerdownHandler);
canvas.addEventListener('pointermove', pointermoveHandler);
canvas.addEventListener('pointerup', pointerupHandler);
canvas.addEventListener('pointercancel', pointerupHandler);
canvas.addEventListener('pointerout', pointerupHandler);
canvas.addEventListener('pointerleave', pointerupHandler);

export function reset() {
	deltaX = 0;
	deltaY = 0;
	deltaScale = 0;
}
