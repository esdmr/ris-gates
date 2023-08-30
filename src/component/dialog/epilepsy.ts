import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {evaluationRate, setEvaluationRate} from '../eval.js';
import {openDialog, setupDialog} from '../mode.js';
import * as storage from '../storage.js';

const dialogEpilepsy = query('#dialog-epilepsy', HTMLDialogElement);
const inputEvalRate = query(
	'#inp-eval-rate2',
	HTMLInputElement,
	dialogEpilepsy,
);
const configEpilepsyWarningShown = 'epilepsy-warned';

let epilepsyWarningShown = false;

function setEpilepsyWarningShown(value: boolean) {
	epilepsyWarningShown = value;

	storage.setString(
		configEpilepsyWarningShown,
		value ? 'y' : '',
		storage.configPrefix,
	);
}

export function setup() {
	setupDialog(dialogEpilepsy);
	setupDialogCloseButton(dialogEpilepsy);

	setEpilepsyWarningShown(
		Boolean(
			storage.getString(configEpilepsyWarningShown, storage.configPrefix),
		),
	);

	dialogEpilepsy.addEventListener('close', () => {
		setEpilepsyWarningShown(true);
	});

	inputEvalRate.addEventListener('input', () => {
		setEvaluationRate(inputEvalRate.valueAsNumber);
	});
}

export function open() {
	if (!epilepsyWarningShown) {
		openDialog(dialogEpilepsy);

		inputEvalRate.value = String(evaluationRate);
	}
}

export function close() {
	dialogEpilepsy.close();
}
