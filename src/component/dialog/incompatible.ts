import {query} from '../../lib/dom.js';
import {currentSaveVersion} from '../../lib/tree.js';
import * as mode from '../mode.js';
import * as version from '../version.js';
import * as storage from '../storage.js';
import {copyText} from '../../lib/clipboard.js';
import {maybeDecompress, maybeCompress} from '../../lib/compress.js';
import * as dialogCopyFailed from './copy-failed.js';

const dialogIncompatible = query('#dialog-incompatible', HTMLDialogElement);
const previous = query('#previous-ver', HTMLSpanElement, dialogIncompatible);
const current = query('#current-ver', HTMLSpanElement, dialogIncompatible);
const buttonExport = query(
	'#btn-export2',
	HTMLButtonElement,
	dialogIncompatible,
);
const buttonReset = query('#btn-reset', HTMLButtonElement, dialogIncompatible);

const previousVersionText = version.previousVersion.join('.');
const clickThreshold = 5;
let clickCount = 0;

async function exportData(prefix: string) {
	// Cast safety: Procedurally populated object which will ultimately be stringified.
	const json = Object.create(null) as Record<string, unknown>;

	for (const key of storage.listStorage(prefix)) {
		json[key] = await maybeDecompress(storage.getString(key, prefix, ''));
	}

	return maybeCompress(json);
}

export function setup() {
	mode.setupDialog(dialogIncompatible);
	previous.textContent = previousVersionText;
	current.textContent = currentSaveVersion.join('.');

	buttonExport.addEventListener('click', async () => {
		const saves = await exportData(storage.savePrefix);
		const schematic = await exportData(storage.schematicPrefix);
		const text = `RIS Gates v${previousVersionText} export\nSaves: ${saves}\nSchematics: ${schematic}`;

		try {
			await copyText(text);
		} catch (error) {
			dialogCopyFailed.open(text, error);
		}
	});

	buttonReset.addEventListener('click', () => {
		if (clickCount === clickThreshold) {
			storage.removeEverything();
			location.reload();
		} else {
			buttonReset.textContent = `Are you${' really'.repeat(clickCount)} sure?`;
			clickCount++;
		}
	});
}

export function open() {
	mode.openDialog(dialogIncompatible);
}
