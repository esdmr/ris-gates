import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {openDialog, setupDialog} from '../mode.js';

const dialogSaveFailed = query('#dialog-save-failed', HTMLDialogElement);

export function setup() {
	setupDialog(dialogSaveFailed);
	setupDialogCloseButton(dialogSaveFailed);
}

export function open(error?: unknown) {
	openDialog(dialogSaveFailed);
	console.error('Save failed:', error);
}

export function close() {
	dialogSaveFailed.close();
}
