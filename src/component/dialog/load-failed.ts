import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';

const dialogLoadFailed = query('#dialog-load-failed', HTMLDialogElement);

export function setup() {
	mode.setupDialog(dialogLoadFailed);
	setupDialogCloseButton(dialogLoadFailed);
}

export function open(error?: unknown) {
	mode.openDialog(dialogLoadFailed);

	console.error('Load failed:', error);
}
