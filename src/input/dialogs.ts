import {assert, nonNullable} from '../lib/assert.js';
import {query, queryAll} from '../lib/dom.js';
import {QuadTree} from '../lib/tree.js';
import * as storage from '../storage.js';
import {replaceTree, tree} from '../tree.js';
import {canvas, outputToSvg} from './canvas.js';
import * as page from './page.js';

const dialogMenu = query('#dialog-menu', HTMLDialogElement);
const dialogEpilepsy = query('#dialog-epilepsy', HTMLDialogElement);
const dialogLoad = query('#dialog-load', HTMLDialogElement);
const dialogLoadFailed = query('#dialog-load-failed', HTMLDialogElement);
const dialogPasteFailed = query('#dialog-paste-failed', HTMLDialogElement);
const dialogSave = query('#dialog-save', HTMLDialogElement);
const dialogSaveFailed = query('#dialog-save-failed', HTMLDialogElement);
const dialogCopyFailed = query('#dialog-copy-failed', HTMLDialogElement);
const dialogBrowse = query('#dialog-browse', HTMLDialogElement);
const checkboxMinorGrid = query(
	'#chk-minor-grid',
	HTMLInputElement,
	dialogMenu,
);
const inputMajorGrid = query('#inp-major-grid', HTMLInputElement, dialogMenu);
const dialogScreenshot = query('#dialog-screenshot', HTMLDialogElement);
const screenshotForm = query('form', HTMLFormElement, dialogScreenshot);

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

export let takingScreenshot = false;

function setupScreenshotOverrides(formData = new FormData(screenshotForm)) {
	const offsetX = nonNullable(formData.get('x')).toString();
	const offsetY = nonNullable(formData.get('y')).toString();
	const scale = nonNullable(formData.get('scale')).toString();
	const darkTheme = Boolean(formData.get('dark')?.toString());
	const width = nonNullable(formData.get('width')).toString();
	const height = nonNullable(formData.get('height')).toString();

	takingScreenshot = true;
	document.body.classList.add('screenshot');
	page.scrollX.fromString(offsetX);
	page.scrollY.fromString(offsetY);
	page.setScale(Number(scale));
	document.body.classList.toggle('dark', darkTheme);
	canvas.width = Number(width);
	canvas.height = Number(height);
	page.updateStylesFromCss();
}

function clearScreenshotOverrides() {
	takingScreenshot = false;
	document.body.classList.remove('screenshot', 'dark');
	page.updateStylesFromCss();
}

async function takeScreenshot(formData: FormData) {
	const type = nonNullable(formData.get('type')).toString();
	let data: string | Blob;

	switch (type) {
		case 'svg': {
			data = await outputToSvg();
			break;
		}

		case 'png': {
			data = await new Promise<Blob>((resolve, reject) => {
				requestAnimationFrame(() => {
					canvas.toBlob(async (blob) => {
						if (blob) resolve(blob);
						else reject(new Error('Failed to generate screenshot'));
					}, 'image/png');
				});
			});
			break;
		}

		default: {
			throw new Error(`Unsupported screenshot type: ${String(type)}`);
		}
	}

	const fileName = `screenshot.${type}`;
	const url = URL.createObjectURL(new File([data], fileName));
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();

	setTimeout(() => {
		link.remove();
		URL.revokeObjectURL(url);
	}, 100);
}

export function setup() {
	for (const dialog of queryAll('dialog', HTMLDialogElement)) {
		dialog.querySelector('.close')?.addEventListener('click', () => {
			dialog.close();
		});

		dialog.addEventListener('close', () => {
			for (const saveBrowser of queryAll(
				'save-browser',
				storage.SaveBrowserElement,
				dialog,
			)) {
				saveBrowser.clear();
			}
		});
	}

	for (const element of queryAll('[data-open-dialog]', HTMLElement)) {
		const dialog = query(
			// Cast safety: We are looping over all elements with
			// data-open-dialog attribute, so this can never be undefined.
			`#dialog-${element.dataset.openDialog!}`,
			HTMLDialogElement,
		);

		element.addEventListener('click', () => {
			if (!dialog || dialog.open) return;
			dialog.showModal();

			for (const saveBrowser of queryAll(
				'save-browser',
				storage.SaveBrowserElement,
				dialog,
			)) {
				saveBrowser.update();
			}

			for (const input of queryAll('input', HTMLInputElement, dialog)) {
				if (!input.dataset.keepValue) {
					input.value = '';
				}
			}

			dialog.dispatchEvent(new Event('DialogOpen'));
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
		query('#inp-eval-rate', HTMLInputElement, dialogMenu),
		query('#inp-eval-rate2', HTMLInputElement, dialogEpilepsy),
	];

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
				page.updateAutoSaveState(event.detail);
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

	dialogScreenshot.addEventListener('DialogOpen', () => {
		query('[name=x]', HTMLInputElement, screenshotForm).value = String(
			page.scrollX,
		);
		query('[name=y]', HTMLInputElement, screenshotForm).value = String(
			page.scrollY,
		);
		query('[name=scale]', HTMLInputElement, screenshotForm).value = String(
			page.scale,
		);
		query('[name=dark]', HTMLInputElement, screenshotForm).checked = matchMedia(
			'(prefers-color-scheme: dark)',
		).matches;
		query('[name=width]', HTMLInputElement, screenshotForm).value = String(
			canvas.clientWidth,
		);
		query('[name=height]', HTMLInputElement, screenshotForm).value = String(
			canvas.clientHeight,
		);

		setupScreenshotOverrides();
	});

	dialogScreenshot.addEventListener('close', () => {
		clearScreenshotOverrides();
	});

	screenshotForm.addEventListener('change', () => {
		setupScreenshotOverrides();
	});

	screenshotForm.addEventListener('check', () => {
		setupScreenshotOverrides();
	});

	screenshotForm.addEventListener('submit', (event) => {
		event.preventDefault();
		const formData = new FormData(screenshotForm, event.submitter);
		setupScreenshotOverrides(formData);
		void takeScreenshot(formData);
	});
}
