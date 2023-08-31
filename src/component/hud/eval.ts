import {createClickHandler, query} from '../../lib/dom.js';
import * as eval from '../eval.js';
import * as keyboard from '../keyboard.js';
import * as mode from '../mode.js';

const buttonTickBwdStable = query('#hud-tick-bwd-stable', HTMLButtonElement);
const buttonTickBwd = query('#hud-tick-bwd', HTMLButtonElement);
const buttonTickNo = query('#hud-tick-no', HTMLDivElement);
const buttonTickFwd = query('#hud-tick-fwd', HTMLButtonElement);
const buttonTickFwdStable = query('#hud-tick-fwd-stable', HTMLButtonElement);

let stabilityInterval: ReturnType<typeof setInterval> | undefined;

export function stopStabilityInterval() {
	if (stabilityInterval) {
		clearInterval(stabilityInterval);
		stabilityInterval = undefined;
	}
}

function startStabilityInterval(type: 'tickForward' | 'tickBackward') {
	stopStabilityInterval();

	stabilityInterval = setInterval(() => {
		const evalContext = eval.getEvalContext();

		if (mode.mode !== 'eval' || !evalContext[type]()) {
			stopStabilityInterval();
		}

		updateTickNo();
	}, 1000 / eval.evaluationRate);
}

export function updateTickNo(count = eval.getEvalContext().tickCount) {
	buttonTickNo.textContent = String(count);
}

export function setup() {
	/* eslint-disable @internal/no-object-literals */
	keyboard.extendKeyBinds('Digit1', {
		eval: createClickHandler(buttonTickBwdStable),
	});
	keyboard.extendKeyBinds('Digit2', {eval: createClickHandler(buttonTickBwd)});
	keyboard.extendKeyBinds('Digit3', {eval: createClickHandler(buttonTickFwd)});
	keyboard.extendKeyBinds('Digit4', {
		eval: createClickHandler(buttonTickFwdStable),
	});
	/* eslint-enable @internal/no-object-literals */

	buttonTickBwdStable.addEventListener('click', () => {
		const evalContext = eval.getEvalContext();
		if (evalContext.tickBackward()) startStabilityInterval('tickBackward');
		buttonTickNo.textContent = String(evalContext.tickCount);
	});

	buttonTickBwd.addEventListener('click', () => {
		const evalContext = eval.getEvalContext();
		evalContext.tickBackward();
		buttonTickNo.textContent = String(evalContext.tickCount);
		stopStabilityInterval();
	});

	buttonTickFwd.addEventListener('click', () => {
		const evalContext = eval.getEvalContext();
		evalContext.tickForward();
		buttonTickNo.textContent = String(evalContext.tickCount);
		stopStabilityInterval();
	});

	buttonTickFwdStable.addEventListener('click', () => {
		const evalContext = eval.getEvalContext();
		if (evalContext.tickForward()) startStabilityInterval('tickForward');
		buttonTickNo.textContent = String(evalContext.tickCount);
	});
}
