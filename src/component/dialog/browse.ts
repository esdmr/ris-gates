import {assert, assertObject} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as storage from '../storage.js';
import * as autoSave from '../auto-save.js';
import {copyText, pasteText} from '../../lib/clipboard.js';
import * as dialogSaveFailed from './save-failed.js';
import * as dialogCopyFailed from './copy-failed.js';
import * as dialogPasteFailed from './paste-failed.js';

const dialogBrowse = query('#dialog-browse', HTMLDialogElement);
const buttonExport = query('#btn-export', HTMLButtonElement, dialogBrowse);
const buttonImport = query('#btn-import', HTMLButtonElement, dialogBrowse);
const buttonDeleteAll = query(
	'#btn-delete-all',
	HTMLButtonElement,
	dialogBrowse,
);

let prefix: string;
let constructor: (json: unknown) => unknown;

export function setup() {
	mode.setupDialog(dialogBrowse);
	setupDialogCloseButton(dialogBrowse);

	const storageBrowser = query(
		'storage-browser',
		storage.StorageBrowserElement,
		dialogBrowse,
	);

	storageBrowser.addButton('Delete', 'Delete');
	storageBrowser.addEventListener('Delete', (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');
		assert(event.target instanceof HTMLElement);

		try {
			storage.remove(event.detail, prefix);
			autoSave.updateAutoSaveState(event.detail);

			if (event.target.closest('ul')?.childElementCount === 1) {
				storageBrowser.update();
			} else {
				event.target.closest('li')?.remove();
			}
		} catch (error) {
			dialogSaveFailed.open(error);
		}
	});

	storageBrowser.addButton('Copy', 'Copy to clipboard');
	storageBrowser.addEventListener('Copy', async (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');
		const json = storage.getString(event.detail, prefix, '');

		try {
			await copyText(json);
		} catch (error) {
			dialogCopyFailed.open(json, error);
		}
	});

	buttonExport.addEventListener('click', async () => {
		// Cast safety: Procedurally populated object which will ultimately be stringified.
		const json = Object.create(null) as Record<string, unknown>;

		for (const key of storage.listStorage(prefix)) {
			json[key] = JSON.parse(storage.getString(key, prefix, ''));
		}

		const text = JSON.stringify(json);

		try {
			await copyText(text);
		} catch (error) {
			dialogCopyFailed.open(text, error);
		}
	});

	buttonImport.addEventListener('click', async () => {
		let text;

		try {
			text = await pasteText();
		} catch (error) {
			text = await dialogPasteFailed.open(error);
		}

		// Cast safety: Avoid any. Also causes the eslint error to go away.
		const json = JSON.parse(text) as unknown;
		assertObject(json);

		for (const [key, value] of Object.entries(json)) {
			storage.setString(key, JSON.stringify(constructor(value)), prefix);
		}

		storageBrowser.update();
	});

	buttonDeleteAll.addEventListener('click', () => {
		const keys = [...storage.listStorage(prefix)];

		for (const key of keys) {
			storage.remove(key, prefix);
		}

		storageBrowser.update();
	});
}

export function open(
	prefix_: string,
	constructor_: (json: unknown) => unknown,
) {
	prefix = prefix_;
	constructor = constructor_;

	query(
		'storage-browser',
		storage.StorageBrowserElement,
		dialogBrowse,
	).storagePrefix = prefix_;

	mode.openDialog(dialogBrowse);
}
