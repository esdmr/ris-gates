import {assert, nonNullable} from '../../lib/assert.js';
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

function setRotation(newValue: number) {
	assert(selection.clipboard);
	newValue %= 1;
	selection.clipboard.rotation = newValue;

	const message = `Rotation: ${newValue * 360} degrees`;
	buttonRotate.setAttribute('aria-label', message);
	rotationTitle.textContent = message;

	const url = new URL(
		nonNullable(rotationIcon.getAttribute('href')),
		location.href,
	);
	url.hash = `#rot${newValue * 360}`;
	rotationIcon.setAttribute('href', url.href);
}

function setHorizontalReflection(newValue: boolean) {
	assert(selection.clipboard);
	selection.clipboard.horizontalReflection = newValue;
	buttonHorizontalReflection.setAttribute('aria-checked', String(newValue));
	buttonHorizontalReflection.classList.toggle('enabled', newValue);
}

function setVerticalReflection(newValue: boolean) {
	assert(selection.clipboard);
	selection.clipboard.verticalReflection = newValue;
	buttonVerticalReflection.setAttribute('aria-checked', String(newValue));
	buttonVerticalReflection.classList.toggle('enabled', newValue);
}

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
		setRotation(selection.clipboard.rotation + 0.25);
	});

	buttonRotate.addEventListener('contextmenu', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		setRotation(selection.clipboard.rotation + 0.75);
	});

	buttonHorizontalReflection.addEventListener('click', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		setHorizontalReflection(!selection.clipboard.horizontalReflection);
	});

	buttonVerticalReflection.addEventListener('click', (event) => {
		event.preventDefault();
		assert(selection.clipboard);
		setVerticalReflection(!selection.clipboard.verticalReflection);
	});
}

export function update() {
	assert(selection.clipboard);
	setRotation(selection.clipboard.rotation);
	setHorizontalReflection(selection.clipboard.horizontalReflection);
	setVerticalReflection(selection.clipboard.verticalReflection);
}
