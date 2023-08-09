import {assert, nonNullable} from '../lib/assert.js';
import {QuadTree} from '../lib/tree.js';
import * as storage from '../storage.js';
import {replaceTree, tree} from '../tree.js';
import {updateAutoSaveState} from './page.js';

const dialogMenu = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-menu'),
);

const dialogEpilepsy = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-epilepsy'),
);

const dialogLoad = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-load'),
);

const dialogLoadFailed = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-load-failed'),
);

const dialogPasteFailed = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-paste-failed'),
);

const dialogSave = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-save'),
);

const dialogSaveFailed = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-save-failed'),
);

const dialogCopyFailed = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-copy-failed'),
);

const dialogBrowse = nonNullable(
	document.querySelector<HTMLDialogElement>('#dialog-browse'),
);

const checkboxMinorGrid = nonNullable(
	dialogMenu.querySelector<HTMLInputElement>('#chk-minor-grid'),
);

const inputMajorGrid = nonNullable(
	dialogMenu.querySelector<HTMLInputElement>('#inp-major-grid'),
);

let pasteKind: 'load' | 'import' = 'load';
const configMinorGrid = 'minor-grid';
const configMajorGrid = 'major-grid';
const configEvaluationRate = 'eval-rate';
const configEpilepsyWarningShown = 'epilepsy-warned';
const defaultEvaluationRate = 15;

export let shouldDrawMinorGrid = Boolean(
	storage.getString(configMinorGrid, storage.configPrefix),
);

export let majorGridLength = BigInt(
	storage.getString(configMajorGrid, storage.configPrefix, 0n),
);

export let evaluationRate = normalizeEvaluationRate(
	Number.parseInt(
		storage.getString(configEvaluationRate, storage.configPrefix, ''),
		10,
	),
);

let epilepsyWarningShown = Boolean(
	storage.getString(configEpilepsyWarningShown, storage.configPrefix),
);

function escapeKey(key: string) {
	return key.replaceAll('\\', '\\<').replaceAll('/', '\\>');
}

function unescapeKey(key: string) {
	return key.replaceAll('\\>', '/').replaceAll('\\<', '\\');
}

function normalizeEvaluationRate(rate = defaultEvaluationRate) {
	rate = Math.ceil(rate) || defaultEvaluationRate;

	if (rate < 1) rate = 1;
	else if (rate > 30) rate = 30;

	return rate;
}

export function isMenuDialogOpen() {
	return dialogMenu.open;
}

export function maybeShowEpilepsyWarning() {
	if (!epilepsyWarningShown) {
		dialogEpilepsy.showModal();
	}
}

