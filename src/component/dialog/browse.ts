import {assert} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {QuadTree} from '../../lib/tree.js';
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

export function setup() {
	mode.setupDialog(dialogBrowse);
	setupDialogCloseButton(dialogBrowse);

	const saveBrowser = query(
		'save-browser',
		storage.SaveBrowserElement,
		dialogBrowse,
	);

	saveBrowser.addButton('Delete', 'Delete');
	saveBrowser.addEventListener('Delete', (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');
		assert(event.target instanceof HTMLElement);

		try {
			storage.remove(event.detail);
			autoSave.updateAutoSaveState(event.detail);

			if (event.target.closest('ul')?.childElementCount === 1) {
				saveBrowser.update();
			} else {
				event.target.closest('li')?.remove();
			}
		} catch (error) {
			dialogSaveFailed.open(error);
		}
	});

	saveBrowser.addButton('Copy', 'Copy to clipboard');
	saveBrowser.addEventListener('Copy', async (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');
		const json = storage.getString(event.detail, undefined, '');

		try {
			await copyText(json);
		} catch (error) {
			dialogCopyFailed.open(json, error);
		}
	});

	buttonExport.addEventListener('click', async () => {
		// Cast safety: Procedurally populated object which will ultimately be stringified.
		const json = Object.create(null) as Record<string, unknown>;

		for (const key of storage.listStorage()) {
			json[key] = JSON.parse(storage.getString(key, undefined, ''));
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
			dialogPasteFailed.open('import', error);
			return;
		}

		// Cast safety: Avoid any. Also causes the eslint error to go away.
		const json = JSON.parse(text) as unknown;
		assert(typeof json === 'object' && json !== null && !Array.isArray(json));

		for (const [key, value] of Object.entries(json)) {
			storage.setString(key, JSON.stringify(QuadTree.from(value)));
		}

		saveBrowser.update();
	});

	buttonDeleteAll.addEventListener('click', () => {
		const keys = [...storage.listStorage()];

		for (const key of keys) {
			storage.remove(key);
		}

		saveBrowser.update();
	});
}

export function open() {
	mode.openDialog(dialogBrowse);
}
