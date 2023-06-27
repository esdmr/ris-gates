/* eslint-disable @internal/explained-casts */
import {assert} from '../lib/assert.js';
import {load, remove, save, type SaveBrowserElement} from '../storage.js';

const dialogMenu = document.querySelector<HTMLDialogElement>('#dialog-menu')!;
assert(dialogMenu);

const dialogLoad = document.querySelector<HTMLDialogElement>('#dialog-load')!;
assert(dialogLoad);

const dialogLoadFailed = document.querySelector<HTMLDialogElement>(
	'#dialog-load-failed',
)!;
assert(dialogLoadFailed);

const dialogSave = document.querySelector<HTMLDialogElement>('#dialog-save')!;
assert(dialogSave);

const dialogSaveFailed = document.querySelector<HTMLDialogElement>(
	'#dialog-save-failed',
)!;
assert(dialogSaveFailed);

const dialogBrowse =
	document.querySelector<HTMLDialogElement>('#dialog-browse')!;
assert(dialogBrowse);

for (const dialog of document.querySelectorAll('dialog')) {
	dialog.querySelector('.close')?.addEventListener('click', () => {
		dialog.close();
	});

	dialog.addEventListener('close', () => {
		for (const saveBrowser of dialog.querySelectorAll<SaveBrowserElement>(
			'save-browser',
		)) {
			saveBrowser.clear();
		}
	});
}

for (const element of document.querySelectorAll<HTMLElement>(
	'[data-open-dialog]',
)) {
	const dialog = document.querySelector<HTMLDialogElement>(
		`#dialog-${element.dataset.openDialog!}`,
	);

	element.addEventListener('click', () => {
		if (!dialog) return;
		dialog.showModal();

		for (const saveBrowser of dialog.querySelectorAll<SaveBrowserElement>(
			'save-browser',
		)) {
			saveBrowser.update();
		}

		for (const input of dialog.querySelectorAll('input')) {
			input.value = '';
		}
	});
}

dialogLoad
	.querySelector<SaveBrowserElement>('save-browser')
	?.addEventListener('primary', (event) => {
		const {detail: key} = event as CustomEvent<string>;
		try {
			load(key);
		} catch (error) {
			dialogLoadFailed.showModal();
			console.error(error);
		}
	});

dialogSave.querySelector('form')?.addEventListener('formdata', (event) => {
	const name = event.formData.get('name');
	if (!name || typeof name !== 'string') return;
	try {
		save(name);
	} catch (error) {
		dialogSaveFailed.showModal();
		console.error(error);
	}
});

dialogBrowse
	.querySelector<SaveBrowserElement>('save-browser')
	?.addEventListener('primary', (event) => {
		const {detail: key} = event as CustomEvent<string>;
		try {
			remove(key);
			(event.target as HTMLElement).closest('li')?.remove();
		} catch (error) {
			dialogSaveFailed.showModal();
			console.error(error);
		}
	});
