import {maybeCompress} from '../../lib/compress.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as selection from '../selection.js';
import * as storage from '../storage.js';
import * as dialogSave from './save.js';
import * as dialogScreenshot from './screenshot.js';

const dialogSelection = query('#dialog-selection', HTMLDialogElement);
const buttonSaveSchematic = query('#btn-save-schm2', HTMLButtonElement);
const buttonScreenshot = query('#btn-screenshot2', HTMLButtonElement);

export function setup() {
	mode.setupDialog(dialogSelection);
	setupDialogCloseButton(dialogSelection);

	dialogSelection.addEventListener('close', () => {
		mode.setMode('selected');
	});

	buttonSaveSchematic.addEventListener('click', () => {
		dialogSave.open(storage.schematicPrefix, async () =>
			maybeCompress(selection.toSchematic()),
		);
	});

	buttonScreenshot.addEventListener('click', () => {
		dialogScreenshot.open('selection');
	});
}

export function open() {
	mode.openDialog(dialogSelection);
}
