import * as canvas from './canvas.js';

export let backgroundStyle: string;
export let strokeStyle: string;
export let selectionStrokeStyle: string;

export function updateStylesFromCss() {
	const styles = getComputedStyle(canvas.canvas);
	backgroundStyle = styles.getPropertyValue('--background');
	strokeStyle = styles.getPropertyValue('--foreground');
	selectionStrokeStyle = styles.getPropertyValue('--selection');
}

export function setup() {
	matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		updateStylesFromCss();
	});

	updateStylesFromCss();
}
