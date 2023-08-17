import {assert} from '../lib/assert.js';
import {EvalContext} from '../lib/eval.js';
import {isEval} from './controls.js';
import {tree} from './tree.js';

let context: EvalContext | undefined;

export function getEvalContext() {
	assert(isEval);
	if (!context) context = EvalContext.for(tree);
	return context;
}

export function clearEvalContext() {
	context = undefined;
}
