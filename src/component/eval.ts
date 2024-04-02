import {assert} from '../lib/assert.js';
import {queryAll} from '../lib/dom.js';
import {
	EvalContext,
	EvalGraph,
	TilesMap,
	evalEvents,
	getEvaluator,
} from '../lib/eval.js';
import * as mode from './mode.js';
import * as storage from './storage.js';
import * as tree from './tree.js';

const configEvaluationRate = 'eval-rate';
const defaultEvaluationRate = 15;
const minimumEvaluationRate = 1;
const maximumEvaluationRate = 30;
export let evaluationRate = defaultEvaluationRate;

export function setEvaluationRate(newRate = defaultEvaluationRate) {
	evaluationRate = Math.ceil(newRate) || defaultEvaluationRate;

	if (evaluationRate < minimumEvaluationRate)
		evaluationRate = minimumEvaluationRate;
	else if (evaluationRate > maximumEvaluationRate)
		evaluationRate = maximumEvaluationRate;

	storage.setString(
		configEvaluationRate,
		String(evaluationRate),
		storage.configPrefix,
	);
}

const configEvaluationUndoCount = 'eval-undo';
const defaultEvaluationUndoCount = 128;
const minimumEvaluationUndoCount = 0;
const maximumEvaluationUndoCount = 2048;
export let evaluationUndoCount = defaultEvaluationUndoCount;

export function setEvaluationUndoCount(newRate = defaultEvaluationUndoCount) {
	newRate = Math.ceil(
		Number.isSafeInteger(newRate) ? newRate : defaultEvaluationUndoCount,
	);

	if ((evaluationUndoCount === 0) !== (newRate === 0)) {
		for (const element of queryAll(
			'button.requires-undo',
			HTMLButtonElement,
		)) {
			element.disabled = newRate === 0;
		}
	}

	evaluationUndoCount = newRate;

	if (evaluationUndoCount < minimumEvaluationUndoCount)
		evaluationUndoCount = minimumEvaluationUndoCount;
	else if (evaluationUndoCount > maximumEvaluationUndoCount)
		evaluationUndoCount = maximumEvaluationUndoCount;

	storage.setString(
		configEvaluationUndoCount,
		String(evaluationUndoCount),
		storage.configPrefix,
	);
}

const configWasm = 'eval-wasm';
export let useWasm = true;

export function setEvaluationWasm(newValue: boolean) {
	useWasm = newValue;

	storage.setString(configWasm, newValue ? 'y' : '', storage.configPrefix);
}

export let context: EvalContext | undefined;

export function getEvalContext() {
	assert(mode.mode === 'eval' || mode.mode === 'automated');

	if (!context) {
		setEvalContext(
			new EvalContext(
				getEvaluator(new EvalGraph(new TilesMap(tree.tree)), useWasm),
				evaluationUndoCount,
			),
		);
	}

	// Cast safety: Assigned above.
	return context!;
}

export function setEvalContext(newContext: EvalContext | undefined) {
	context?.stop();
	context = newContext;
	evalEvents.dispatchEvent(new Event('reset'));
	newContext?.start(evaluationRate);
}

export function setup() {
	setEvaluationRate(
		Number.parseInt(
			storage.getString(configEvaluationRate, storage.configPrefix, ''),
			10,
		),
	);

	setEvaluationUndoCount(
		Number.parseInt(
			storage.getString(
				configEvaluationUndoCount,
				storage.configPrefix,
				'',
			),
			10,
		),
	);

	setEvaluationWasm(
		Boolean(storage.getString(configWasm, storage.configPrefix, 'y')),
	);
}
