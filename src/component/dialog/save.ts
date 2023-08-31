import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as tree from '../tree.js';
import * as storage from '../storage.js';
import {copyText} from '../../lib/clipboard.js';
import * as dialogSaveFailed from './save-failed.js';
import * as dialogCopyFailed from './copy-failed.js';

const dialogSave = query('#dialog-save', HTMLDialogElement);
const form = query('form', HTMLFormElement, dialogSave);
const inputName = query('[name=name]', HTMLInputElement, form);
const buttonCopy = query('#btn-copy', HTMLButtonElement, dialogSave);

export function setup() {
	mode.setupDialog(dialogSave);
	setupDialogCloseButton(dialogSave);

	form.addEventListener('formdata', (event) => {
		const name = event.formData.get('name');
		if (!name || typeof name !== 'string') return;
		try {
			storage.save(name);
			mode.closeAllDialogs();
		} catch (error) {
			dialogSaveFailed.open(error);
		}
	});

	buttonCopy.addEventListener('click', async () => {
		const json = JSON.stringify(tree.tree);

		try {
			await copyText(json);
		} catch (error) {
			dialogCopyFailed.open(json, error);
		}
	});
}

export function open() {
	mode.openDialog(dialogSave);
	inputName.value = '';
}
