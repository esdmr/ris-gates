import {isEval} from './input/controls.js';
import {assert} from './lib/assert.js';
import {EvalContext} from './lib/eval.js';
import {tree} from './tree.js';

let context: EvalContext | undefined;

export function getEvalContext() {
	assert(isEval);
	if (!context) context = EvalContext.for(tree);
	(globalThis as any).ctx = context;
	return context;
}

export function clearEvalContext() {
	context = undefined;
}
