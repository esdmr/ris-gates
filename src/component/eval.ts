import {assert} from '../lib/assert.js';
import {EvalContext} from '../lib/eval.js';
import * as mode from './mode.js';
import * as storage from './storage.js';
import * as tree from './tree.js';

let context: EvalContext | undefined;

export function getEvalContext() {
	assert(mode.mode === 'eval');
	if (!context) context = EvalContext.for(tree.tree);
	return context;
}

export function clearEvalContext() {
	context = undefined;
}

const configEvaluationRate = 'eval-rate';
const defaultEvaluationRate = 15;
export let evaluationRate = defaultEvaluationRate;

export function setEvaluationRate(newRate = defaultEvaluationRate) {
	evaluationRate = Math.ceil(newRate) || defaultEvaluationRate;

	if (evaluationRate < 1) evaluationRate = 1;
	else if (evaluationRate > 30) evaluationRate = 30;

	storage.setString(
		configEvaluationRate,
		String(evaluationRate),
		storage.configPrefix,
	);
}

export function setup() {
	setEvaluationRate(
		Number.parseInt(
			storage.getString(configEvaluationRate, storage.configPrefix, ''),
			10,
		),
	);
}
