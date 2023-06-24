import {canvas} from '../canvas.js';

const deltaLineMultiplier = 16;
const deltaPageMultiplier = 25 * deltaLineMultiplier;
export let deltaX = 0;
export let deltaY = 0;
export let ctrl = false;

canvas.addEventListener(
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

export function commit() {
	deltaX = 0;
	deltaY = 0;
	ctrl = false;
}
