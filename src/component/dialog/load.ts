import {assert} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {QuadTree} from '../../lib/tree.js';
import * as mode from '../mode.js';
import * as tree from '../tree.js';
import * as storage from '../storage.js';
import * as dialogLoadFailed from './load-failed.js';
import * as dialogPasteFailed from './paste-failed.js';

const dialogLoad = query('#dialog-load', HTMLDialogElement);
const buttonPaste = query('#btn-paste', HTMLButtonElement, dialogLoad);

export function setup() {
	mode.setupDialog(dialogLoad);
	setupDialogCloseButton(dialogLoad);

	const saveBrowser = query(
		'save-browser',
		storage.SaveBrowserElement,
		dialogLoad,
	);

	saveBrowser.addEventListener('primary', (event) => {
		assert(event instanceof CustomEvent);
		assert(typeof event.detail === 'string');

		try {
			storage.load(event.detail);
			mode.closeAllDialogs();
		} catch (error) {
			dialogLoadFailed.open(error);
		}
	});

	buttonPaste.addEventListener('click', async () => {
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
			dialogPasteFailed.open('load', error);
			return;
		}

		try {
			tree.replaceTree(QuadTree.from(JSON.parse(text)));
			mode.closeAllDialogs();
		} catch (error) {
			dialogLoadFailed.open(error);
		}
	});
}

export function open() {
	mode.openDialog(dialogLoad);
}

export function close() {
	dialogLoad.close();
}
