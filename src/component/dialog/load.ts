import {assert} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {QuadTree} from '../../lib/tree.js';
import * as mode from '../mode.js';
import * as tree from '../tree.js';
import * as storage from '../storage.js';
import {pasteText} from '../../lib/clipboard.js';
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
			text = await pasteText();
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
