import {query} from '../../lib/dom.js';
import * as edit from './edit.js';
import * as evalToggle from './eval-toggle.js';
import * as eval_ from './eval.js';
import * as menu from './menu.js';
import * as pasteToggle from './paste-toggle.js';
import * as paste from './paste.js';
import * as selection from './selection.js';

const hud = query('.hud', HTMLDivElement);

export let isFloating = false;

export function setup() {
	edit.setup();
	evalToggle.setup();
	eval_.setup();
	menu.setup();
	pasteToggle.setup();
	paste.setup();
	selection.setup();

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
