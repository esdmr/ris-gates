import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as dialogScreenshot from './screenshot.js';

const dialogSelection = query('#dialog-selection', HTMLDialogElement);
const buttonScreenshot = query('#btn-screenshot2', HTMLButtonElement);

export function setup() {
	mode.setupDialog(dialogSelection);
	setupDialogCloseButton(dialogSelection);

	dialogSelection.addEventListener('close', () => {
		mode.setMode('selected');
	});

	buttonScreenshot.addEventListener('click', () => {
		dialogScreenshot.open('selection');
	});
}

export function open() {
	mode.openDialog(dialogSelection);
}
