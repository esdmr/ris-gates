import {query, setupDialogCloseButton} from '../../lib/dom.js';
import * as eval_ from '../eval.js';
import * as mode from '../mode.js';
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
	mode.setupDialog(dialogEpilepsy);
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
		eval_.setEvaluationRate(inputEvalRate.valueAsNumber);
	});
}

export function open() {
	if (!epilepsyWarningShown) {
		mode.openDialog(dialogEpilepsy);

		inputEvalRate.value = String(eval_.evaluationRate);
	}
}

export function close() {
	dialogEpilepsy.close();
}
