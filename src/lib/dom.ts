import {assert, nonNullable} from './assert.js';

export type ConstructorOf<T> = abstract new (...args: any[]) => T;

export function query<K extends keyof HTMLElementTagNameMap>(
	selectors: K,
): HTMLElementTagNameMap[K];
export function query<K extends keyof SVGElementTagNameMap>(
	selectors: K,
): SVGElementTagNameMap[K];
export function query<T extends Element>(
	selector: string,
	constructor: ConstructorOf<T>,
	root?: ParentNode,
): T;

export function query(
	selector: string,
	constructor?: ConstructorOf<Element>,
	root: ParentNode = document,
) {
	const element = nonNullable(root.querySelector(selector));
	if (constructor) assert(element instanceof constructor);
	return element;
}

export function queryAll<T extends Element>(
	selector: string,
	constructor: ConstructorOf<T>,
	root: ParentNode = document,
) {
	const elements = [...root.querySelectorAll(selector)];

	for (const element of elements) {
		assert(element instanceof constructor);
	}

	// Cast safety: Asserted above.
	return elements as T[];
}

export function createClickHandler(element: HTMLButtonElement) {
	return () => {
		element.click();
	};
}

export function createContextMenuHandler(element: HTMLButtonElement) {
	return () => {
		element.dispatchEvent(new MouseEvent('contextmenu'));
	};
}

export function createInputUpdateHandler(element: HTMLInputElement) {
	return (value: unknown) => {
		const text = String(value);

		if (element.value !== text) {
			element.value = text;
		}
	};
}

export function setupDialogCloseButton(dialog: HTMLDialogElement) {
	const button = query('.close', HTMLButtonElement, dialog);

	button.addEventListener('click', () => {
		dialog.close();
	});
}

export function create<K extends keyof SVGElementTagNameMap>(
	qualifiedName: `svg:${K}`,
	attributes: Record<string, unknown>,
	...children: Array<Node | string>
): SVGElementTagNameMap[K];
export function create(
	qualifiedName: `svg:${string}`,
	attributes: Record<string, unknown>,
	...children: Array<Node | string>
): SVGElement;
export function create<K extends keyof HTMLElementTagNameMap>(
	qualifiedName: K,
	attributes: Record<string, unknown>,
	...children: Array<Node | string>
): HTMLElementTagNameMap[K];
export function create(
	qualifiedName: string,
	attributes: Record<string, unknown>,
	...children: Array<Node | string>
): HTMLElement;
export function create(
	qualifiedName: string,
	attributes: Record<string, unknown> & {xmlns?: string},
	...children: Array<Node | string>
) {
	const element = qualifiedName.startsWith('svg:')
		? document.createElementNS(
				'http://www.w3.org/2000/svg',
				qualifiedName.slice(4),
		  )
		: document.createElement(qualifiedName);

	for (const [key, value] of Object.entries(attributes)) {
		element.setAttribute(key, String(value));
	}

	element.append(...children);
	return element;
}
