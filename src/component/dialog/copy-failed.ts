import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';

const dialogCopyFailed = query('#dialog-copy-failed', HTMLDialogElement);
const textarea = query('textarea', HTMLTextAreaElement, dialogCopyFailed);

export function setup() {
	mode.setupDialog(dialogCopyFailed);
	setupDialogCloseButton(dialogCopyFailed);
}

export function open(text: string, error?: unknown) {
	mode.openDialog(dialogCopyFailed);
	textarea.value = text;
	console.error('Copy failed:', error);
}
