import {createClickHandler, query} from '../../lib/dom.js';
import type {Point} from '../../lib/point.js';
import * as keyboard from '../keyboard.js';
import * as mode from '../mode.js';

const buttonPickCancel = query('#hud-pick-cancel', HTMLButtonElement);

let resolve: ((value: Point) => void) | undefined;
let reject: ((reason?: unknown) => void) | undefined;

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	keyboard.extendKeyBinds('Escape', {
		picking: createClickHandler(buttonPickCancel),
	});

	buttonPickCancel.addEventListener('click', () => {
		mode.setMode('normal');
		reject?.(new Error('Picking cancelled'));
		resolve = undefined;
		reject = undefined;
	});
}

export function done(point: Point) {
	mode.setMode('normal');
	resolve?.(point);
	resolve = undefined;
	reject = undefined;
}

export async function pickIo() {
	reject?.(new Error('Picking cancelled'));
	resolve = undefined;
	reject = undefined;

	mode.setMode('picking');

	return new Promise<Point>((resolve_, reject_) => {
		resolve = resolve_;
		reject = reject_;
	});
}
