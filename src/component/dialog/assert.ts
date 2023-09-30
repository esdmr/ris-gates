import {create, query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as eval_ from '../eval.js';
import {evalEvents} from '../../lib/eval.js';
import {assert} from '../../lib/assert.js';
import {SequencerAssertion} from '../../lib/sequencer.js';

const dialogAssert = query('#dialog-assert', HTMLDialogElement);
const body = query('tbody', HTMLTableSectionElement, dialogAssert);

export function setup() {
	mode.setupDialog(dialogAssert);
	setupDialogCloseButton(dialogAssert);

	dialogAssert.addEventListener('close', () => {
		mode.setMode('automated');
		eval_.getEvalContext().start(eval_.evaluationRate);
	});

	evalEvents.addEventListener('reset', () => {
		const rows = [...body.children];
		for (const child of rows) {
			child.remove();
		}
	});

	evalEvents.addEventListener('assert', (event) => {
		assert(event instanceof SequencerAssertion);
		/* eslint-disable @internal/no-object-literals */
		const row = create(
			'tr',
			event.actual === event.expected ? {} : {'data-e': ''},
			create('td', {}, String(body.childElementCount + 1)),
			create('td', {}, event.actualTile),
			create('td', {}, event.actual ? '1' : '0'),
			create('td', {}, event.expected ? '1' : '0'),
			create('td', {}, event.expectedTile ?? ''),
		);
		/* eslint-enable @internal/no-object-literals */
		body.append(row);
	});
}

export function open() {
	eval_.getEvalContext().stop();
	mode.openDialog(dialogAssert);
}
