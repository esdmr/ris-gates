import {create, queryAll} from '../lib/dom.js';

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

export const oldSavePrefix = 'risg/';
export const savePrefix = 'save/';
export const configPrefix = 'conf/';
export const schematicPrefix = 'schm/';

export function getString(key: string, prefix?: string): string | undefined;

export function getString<F>(
	key: string,
	prefix: string | undefined,
	fallback: F,
): string | F;

export function getString(
	key: string,
	prefix = savePrefix,
	fallback = undefined,
) {
	return localStorageAvailable
		? localStorage.getItem(prefix + key) ?? fallback
		: fallback;
}

export function setString(key: string, string: string, prefix = savePrefix) {
	if (!localStorageAvailable) return;
	localStorage.setItem(prefix + key, string);
}

export function exists(key: string, prefix = savePrefix) {
	return getString(key, prefix) !== undefined;
}

export function remove(key: string, prefix = savePrefix) {
	if (!localStorageAvailable) return;
	localStorage.removeItem(prefix + key);
}

export function* listStorage(prefix = savePrefix) {
	if (!localStorageAvailable) return;
	const length = localStorage.length;

	for (let i = 0; i < length; i++) {
		// Cast safety: i is between 0 and `length - 1`. Since i is always
		// in-bounds, this will never return null.
		const key = localStorage.key(i)!;
		if (key.startsWith(prefix)) yield key.slice(prefix.length);
	}
}

export class StorageBrowserElement extends HTMLElement {
	storagePrefix = savePrefix;
	private readonly _buttons = new Map<string, string>();

	clear() {
		const children = [...this.children];

		for (const item of children) {
			item.remove();
		}
	}

	addButton(key: string, name: string) {
		this._buttons.set(key, name);
	}

	update() {
		this.clear();

		// eslint-disable-next-line @internal/no-object-literals
		const list = create('ul', {
			class: 'hide-list-bullets full-width',
			style: `--buttons: ${this._buttons.size}`,
		});

		for (const key of listStorage(this.storagePrefix)) {
			const item = create(
				'li',
				// eslint-disable-next-line @internal/no-object-literals
				{
					// Since `item` has `display: contents`, it might lose its
					// semantics.
					// <https://togithub.com/w3c/csswg-drafts/issues/3040>
					role: 'listitem',
				},
				// eslint-disable-next-line @internal/no-object-literals
				create('span', {}, key),
			);

			for (const [buttonKey, name] of this._buttons) {
				// eslint-disable-next-line @internal/no-object-literals
				const button = create('button', {}, name);

				button.addEventListener('click', () => {
					button.dispatchEvent(
						// eslint-disable-next-line @internal/no-object-literals
						new CustomEvent(buttonKey, {detail: key, bubbles: true}),
					);
				});

				item.append(button);
			}

			list.append(item);
		}

		if (list.childElementCount === 0) {
			// eslint-disable-next-line @internal/no-object-literals
			list.append(create('li', {}, '“There is nothing here.”'));
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

	const keys = [...listStorage(oldSavePrefix)];

	for (const key of keys) {
		setString(key, getString(key, oldSavePrefix, ''));
		remove(key, oldSavePrefix);
	}

	customElements.define('storage-browser', StorageBrowserElement);
}
