import {createClickHandler, query} from '../../lib/dom.js';
import * as dialogEpilepsy from '../dialog/epilepsy.js';
import {clearEvalContext} from '../eval.js';
import {extendKeyBinds} from '../keyboard.js';
import {mode, setMode} from '../mode.js';
import {stopStabilityInterval, updateTickNo} from './eval.js';

const buttonEval = query('#hud-eval', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	extendKeyBinds('KeyE', {
		normal: createClickHandler(buttonEval),
		eval: createClickHandler(buttonEval),
	});

	buttonEval.addEventListener('click', () => {
		const isEval = mode !== 'eval';

		setMode(isEval ? 'eval' : 'normal');
		clearEvalContext();
		stopStabilityInterval();
		updateTickNo(0n);

		query('title', SVGTitleElement, buttonEval).textContent = isEval
			? 'modify'
			: 'evaluate';

		if (isEval) dialogEpilepsy.open();
	});
}
