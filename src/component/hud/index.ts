import {query} from '../../lib/dom.js';
import * as hudAutomated from './automated.js';
import * as hudEdit from './edit.js';
import * as hudEvalToggle from './eval-toggle.js';
import * as hudEval from './eval.js';
import * as hudMenu from './menu.js';
import * as hudPasteToggle from './paste-toggle.js';
import * as hudPaste from './paste.js';
import * as hudPick from './pick.js';
import * as hudSelection from './selection.js';

const hud = query('.hud', HTMLDivElement);

export let isFloating = false;

export function setup() {
	hudAutomated.setup();
	hudEdit.setup();
	hudEvalToggle.setup();
	hudEval.setup();
	hudMenu.setup();
	hudPasteToggle.setup();
	hudPaste.setup();
	hudPick.setup();
	hudSelection.setup();

	hud.addEventListener('click', (event) => {
		if (isFloating && !event.defaultPrevented) {
			dock();
		}
	});
}

export function float(centerX: number, centerY: number) {
	isFloating = true;
	hud.classList.add('floating');
	hud.style.setProperty('--top', `${centerY}px`);
	hud.style.setProperty('--left', `${centerX}px`);
}

export function dock() {
	isFloating = false;
	hud.classList.remove('floating');
}
