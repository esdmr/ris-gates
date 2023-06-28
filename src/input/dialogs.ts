/* eslint-disable @internal/explained-casts */
import {assert} from '../lib/assert.js';
import {QuadTree} from '../lib/tree.js';
import {load, remove, save, type SaveBrowserElement} from '../storage.js';
import {replaceTree, tree} from '../tree.js';

const dialogMenu = document.querySelector<HTMLDialogElement>('#dialog-menu')!;
assert(dialogMenu);

const dialogLoad = document.querySelector<HTMLDialogElement>('#dialog-load')!;
assert(dialogLoad);

const dialogLoadFailed = document.querySelector<HTMLDialogElement>(
	'#dialog-load-failed',
)!;
assert(dialogLoadFailed);

const dialogPasteFailed = document.querySelector<HTMLDialogElement>(
	'#dialog-paste-failed',
)!;
assert(dialogPasteFailed);

const dialogSave = document.querySelector<HTMLDialogElement>('#dialog-save')!;
assert(dialogSave);

const dialogSaveFailed = document.querySelector<HTMLDialogElement>(
	'#dialog-save-failed',
)!;
assert(dialogSaveFailed);

const dialogCopyFailed = document.querySelector<HTMLDialogElement>(
	'#dialog-copy-failed',
)!;
assert(dialogCopyFailed);

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

dialogMenu
	.querySelector<HTMLButtonElement>('#btn-clear')
	?.addEventListener('click', () => {
		replaceTree(new QuadTree());
	});

dialogLoad
	.querySelector<SaveBrowserElement>('save-browser')
	?.addEventListener('primary', (event) => {
		const {detail: key} = event as CustomEvent<string>;
		try {
			load(key);
			dialogLoad.close();
			dialogMenu.close();
		} catch (error) {
			dialogLoadFailed.showModal();
			console.error(error);
		}
	});

dialogLoad
	.querySelector<HTMLButtonElement>('#btn-paste')
	?.addEventListener('click', async () => {
		let text;

		try {
			let otherError;

			try {
				// eslint-disable-next-line @internal/no-object-literals
				const permission = await navigator.permissions.query({
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
			const textarea = dialogPasteFailed.querySelector('textarea');
			if (textarea) textarea.value = '';
			dialogPasteFailed.showModal();
			console.error(error);
			return;
		}

		try {
			replaceTree(QuadTree.from(JSON.parse(text)));
			dialogLoad.close();
			dialogMenu.close();
		} catch (error) {
			dialogLoadFailed.showModal();
			console.error(error);
		}
	});

dialogPasteFailed
	.querySelector('textarea')
	?.addEventListener('paste', (event) => {
		try {
			replaceTree(
				QuadTree.from(
					JSON.parse(event.clipboardData?.getData('Text') ?? 'null'),
				),
			);

			// Firefox is weird. It doesn’t like closing the dialogs in the
			// paste event handler. So we do it in the next microtask.
			queueMicrotask(() => {
				dialogMenu.close();
				dialogLoad.close();
				dialogPasteFailed.close();
			});
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
		dialogSave.close();
		dialogMenu.close();
	} catch (error) {
		dialogSaveFailed.showModal();
		console.error(error);
	}
});

dialogSave
	.querySelector<HTMLButtonElement>('#btn-copy')
	?.addEventListener('click', async () => {
		const json = JSON.stringify(tree);

		try {
			let otherError;

			try {
				// eslint-disable-next-line @internal/no-object-literals
				const permission = await navigator.permissions.query({
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
			const textarea = dialogCopyFailed.querySelector('textarea');
			if (textarea) textarea.value = json;
			dialogCopyFailed.showModal();
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

export function isMenuDialogOpen() {
	return dialogMenu.open;
}
