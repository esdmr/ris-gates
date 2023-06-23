export function handleTouch(element: HTMLElement) {
	const eventCache: PointerEvent[] = [];
	let oldX = 0;
	let oldY = 0;
	let firstDelta = true;
	let deltaX = 0;
	let deltaY = 0;
	let oldDiff = -1;
	let deltaScale = 0;

	const pointerdownHandler = (event: PointerEvent) => {
		eventCache.push(event);
	};

	const pointermoveHandler = (event: PointerEvent) => {
		const index = eventCache.findIndex(
			(cachedEvent) => cachedEvent.pointerId === event.pointerId,
		);

		eventCache[index] = event;

		if (eventCache.length === 2) {
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
				deltaX += eventCache[0]!.clientX - oldX;
				deltaY += eventCache[0]!.clientY - oldY;
			}

			oldX = eventCache[0]!.clientX;
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

	element.addEventListener('pointerdown', pointerdownHandler);
	element.addEventListener('pointermove', pointermoveHandler);
	element.addEventListener('pointerup', pointerupHandler);
	element.addEventListener('pointercancel', pointerupHandler);
	element.addEventListener('pointerout', pointerupHandler);
	element.addEventListener('pointerleave', pointerupHandler);

	return {
		get deltaX() {
			return deltaX ?? 0;
		},
		get deltaY() {
			return deltaY ?? 0;
		},
		get deltaScale() {
			return deltaScale;
		},
		reset() {
			deltaX = 0;
			deltaY = 0;
			deltaScale = 0;
		},
	};
}

const deltaLineMultiplier = 16;
const deltaPageMultiplier = 25 * deltaLineMultiplier;

export function handleWheel(element: HTMLElement) {
	let deltaX = 0;
	let deltaY = 0;
	let ctrl = false;

	element.addEventListener(
		'wheel',
		(event) => {
			event.preventDefault();
			let multiplier = 1;

			switch (event.deltaMode) {
				case event.DOM_DELTA_LINE: {
					multiplier *= deltaLineMultiplier;
					break;
				}

				case event.DOM_DELTA_PAGE: {
					multiplier *= deltaPageMultiplier;
					break;
				}

				// No default
			}

			deltaX += event.deltaX * multiplier;
			deltaY += event.deltaY * multiplier;
			ctrl ||= event.ctrlKey;
		},
		{passive: false},
	);

	return {
		get deltaX() {
			return deltaX;
		},
		get deltaY() {
			return deltaY;
		},
		get ctrl() {
			return ctrl;
		},
		reset() {
			deltaX = 0;
			deltaY = 0;
			ctrl = false;
		},
	};
}
