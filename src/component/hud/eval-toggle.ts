import {createClickHandler, query} from '../../lib/dom.js';
import * as dialogEpilepsy from '../dialog/epilepsy.js';
import * as eval_ from '../eval.js';
import * as keyboard from '../keyboard.js';
import * as mode from '../mode.js';

const buttonEval = query('#hud-eval', HTMLButtonElement);

export function setup() {
	// eslint-disable-next-line @internal/no-object-literals
	keyboard.extendKeyBinds('KeyE', {
		normal: createClickHandler(buttonEval),
		eval: createClickHandler(buttonEval),
	});

	buttonEval.addEventListener('click', () => {
		const isEval = mode.mode !== 'eval';

		mode.setMode(isEval ? 'eval' : 'normal');
		eval_.setEvalContext(undefined);

		buttonEval.setAttribute('aria-checked', String(isEval));
		query('title', SVGTitleElement, buttonEval).textContent = isEval
			? 'modify'
			: 'evaluate';

		if (isEval) dialogEpilepsy.open();
	});
}
