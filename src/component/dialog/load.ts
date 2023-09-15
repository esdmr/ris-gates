import {assert} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as storage from '../storage.js';
import {pasteText} from '../../lib/clipboard.js';
import * as dialogLoadFailed from './load-failed.js';
import * as dialogPasteFailed from './paste-failed.js';

const dialogLoad = query('#dialog-load', HTMLDialogElement);
const buttonPaste = query('#btn-paste', HTMLButtonElement, dialogLoad);

let resolve: ((value: string) => void) | undefined;
let reject: ((reason?: unknown) => void) | undefined;
let prefix: string;

export function setup() {
	mode.setupDialog(dialogLoad);
	setupDialogCloseButton(dialogLoad);

	dialogLoad.addEventListener('close', () => {
		reject?.('Dialog closed');
		resolve = undefined;
		reject = undefined;
	});

	const storageBrowser = query(
		'storage-browser',
		storage.StorageBrowserElement,
		dialogLoad,
	);

	storageBrowser.addButton('Load', 'Load');
	storageBrowser.addEventListener('Load', (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');

		try {
			resolve?.(storage.getString(event.detail, prefix, 'null'));
			resolve = undefined;
			reject = undefined;
			mode.closeAllDialogs();
		} catch (error) {
			dialogLoadFailed.open(error);
		}
	});

	buttonPaste.addEventListener('click', async () => {
		let text;

		try {
			text = await pasteText();
		} catch (error) {
			text = await dialogPasteFailed.open(error);
		}

		try {
			resolve?.(text);
			resolve = undefined;
			reject = undefined;
			mode.closeAllDialogs();
		} catch (error) {
			dialogLoadFailed.open(error);
		}
	});
}

export async function open(prefix_: string) {
	prefix = prefix_;

	query(
		'storage-browser',
		storage.StorageBrowserElement,
		dialogLoad,
	).storagePrefix = prefix_;

	mode.openDialog(dialogLoad);

	return new Promise<string>((resolve_, reject_) => {
		resolve = resolve_;
		reject = reject_;
	});
}
