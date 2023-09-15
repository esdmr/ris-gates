import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as dialogLoadFailed from './load-failed.js';

const dialogPasteFailed = query('#dialog-paste-failed', HTMLDialogElement);
const textarea = query('textarea', HTMLTextAreaElement, dialogPasteFailed);

let resolve: ((value: string) => void) | undefined;
let reject: ((reason?: unknown) => void) | undefined;

export function setup() {
	mode.setupDialog(dialogPasteFailed);
	setupDialogCloseButton(dialogPasteFailed);

	dialogPasteFailed.addEventListener('close', () => {
		reject?.('Dialog closed');
		resolve = undefined;
		reject = undefined;
	});

	textarea.addEventListener('paste', (event) => {
		try {
			const text = event.clipboardData?.getData('Text') ?? 'null';
			resolve?.(text);
			resolve = undefined;
			reject = undefined;

			queueMicrotask(() => {
				dialogPasteFailed.close();
			});
		} catch (error) {
			dialogLoadFailed.open(error);
		}
	});
}

export async function open(error?: unknown) {
	mode.openDialog(dialogPasteFailed);
	textarea.value = '';
	console.error('Paste failed:', error);

	return new Promise<string>((resolve_, reject_) => {
		resolve = resolve_;
		reject = reject_;
	});
}
