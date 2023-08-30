import {assert} from '../lib/assert.js';
import {EvalContext} from '../lib/eval.js';
import {mode} from './mode.js';
import {configPrefix, getString, setString} from './storage.js';
import {tree} from './tree.js';

let context: EvalContext | undefined;

export function getEvalContext() {
	assert(mode === 'eval');
	if (!context) context = EvalContext.for(tree);
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

	setString(configEvaluationRate, String(evaluationRate), configPrefix);
}

export function setup() {
	setEvaluationRate(
		Number.parseInt(getString(configEvaluationRate, configPrefix, ''), 10),
	);
}
