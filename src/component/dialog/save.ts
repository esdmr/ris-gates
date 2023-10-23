import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as mode from '../mode.js';
import * as storage from '../storage.js';
import {copyText} from '../../lib/clipboard.js';
import * as dialogSaveFailed from './save-failed.js';
import * as dialogCopyFailed from './copy-failed.js';

const dialogSave = query('#dialog-save', HTMLDialogElement);
const form = query('form', HTMLFormElement, dialogSave);
const inputName = query('[name=name]', HTMLInputElement, form);
const buttonCopy = query('#btn-copy', HTMLButtonElement, dialogSave);

let prefix: string;
let getData: () => string | Promise<string>;

export function setup() {
	mode.setupDialog(dialogSave);
	setupDialogCloseButton(dialogSave);

	form.addEventListener('formdata', async (event) => {
		const name = event.formData.get('name');
		if (!name || typeof name !== 'string') return;
		try {
			storage.setString(name, await getData(), prefix);
			mode.closeAllDialogs();
		} catch (error) {
			dialogSaveFailed.open(error);
		}
	});

	buttonCopy.addEventListener('click', async () => {
		const data = await getData();

		try {
			await copyText(data);
			mode.closeAllDialogs();
		} catch (error) {
			dialogCopyFailed.open(data, error);
		}
	});
}

export function open(
	prefix_: string,
	getData_: () => string | Promise<string>,
) {
	prefix = prefix_;
	getData = getData_;

	query(
		'storage-browser',
		storage.StorageBrowserElement,
		dialogSave,
	).storagePrefix = prefix_;

	mode.openDialog(dialogSave);
	inputName.value = '';
}
