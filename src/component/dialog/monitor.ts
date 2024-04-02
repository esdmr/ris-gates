import {create, query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as eval_ from '../eval.js';
import {SequencerContext} from '../../lib/sequencer.js';
import {EvalStepEvent, evalEvents} from '../../lib/eval.js';
import {assert} from '../../lib/assert.js';

const dialogMonitor = query('#dialog-monitor', HTMLDialogElement);
const table = query('table', HTMLTableElement, dialogMonitor);
const headerRow = query('thead > tr', HTMLTableRowElement, dialogMonitor);
const body = query('tbody', HTMLTableSectionElement, dialogMonitor);
const checkboxHighContrast = query(
	'#chk-high-contrast',
	HTMLInputElement,
	dialogMonitor,
);
const checkboxStableOnly = query(
	'#chk-stable-only',
	HTMLInputElement,
	dialogMonitor,
);

export function setup() {
	mode.setupDialog(dialogMonitor);
	setupDialogCloseButton(dialogMonitor);

	dialogMonitor.addEventListener('close', () => {
		mode.setMode('automated');
		eval_.getEvalContext().start(eval_.evaluationRate);
	});

	evalEvents.addEventListener('reset', () => {
		const headerCols = [...headerRow.children].slice(1);
		for (const child of headerCols) {
			child.remove();
		}

		const rows = [...body.children];
		for (const child of rows) {
			child.remove();
		}

		const {context} = eval_;
		if (!(context instanceof SequencerContext)) return;

		for (const tile of context.monitoredTiles) {
			// Cast safety: monitoredTiles is a subset of TilesMap.ioTiles.
			// tileNames also contains a mapping for every item in TilesMap.ioTiles.`
			// eslint-disable-next-line @internal/no-object-literals
			headerRow.append(create('th', {}, context.tileNames.get(tile)!));
		}
	});

	evalEvents.addEventListener('update', (event) => {
		assert(event instanceof EvalStepEvent);

		const {context, isStable} = event;
		if (!(context instanceof SequencerContext)) return;

		/* eslint-disable @internal/no-object-literals */
		const row = create(
			'tr',
			{
				class: isStable ? 'stable' : '',
			},
			create('td', {}, String(context.tickCount)),
		);
		/* eslint-enable @internal/no-object-literals */
		body.append(row);

		for (const value of context.observe()) {
			row.append(
				// eslint-disable-next-line @internal/no-object-literals
				create('td', value ? {'data-v': ''} : {}, value ? '1' : '0'),
			);
		}
	});

	checkboxHighContrast.addEventListener('change', () => {
		if (checkboxHighContrast.checked) {
			table.dataset.highContrast = '';
		} else {
			delete table.dataset.highContrast;
		}
	});

	checkboxStableOnly.addEventListener('change', () => {
		if (checkboxStableOnly.checked) {
			table.dataset.stableOnly = '';
		} else {
			delete table.dataset.stableOnly;
		}
	});
}

export function open() {
	eval_.getEvalContext().stop();
	mode.openDialog(dialogMonitor);
}
