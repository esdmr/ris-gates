import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {openDialog, setupDialog} from '../mode.js';

const dialogLoadFailed = query('#dialog-load-failed', HTMLDialogElement);

export function setup() {
	setupDialog(dialogLoadFailed);
	setupDialogCloseButton(dialogLoadFailed);
}

export function open(error?: unknown) {
	openDialog(dialogLoadFailed);

	console.error('Load failed:', error);
}

export function close() {
	dialogLoadFailed.close();
}
