/* eslint-disable @internal/explained-casts */
import {assert} from '../lib/assert.js';
import {QuadTree} from '../lib/tree.js';
import * as storage from '../storage.js';
import {replaceTree, tree} from '../tree.js';
import {updateAutoSaveState} from './page.js';

const dialogMenu = document.querySelector<HTMLDialogElement>('#dialog-menu')!;
assert(dialogMenu);

const dialogEpilepsy =
	document.querySelector<HTMLDialogElement>('#dialog-epilepsy')!;
assert(dialogEpilepsy);

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

let pasteKind: 'load' | 'import' = 'load';
const configMinorGrid = 'conf/minor-grid';
const configMajorGrid = 'conf/major-grid';
const configEvaluationRate = 'conf/eval-rate';
const configEpilepsyWarningShown = 'conf/epilepsy-warned';
const defaultEvaluationRate = 15;

export let shouldDrawMinorGrid = Boolean(
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	(storage.localStorageAvailable && localStorage.getItem(configMinorGrid)) ||
		false,
);

export let majorGridLength = BigInt(
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	(storage.localStorageAvailable && localStorage.getItem(configMajorGrid)) ||
		0n,
);

export let evaluationRate = normalizeEvaluationRate(
	storage.localStorageAvailable
		? Number.parseInt(localStorage.getItem(configEvaluationRate) ?? '', 10)
		: undefined,
);

let epilepsyWarningShown = Boolean(
	localStorage.getItem(configEpilepsyWarningShown),
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

		if (storage.localStorageAvailable) {
			localStorage.setItem(configEpilepsyWarningShown, 'y');
		}
	});

	const checkboxMinorGrid =
		dialogMenu.querySelector<HTMLInputElement>('#chk-minor-grid');
	assert(checkboxMinorGrid);
	checkboxMinorGrid.checked = shouldDrawMinorGrid;
	checkboxMinorGrid.addEventListener('change', () => {
		shouldDrawMinorGrid = checkboxMinorGrid.checked;

		if (storage.localStorageAvailable) {
			localStorage.setItem(configMinorGrid, shouldDrawMinorGrid ? 'y' : '');
		}
	});

	const inputMajorGrid =
		dialogMenu.querySelector<HTMLInputElement>('#inp-major-grid');
	assert(inputMajorGrid);
	inputMajorGrid.value = String(majorGridLength);
	inputMajorGrid.addEventListener('input', () => {
		majorGridLength = BigInt(inputMajorGrid.valueAsNumber || 0n);

		if (storage.localStorageAvailable) {
			localStorage.setItem(configMajorGrid, String(majorGridLength));
		}
	});

	const inputEvaluationRates = [
		dialogMenu.querySelector<HTMLInputElement>('#inp-eval-rate')!,
		dialogEpilepsy.querySelector<HTMLInputElement>('#inp-eval-rate2')!,
	];

	for (const inputEvaluationRate of inputEvaluationRates) {
		assert(inputEvaluationRate);
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

			if (storage.localStorageAvailable) {
				localStorage.setItem(configEvaluationRate, String(evaluationRate));
			}
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
			const {detail: key} = event as CustomEvent<string>;
			try {
				storage.load(key);
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

					// Firefox is weird. It doesn’t like closing the dialogs in the
					// paste event handler. So we do it in the next microtask.
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
			const {detail: key} = event as CustomEvent<string>;
			try {
				storage.remove(key);
				updateAutoSaveState(key);
				(event.target as HTMLElement).closest('li')?.remove();
			} catch (error) {
				dialogSaveFailed.showModal();
				console.error(error);
			}
		});

	dialogBrowse
		.querySelector<storage.SaveBrowserElement>('save-browser')
		?.addEventListener('secondary', async (event) => {
			const {detail: key} = event as CustomEvent<string>;
			const json = storage.getString(key)!;

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
		.querySelector('#btn-export')
		?.addEventListener('click', async () => {
			let text = '';

			for (const key of storage.listStorage()) {
				text += escapeKey(key) + '/' + storage.getString(key)! + '\n';
			}

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
