import {assert} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {QuadTree} from '../../lib/tree.js';
import * as mode from '../mode.js';
import * as storage from '../storage.js';
import * as autoSave from '../auto-save.js';
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

	saveBrowser.addEventListener('primary', (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');
		assert(event.target instanceof HTMLElement);

		try {
			storage.remove(event.detail);
			autoSave.updateAutoSaveState(event.detail);
			event.target.closest('li')?.remove();
		} catch (error) {
			dialogSaveFailed.open(error);
		}
	});

	saveBrowser.addEventListener('secondary', async (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');
		const json = storage.getString(event.detail, undefined, '');

		try {
			let otherError;

			try {
				// eslint-disable-next-line @internal/no-object-literals
				const permission = await navigator.permissions.query({
					// Cast safety: clipboard-write is not yet supported in
					// all browsers and it is not in lib.dom.
					name: 'clipboard-write' as never,
				});

				if (permission.state === 'denied') {
					throw new Error('Not allowed to write to clipboard.');
				}
			} catch (error) {
				otherError = error;
			}

			try {
				await navigator.clipboard.writeText(json);
			} catch (error) {
				throw otherError ?? error;
			}
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
			let otherError;

			try {
				// eslint-disable-next-line @internal/no-object-literals
				const permission = await navigator.permissions.query({
					// Cast safety: clipboard-write is not yet supported in
					// all browsers and it is not in lib.dom.
					name: 'clipboard-write' as never,
				});

				if (permission.state === 'denied') {
					throw new Error('Not allowed to write to clipboard.');
				}
			} catch (error) {
				otherError = error;
			}

			try {
				await navigator.clipboard.writeText(text);
			} catch (error) {
				throw otherError ?? error;
			}
		} catch (error) {
			dialogCopyFailed.open(text, error);
		}
	});

	buttonImport.addEventListener('click', async () => {
		let text;

		try {
			let otherError;

			try {
				// eslint-disable-next-line @internal/no-object-literals
				const permission = await navigator.permissions.query({
					// Cast safety: clipboard-read is not yet supported in
					// all browsers and it is not in lib.dom.
					name: 'clipboard-read' as never,
				});

				if (permission.state === 'denied') {
					throw new Error('Not allowed to read clipboard.');
				}
			} catch (error) {
				otherError = error;
			}

			try {
				text = await navigator.clipboard.readText();
			} catch (error) {
				throw otherError ?? error;
			}
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

export function close() {
	dialogBrowse.close();
}
