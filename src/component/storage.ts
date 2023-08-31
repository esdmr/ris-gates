import {queryAll} from '../lib/dom.js';
import {QuadTree} from '../lib/tree.js';
import * as tree from './tree.js';

export const localStorageAvailable = /* @__PURE__ */ (() => {
	try {
		const x = '__storage_test__';
		localStorage.setItem(x, x);
		localStorage.removeItem(x);
		return true;
	} catch (error) {
		return (
			error instanceof DOMException &&
			(error.name === 'QuotaExceededError' ||
				error.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
			localStorage &&
			localStorage.length > 0
		);
	}
})();

export const storagePrefix = 'risg/';
export const configPrefix = 'conf/';

export function getString(key: string, prefix?: string): string | undefined;

export function getString<F>(
	key: string,
	prefix: string | undefined,
	fallback: F,
): string | F;

export function getString(
	key: string,
	prefix = storagePrefix,
	fallback = undefined,
) {
	return localStorageAvailable
		? localStorage.getItem(prefix + key) ?? fallback
		: fallback;
}

export function setString(key: string, string: string, prefix = storagePrefix) {
	if (!localStorageAvailable) return;
	localStorage.setItem(prefix + key, string);
}

export function exists(key: string, prefix = storagePrefix) {
	return getString(key, prefix) !== undefined;
}

export function remove(key: string, prefix = storagePrefix) {
	if (!localStorageAvailable) return;
	localStorage.removeItem(prefix + key);
}

export function* listStorage(prefix = storagePrefix) {
	if (!localStorageAvailable) return;
	const length = localStorage.length;

	for (let i = 0; i < length; i++) {
		// Cast safety: i is between 0 and `length - 1`. Since i is always
		// in-bounds, this will never return null.
		const key = localStorage.key(i)!;
		if (key.startsWith(prefix)) yield key.slice(prefix.length);
	}
}

export function load(key: string) {
	if (!localStorageAvailable) return;
	tree.replaceTree(QuadTree.from(JSON.parse(getString(key) ?? 'null')));
}

export function save(key: string) {
	if (!localStorageAvailable) return;
	setString(key, JSON.stringify(tree.tree));
}

export class SaveBrowserElement extends HTMLElement {
	clear() {
		// eslint-disable-next-line unicorn/no-useless-spread
		for (const item of [...this.children]) {
			item.remove();
		}
	}

	update() {
		this.clear();
		const primary = this.getAttribute('primary');
		const secondary = this.getAttribute('secondary');

		const list = document.createElement('ul');
		list.classList.add('hide-list-bullets', 'full-width');

		let empty = true;

		for (const key of listStorage()) {
			empty = false;
			const item = document.createElement('li');
			item.textContent = key + ' ';

			if (primary) {
				const button = document.createElement('button');
				button.textContent = primary;
				button.addEventListener('click', () => {
					button.dispatchEvent(
						// eslint-disable-next-line @internal/no-object-literals
						new CustomEvent('primary', {detail: key, bubbles: true}),
					);
				});
				item.append(button);
			}

			if (secondary) {
				const button = document.createElement('button');
				button.textContent = secondary;
				button.addEventListener('click', () => {
					button.dispatchEvent(
						// eslint-disable-next-line @internal/no-object-literals
						new CustomEvent('secondary', {detail: key, bubbles: true}),
					);
				});
				item.append(button);
			}

			list.append(item);
		}

		if (empty) {
			const item = document.createElement('li');
			item.textContent = '“There is nothing here.”';
			list.append(item);
		}

		this.append(list);
	}
}

export function setup() {
	if (!localStorageAvailable) {
		for (const element of queryAll(
			'button.requires-local-storage',
			HTMLButtonElement,
		)) {
			element.disabled = true;
		}
	}

	customElements.define('save-browser', SaveBrowserElement);
}
