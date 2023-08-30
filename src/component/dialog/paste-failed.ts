import {assert} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {QuadTree} from '../../lib/tree.js';
import {closeAllDialogs, openDialog, setupDialog} from '../mode.js';
import * as storage from '../storage.js';
import {replaceTree} from '../tree.js';
import * as dialogBrowse from './browse.js';
import * as dialogLoadFailed from './load-failed.js';

const dialogPasteFailed = query('#dialog-paste-failed', HTMLDialogElement);
const textarea = query('textarea', HTMLTextAreaElement, dialogPasteFailed);

let pasteKind: 'load' | 'import' = 'load';

export function setup() {
	setupDialog(dialogPasteFailed);
	setupDialogCloseButton(dialogPasteFailed);

	textarea.addEventListener('paste', (event) => {
		try {
			const text = event.clipboardData?.getData('Text') ?? 'null';

			if (pasteKind === 'load') {
				replaceTree(QuadTree.from(JSON.parse(text)));

				// Firefox is weird. It does not like closing the dialogs in
				// the paste event handler. So we do it in the next
				// microtask.
				queueMicrotask(() => {
					closeAllDialogs();
				});
			} else {
				// Cast safety: Avoid any. Also causes the eslint error to go away.
				const json = JSON.parse(text) as unknown;
				assert(
					typeof json === 'object' && json !== null && !Array.isArray(json),
				);

				for (const [key, value] of Object.entries(json)) {
					storage.setString(key, JSON.stringify(QuadTree.from(value)));
				}

				dialogBrowse.open();

				queueMicrotask(() => {
					dialogPasteFailed.close();
				});
			}
		} catch (error) {
			dialogLoadFailed.open(error);
		}
	});
}

export function open(kind: 'load' | 'import', error?: unknown) {
	openDialog(dialogPasteFailed);
	pasteKind = kind;
	textarea.value = '';
	console.error('Paste failed:', error);
}

export function close() {
	dialogPasteFailed.close();
}