export function setup() {
	for (const dialog of document.querySelectorAll('dialog')) {
		dialog.querySelector('.close')?.addEventListener('click', () => {
			dialog.close();
		});

		dialog.addEventListener('close', () => {
			for (const saveBrowser of dialog.querySelectorAll<storage.SaveBrowserElement>(
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
			// Cast safety: We are looping over all elements with
			// data-open-dialog attribute, so this can never be undefined.
			`#dialog-${element.dataset.openDialog!}`,
		);

		element.addEventListener('click', () => {
			if (!dialog) return;
			dialog.showModal();

			for (const saveBrowser of dialog.querySelectorAll<storage.SaveBrowserElement>(
				'save-browser',
			)) {
				saveBrowser.update();
			}

			for (const input of dialog.querySelectorAll('input')) {
				if (!input.dataset.keepValue) {
					input.value = '';
				}
			}
		});
	}

	dialogEpilepsy.addEventListener('close', () => {
		epilepsyWarningShown = true;

		storage.setString(configEpilepsyWarningShown, 'y', storage.configPrefix);
	});

	checkboxMinorGrid.checked = shouldDrawMinorGrid;
	checkboxMinorGrid.addEventListener('change', () => {
		shouldDrawMinorGrid = checkboxMinorGrid.checked;

		storage.setString(
			configMinorGrid,
			shouldDrawMinorGrid ? 'y' : '',
			storage.configPrefix,
		);
	});

	inputMajorGrid.value = String(majorGridLength);
	inputMajorGrid.addEventListener('input', () => {
		majorGridLength = BigInt(inputMajorGrid.valueAsNumber || 0n);

		storage.setString(
			configMajorGrid,
			String(majorGridLength),
			storage.configPrefix,
		);
	});

	const inputEvaluationRates = [
		dialogMenu.querySelector<HTMLInputElement>('#inp-eval-rate'),
		dialogEpilepsy.querySelector<HTMLInputElement>('#inp-eval-rate2'),
	].map((i) => nonNullable(i));

	for (const inputEvaluationRate of inputEvaluationRates) {
		inputEvaluationRate.value = String(evaluationRate);

		// eslint-disable-next-line @typescript-eslint/no-loop-func
		inputEvaluationRate.addEventListener('input', () => {
			evaluationRate = normalizeEvaluationRate(
				inputEvaluationRate.valueAsNumber,
			);

			for (const otherInput of inputEvaluationRates) {
				if (otherInput !== inputEvaluationRate) {
					otherInput.value = inputEvaluationRate.value;
				}
			}

			storage.setString(
				configEvaluationRate,
				String(evaluationRate),
				storage.configPrefix,
			);
		});
	}

	dialogMenu
		.querySelector<HTMLButtonElement>('#btn-clear')
		?.addEventListener('click', () => {
			replaceTree(new QuadTree());
		});

	dialogLoad
		.querySelector<storage.SaveBrowserElement>('save-browser')
		?.addEventListener('primary', (event) => {
			assert(event instanceof CustomEvent);
			assert(typeof event.detail === 'string');

			try {
				storage.load(event.detail);
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
				const textarea = dialogPasteFailed.querySelector('textarea');
				if (textarea) textarea.value = '';
				pasteKind = 'load';
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
				const text = event.clipboardData?.getData('Text') ?? 'null';

				if (pasteKind === 'load') {
					replaceTree(QuadTree.from(JSON.parse(text)));

					// Firefox is weird. It does not like closing the dialogs in
					// the paste event handler. So we do it in the next
					// microtask.
					queueMicrotask(() => {
						dialogMenu.close();
						dialogLoad.close();
						dialogPasteFailed.close();
					});
				} else {
					for (const line of text.trim().split('\n')) {
						const [key, value] = line.split('/');
						assert(key);
						assert(value);
						QuadTree.from(JSON.parse(value));
						storage.setString(unescapeKey(key), value);
					}

					dialogBrowse
						.querySelector<storage.SaveBrowserElement>('save-browser')
						?.update();

					queueMicrotask(() => {
						dialogPasteFailed.close();
					});
				}
			} catch (error) {
				dialogLoadFailed.showModal();
				console.error(error);
			}
		});

	dialogSave.querySelector('form')?.addEventListener('formdata', (event) => {
		const name = event.formData.get('name');
		if (!name || typeof name !== 'string') return;
		try {
			storage.save(name);
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
					dialogSave.close();
					dialogMenu.close();
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
		.querySelector<storage.SaveBrowserElement>('save-browser')
		?.addEventListener('primary', (event) => {
			assert(event instanceof CustomEvent);
			assert(typeof event.detail === 'string');
			assert(event.target instanceof HTMLElement);

			try {
				storage.remove(event.detail);
				updateAutoSaveState(event.detail);
				event.target.closest('li')?.remove();
			} catch (error) {
				dialogSaveFailed.showModal();
				console.error(error);
			}
		});

	dialogBrowse
		.querySelector<storage.SaveBrowserElement>('save-browser')
		?.addEventListener('secondary', async (event) => {
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
				const textarea = dialogCopyFailed.querySelector('textarea');
				if (textarea) textarea.value = json;
				dialogCopyFailed.showModal();
				console.error(error);
			}
		});

	dialogBrowse
		.querySelector('#btn-export')
		?.addEventListener('click', async () => {
			let text = '';

			for (const key of storage.listStorage()) {
				text +=
					escapeKey(key) + '/' + storage.getString(key, undefined, '') + '\n';
			}

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
				const textarea = dialogCopyFailed.querySelector('textarea');
				if (textarea) textarea.value = text;
				dialogCopyFailed.showModal();
				console.error(error);
			}
		});

	dialogBrowse
		.querySelector('#btn-import')
		?.addEventListener('click', async () => {
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
				const textarea = dialogPasteFailed.querySelector('textarea');
				if (textarea) textarea.value = '';
				pasteKind = 'import';
				dialogPasteFailed.showModal();
				console.error(error);
				return;
			}

			for (const line of text.trim().split('\n')) {
				const [key, value] = line.split('/');
				assert(key);
				assert(value);
				QuadTree.from(JSON.parse(value));
				storage.setString(unescapeKey(key), value);
			}

			dialogBrowse
				.querySelector<storage.SaveBrowserElement>('save-browser')
				?.update();
		});

	dialogBrowse
		.querySelector('#btn-delete-all')
		?.addEventListener('click', () => {
			const keys = [...storage.listStorage()];

			for (const key of keys) {
				storage.remove(key);
			}

			dialogBrowse
				.querySelector<storage.SaveBrowserElement>('save-browser')
				?.update();
		});
}
