import {FloatingBigInt} from '../lib/floating-bigint.js';
import {defaultScale, maximumScale, minimumScale} from '../constants.js';
import {exists, load, localStorageAvailable, save} from './storage.js';
import {canvas} from './canvas.js';

export const scrollX = /* @__PURE__ */ new FloatingBigInt();
export const scrollY = /* @__PURE__ */ new FloatingBigInt();
export let scale = defaultScale;

export function setScale(newScale: number) {
	scale = newScale;
	if (!Number.isFinite) scale = defaultScale;
	else if (scale < minimumScale) scale = minimumScale;
	else if (scale > maximumScale) scale = maximumScale;
}

export let backgroundStyle: string;
export let strokeStyle: string;
export let selectionStrokeStyle: string;

export function updateStylesFromCss() {
	const styles = getComputedStyle(canvas);
	backgroundStyle = styles.getPropertyValue('--background');
	strokeStyle = styles.getPropertyValue('--foreground');
	selectionStrokeStyle = styles.getPropertyValue('--selection');
}

const autoSaveKey = '__auto_save__';
let shouldAutoSave = localStorageAvailable;

export function updateAutoSaveState(removedKey: string) {
	if (removedKey === autoSaveKey) {
		shouldAutoSave = false;
	}
}

export function setup() {
	if (shouldAutoSave && exists(autoSaveKey)) {
		load(autoSaveKey);
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden' && shouldAutoSave) {
			save(autoSaveKey);
		}
	});

	matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		updateStylesFromCss();
	});

	updateStylesFromCss();
}
