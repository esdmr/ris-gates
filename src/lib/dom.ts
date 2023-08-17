import {assert, nonNullable} from './assert.js';

export type ConstructorOf<T> = abstract new (...args: any[]) => T;

export function query<K extends keyof HTMLElementTagNameMap>(
	selectors: K,
): HTMLElementTagNameMap[K];
export function query<K extends keyof SVGElementTagNameMap>(
	selectors: K,
): SVGElementTagNameMap[K];
export function query<K extends keyof MathMLElementTagNameMap>(
	selectors: K,
): MathMLElementTagNameMap[K];
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