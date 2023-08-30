import {createClickHandler, query} from '../../lib/dom.js';
import {evaluationRate, getEvalContext} from '../eval.js';
import {extendKeyBinds} from '../keyboard.js';
import {mode} from '../mode.js';

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
		const evalContext = getEvalContext();

		if (mode !== 'eval' || !evalContext[type]()) {
			stopStabilityInterval();
		}

		updateTickNo();
	}, 1000 / evaluationRate);
}

export function updateTickNo(count = getEvalContext().tickCount) {
	buttonTickNo.textContent = String(count);
}

export function setup() {
	/* eslint-disable @internal/no-object-literals */
	extendKeyBinds('Digit1', {eval: createClickHandler(buttonTickBwdStable)});
	extendKeyBinds('Digit2', {eval: createClickHandler(buttonTickBwd)});
	extendKeyBinds('Digit3', {eval: createClickHandler(buttonTickFwd)});
	extendKeyBinds('Digit4', {eval: createClickHandler(buttonTickFwdStable)});
	/* eslint-enable @internal/no-object-literals */

	buttonTickBwdStable.addEventListener('click', () => {
		const evalContext = getEvalContext();
		if (evalContext.tickBackward()) startStabilityInterval('tickBackward');
		buttonTickNo.textContent = String(evalContext.tickCount);
	});

	buttonTickBwd.addEventListener('click', () => {
		const evalContext = getEvalContext();
		evalContext.tickBackward();
		buttonTickNo.textContent = String(evalContext.tickCount);
		stopStabilityInterval();
	});

	buttonTickFwd.addEventListener('click', () => {
		const evalContext = getEvalContext();
		evalContext.tickForward();
		buttonTickNo.textContent = String(evalContext.tickCount);
		stopStabilityInterval();
	});

	buttonTickFwdStable.addEventListener('click', () => {
		const evalContext = getEvalContext();
		if (evalContext.tickForward()) startStabilityInterval('tickForward');
		buttonTickNo.textContent = String(evalContext.tickCount);
	});
}
