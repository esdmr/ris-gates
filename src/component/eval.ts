import {assert} from '../lib/assert.js';
import {EvalContext, evalEvents} from '../lib/eval.js';
import * as mode from './mode.js';
import * as storage from './storage.js';
import * as tree from './tree.js';

export let context: EvalContext | undefined;

export function getEvalContext() {
	assert(mode.mode === 'eval' || mode.mode === 'automated');
	if (!context) setEvalContext(new EvalContext(tree.tree));
	// Cast safety: Assigned above.
	return context!;
}

export function setEvalContext(newContext: EvalContext | undefined) {
	context?.stop();
	context = newContext;
	evalEvents.dispatchEvent(new Event('reset'));
	newContext?.start(evaluationRate);
}

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

export function setup() {
	setEvaluationRate(
		Number.parseInt(
			storage.getString(configEvaluationRate, storage.configPrefix, ''),
			10,
		),
	);
}
