import {queryAll} from '../lib/dom.js';
import * as storage from './storage.js';

export type Mode =
	| 'normal'
	| 'eval'
	| 'automated'
	| 'picking'
	| 'selected'
	| 'pasting'
	| 'inert'
	| 'screenshot';

export let mode: Mode = 'inert';
setMode('normal');

export function setMode(newMode: Mode) {
	mode = newMode;
	document.body.dataset.mode = mode;
}

const openDialogs = new Set<HTMLDialogElement>();

export function setupDialog(dialog: HTMLDialogElement) {
	dialog.addEventListener('close', () => {
		openDialogs.delete(dialog);
		setMode(openDialogs.size > 0 ? 'inert' : 'normal');

		for (const browser of queryAll(
			'storage-browser',
			storage.StorageBrowserElement,
			dialog,
		)) {
			browser.clear();
		}
	});
}

export function openDialog(dialog: HTMLDialogElement) {
	dialog.returnValue = '';
	dialog.showModal();
	openDialogs.add(dialog);
	setMode('inert');

	for (const browser of queryAll(
		'storage-browser',
		storage.StorageBrowserElement,
		dialog,
	)) {
		browser.update();
	}
}

export function closeAllDialogs() {
	for (const dialog of openDialogs) {
		dialog.close();
	}
}
