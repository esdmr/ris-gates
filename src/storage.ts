import {QuadTree} from './lib/tree.js';
import {replaceTree, tree} from './tree.js';

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

export function load(key: string) {
	replaceTree(QuadTree.from(JSON.parse(getString(key) ?? 'null')));
}

export function getString(key: string) {
	return localStorage.getItem(storagePrefix + key);
}

export function save(key: string) {
	localStorage.setItem(storagePrefix + key, JSON.stringify(tree));
}

export function setString(key: string, string: string) {
	localStorage.setItem(storagePrefix + key, string);
}

export function exists(key: string) {
	return localStorage.getItem(storagePrefix + key) !== null;
}

export function remove(key: string) {
	localStorage.removeItem(storagePrefix + key);
}

export function* listStorage() {
	const length = localStorage.length;

	for (let i = 0; i < length; i++) {
		// Cast safety: i is between 0 and `length - 1`. Since i is always
		// in-bounds, this will never return null.
		const key = localStorage.key(i)!;
		if (key.startsWith(storagePrefix)) yield key.slice(storagePrefix.length);
	}
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
		for (const element of document.querySelectorAll<HTMLButtonElement>(
			'button.requires-local-storage',
		)) {
			element.disabled = true;
		}
	}

	customElements.define('save-browser', SaveBrowserElement);
}
