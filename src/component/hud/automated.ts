import {assert} from '../../lib/assert.js';
import {createClickHandler, query} from '../../lib/dom.js';
import {evalEvents} from '../../lib/eval.js';
import {SequencerContext} from '../../lib/sequencer.js';
import * as eval_ from '../eval.js';
import * as dialogSequence from '../dialog/sequence.js';
import * as dialogMonitor from '../dialog/monitor.js';
import * as dialogAssert from '../dialog/assert.js';
import * as keyboard from '../keyboard.js';

const buttonReturn = query('#hud-return', HTMLButtonElement);
const buttonMonitor = query('#hud-monitor', HTMLButtonElement);
const buttonAssert = query('#hud-assert', HTMLButtonElement);
const tickCountDisplay = query('#hud-tick-no2', HTMLDivElement);
const buttonNext = query('#hud-next', HTMLButtonElement);

export function setup() {
	/* eslint-disable @internal/no-object-literals */
	keyboard.extendKeyBinds('KeyQ', {
		automated: createClickHandler(buttonReturn),
	});
	keyboard.extendKeyBinds('Digit1', {
		automated: createClickHandler(buttonMonitor),
	});
	keyboard.extendKeyBinds('Digit2', {
		automated: createClickHandler(buttonAssert),
	});
	keyboard.extendKeyBinds('Digit3', {
		automated: createClickHandler(buttonNext),
	});
	keyboard.extendKeyBinds('Digit4', {
		automated: createClickHandler(buttonNext),
	});
	/* eslint-enable @internal/no-object-literals */

	buttonReturn.addEventListener('click', () => {
		dialogSequence.open();
	});

	buttonMonitor.addEventListener('click', () => {
		if (buttonMonitor.hidden) return;
		dialogMonitor.open();
	});

	buttonAssert.addEventListener('click', () => {
		if (buttonAssert.hidden) return;
		dialogAssert.open();
	});

	evalEvents.addEventListener('update', () => {
		tickCountDisplay.textContent = String(eval_.context?.tickCount ?? 0n);
	});

	evalEvents.addEventListener('reset', () => {
		tickCountDisplay.textContent = '0';

		const context = eval_.context;
		if (!(context instanceof SequencerContext)) return;
		buttonMonitor.hidden = context.monitoredTiles.length === 0;
		buttonAssert.hidden = !context.hasAssertions;
	});

	buttonNext.addEventListener('click', () => {
		const context = eval_.getEvalContext();
		assert(context instanceof SequencerContext);
		context.status = 'running';
	});
}
