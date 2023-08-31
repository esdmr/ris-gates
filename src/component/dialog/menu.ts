import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {QuadTree} from '../../lib/tree.js';
import * as eval_ from '../eval.js';
import * as grid from '../grid.js';
import * as mode from '../mode.js';
import * as tree from '../tree.js';
import * as dialogBrowse from './browse.js';
import * as dialogLoad from './load.js';
import * as dialogSave from './save.js';
import * as dialogScreenshot from './screenshot.js';

const dialogMenu = query('#dialog-menu', HTMLDialogElement);
const checkboxMinorGrid = query(
	'#chk-minor-grid',
	HTMLInputElement,
	dialogMenu,
);
const inputMajorGrid = query('#inp-major-grid', HTMLInputElement, dialogMenu);
const inputEvalRate = query('#inp-eval-rate', HTMLInputElement, dialogMenu);
const buttonClear = query('#btn-clear', HTMLButtonElement, dialogMenu);
const buttonLoad = query('#btn-load', HTMLButtonElement, dialogMenu);
const buttonSave = query('#btn-save', HTMLButtonElement, dialogMenu);
const buttonBrowse = query('#btn-browse', HTMLButtonElement, dialogMenu);
const buttonScreenshot = query(
	'#btn-screenshot',
	HTMLButtonElement,
	dialogMenu,
);

export function setup() {
	mode.setupDialog(dialogMenu);
	setupDialogCloseButton(dialogMenu);

	checkboxMinorGrid.addEventListener('change', () => {
		grid.setMinorGridVisibility(checkboxMinorGrid.checked);
	});

	inputMajorGrid.addEventListener('input', () => {
		grid.setMajorGridLength(BigInt(inputMajorGrid.valueAsNumber || 0n));
	});

	inputEvalRate.addEventListener('input', () => {
		eval_.setEvaluationRate(inputEvalRate.valueAsNumber);
	});

	buttonClear.addEventListener('click', () => {
		tree.replaceTree(new QuadTree());
	});

	buttonLoad.addEventListener('click', () => {
		dialogLoad.open();
	});

	buttonSave.addEventListener('click', () => {
		dialogSave.open();
	});

	buttonBrowse.addEventListener('click', () => {
		dialogBrowse.open();
	});

	buttonScreenshot.addEventListener('click', () => {
		dialogScreenshot.open();
	});
}

export function open() {
	mode.openDialog(dialogMenu);

	checkboxMinorGrid.checked = grid.shouldDrawMinorGrid;
	inputMajorGrid.value = String(grid.majorGridLength);
	inputEvalRate.value = String(eval_.evaluationRate);
}

export function close() {
	dialogMenu.close();
}
