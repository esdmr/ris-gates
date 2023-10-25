import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as tree from '../tree.js';
import * as eval_ from '../eval.js';
import {
	SequencerAggregateError,
	SequencerContext,
} from '../../lib/sequencer.js';
import * as hudPick from '../hud/pick.js';
import {Timeout} from '../../lib/timer.js';
import * as dialogSequenceFailed from './sequence-failed.js';
import * as dialogEntry from './entry.js';

const dialogSequence = query('#dialog-sequence', HTMLDialogElement);
const textarea = query('textarea', HTMLTextAreaElement, dialogSequence);
const buttonStart = query('#btn-start', HTMLButtonElement, dialogSequence);
const buttonPick = query('#btn-pick', HTMLButtonElement, dialogSequence);

export function setup() {
	mode.setupDialog(dialogSequence);
	setupDialogCloseButton(dialogSequence);

	dialogSequence.addEventListener('close', () => {
		saveSequence();
		mode.setMode('eval');

		if (dialogSequence.returnValue) {
			mode.setMode('automated');
		}
	});

	buttonStart.addEventListener('click', async () => {
		saveSequence();
		let context;

		try {
			context = new SequencerContext(tree.tree);
		} catch (error) {
			if (!(error instanceof SequencerAggregateError)) {
				throw error;
			}

			dialogSequenceFailed.open(error.errors);
			return;
		}

		// Cast safety: there is exactly one label, so there is always an
		// element at index 0.
		const index =
			context.publicLabels.size === 1
				? [...context.publicLabels.values()][0]!
				: await dialogEntry.open(context);

		context.index = index;
		eval_.setEvalContext(context);
		dialogSequence.close('start');
	});

	buttonPick.addEventListener('click', async () => {
		mode.closeAllDialogs();
		await new Timeout(0).promise;

		try {
			const point = await hudPick.pickIo();
			open();
			const beforeSelection = 'let ';
			const selection = beforeSelection + 'newTile';

			textarea.value =
				`${selection}(${point.x}, ${point.y})\n` + textarea.value;
			textarea.focus();
			textarea.setSelectionRange(beforeSelection.length, selection.length);
		} catch (error) {
			open();
			throw error;
		}
	});
}

export function open() {
	mode.openDialog(dialogSequence);
	eval_.setEvalContext(undefined);
	loadSequence();
}

export function loadSequence() {
	textarea.value = tree.tree.sequence;
}

export function saveSequence() {
	tree.tree.sequence = textarea.value;
}
