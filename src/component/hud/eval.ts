import {createClickHandler, query} from '../../lib/dom.js';
import {evalEvents} from '../../lib/eval.js';
import * as eval_ from '../eval.js';
import * as keyboard from '../keyboard.js';
import * as dialogSequence from '../dialog/sequence.js';

const buttonTickBwdStable = query('#hud-tick-bwd-stable', HTMLButtonElement);
const buttonTickBwd = query('#hud-tick-bwd', HTMLButtonElement);
const tickCountDisplay = query('#hud-tick-no', HTMLDivElement);
const buttonTickFwd = query('#hud-tick-fwd', HTMLButtonElement);
const buttonTickFwdStable = query('#hud-tick-fwd-stable', HTMLButtonElement);
const buttonAutomate = query('#hud-automate', HTMLButtonElement);

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
	keyboard.extendKeyBinds('KeyR', {
		eval: createClickHandler(buttonAutomate),
	});
	/* eslint-enable @internal/no-object-literals */

	evalEvents.addEventListener('update', () => {
		tickCountDisplay.textContent = String(eval_.context?.tickCount ?? 0n);
	});

	evalEvents.addEventListener('reset', () => {
		tickCountDisplay.textContent = '0';
	});

	buttonTickBwdStable.addEventListener('click', () => {
		const evalContext = eval_.getEvalContext();
		evalContext.tickType = 'tickBackward';
		evalContext.targetTick = -1n;
	});

	buttonTickBwd.addEventListener('click', (event) => {
		event.preventDefault();
		const evalContext = eval_.getEvalContext();
		evalContext.tickType = 'tickBackward';
		evalContext.targetTick = 1n;
	});

	buttonTickFwd.addEventListener('click', (event) => {
		event.preventDefault();
		const evalContext = eval_.getEvalContext();
		evalContext.tickType = 'tickForward';
		evalContext.targetTick = 1n;
	});

	buttonTickFwdStable.addEventListener('click', () => {
		const evalContext = eval_.getEvalContext();
		evalContext.tickType = 'tickForward';
		evalContext.targetTick = -1n;
	});

	buttonAutomate.addEventListener('click', () => {
		dialogSequence.open();
	});
}
