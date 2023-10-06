import {assert} from '../../lib/assert.js';
import {
	createClickHandler,
	createContextMenuHandler,
	query,
} from '../../lib/dom.js';
import * as keyboard from '../keyboard.js';
import * as mode from '../mode.js';
import * as selection from '../selection.js';

const buttonPasteCancel = query('#hud-paste-cancel', HTMLButtonElement);
const buttonRotate = query('#hud-rot', HTMLButtonElement);
const rotationTitle = query('title', SVGTitleElement, buttonRotate);
const rotationIcon = query('use', SVGUseElement, buttonRotate);
const buttonHorizontalReflection = query('#hud-hrefl', HTMLButtonElement);
const buttonVerticalReflection = query('#hud-vrefl', HTMLButtonElement);

export function setup() {
	/* eslint-disable @internal/no-object-literals */
	keyboard.extendKeyBinds('Escape', {
		pasting: createClickHandler(buttonPasteCancel),
	});
	keyboard.extendKeyBinds('KeyR', {
		pasting: createClickHandler(buttonRotate),
	});
	keyboard.extendKeyBinds('Shift KeyR', {
		pasting: createContextMenuHandler(buttonRotate),
	});
	keyboard.extendKeyBinds('KeyZ', {
		pasting: createClickHandler(buttonHorizontalReflection),
	});
	keyboard.extendKeyBinds('KeyX', {
		pasting: createClickHandler(buttonVerticalReflection),
	});
	/* eslint-enable @internal/no-object-literals */

	buttonPasteCancel.addEventListener('click', () => {
		mode.setMode('normal');
	});

	buttonRotate.addEventListener('click', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		selection.clipboard.rotation = (selection.clipboard.rotation + 0.25) % 1;

		const message = `Rotation: ${selection.clipboard.rotation * 360} degrees`;
		buttonRotate.setAttribute('aria-label', message);
		rotationTitle.textContent = message;

		rotationIcon.setAttribute(
			'href',
			`icons.svg#rot${selection.clipboard.rotation * 360}`,
		);
	});

	buttonRotate.addEventListener('contextmenu', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		selection.clipboard.rotation = (selection.clipboard.rotation + 0.75) % 1;

		const message = `Rotation: ${selection.clipboard.rotation * 360} degrees`;
		buttonRotate.setAttribute('aria-label', message);
		rotationTitle.textContent = message;

		rotationIcon.setAttribute(
			'href',
			`icons.svg#rot${selection.clipboard.rotation * 360}`,
		);
	});

	buttonHorizontalReflection.addEventListener('click', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		selection.clipboard.horizontalReflection =
			!selection.clipboard.horizontalReflection;
		buttonHorizontalReflection.setAttribute(
			'aria-checked',
			String(selection.clipboard.horizontalReflection),
		);
		buttonHorizontalReflection.classList.toggle(
			'enabled',
			selection.clipboard.horizontalReflection,
		);
	});

	buttonVerticalReflection.addEventListener('click', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		selection.clipboard.verticalReflection =
			!selection.clipboard.verticalReflection;
		buttonVerticalReflection.setAttribute(
			'aria-checked',
			String(selection.clipboard.verticalReflection),
		);
		buttonVerticalReflection.classList.toggle(
			'enabled',
			selection.clipboard.verticalReflection,
		);
	});
}
