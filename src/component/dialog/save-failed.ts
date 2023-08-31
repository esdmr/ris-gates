import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';

const dialogSaveFailed = query('#dialog-save-failed', HTMLDialogElement);

export function setup() {
	mode.setupDialog(dialogSaveFailed);
	setupDialogCloseButton(dialogSaveFailed);
}

export function open(error?: unknown) {
	mode.openDialog(dialogSaveFailed);
	console.error('Save failed:', error);
}
