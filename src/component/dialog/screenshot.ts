import {nonNullable} from '../../lib/assert.js';
import {query, setupDialogCloseButton} from '../../lib/dom.js';
import {canvas, outputToSvg} from '../canvas.js';
import {openDialog, setMode, setupDialog} from '../mode.js';
import * as theme from '../theme.js';
import {scale, scrollX, scrollY, setScale} from '../tree.js';

const dialogScreenshot = query('#dialog-screenshot', HTMLDialogElement);
const screenshotForm = query('form', HTMLFormElement, dialogScreenshot);
const inputX = query('[name=x]', HTMLInputElement, screenshotForm);
const inputY = query('[name=y]', HTMLInputElement, screenshotForm);
const inputScale = query('[name=scale]', HTMLInputElement, screenshotForm);
const inputDip = query('[name=dip]', HTMLInputElement, screenshotForm);
const inputDark = query('[name=dark]', HTMLInputElement, screenshotForm);
const inputWidth = query('[name=width]', HTMLInputElement, screenshotForm);
const inputHeight = query('[name=height]', HTMLInputElement, screenshotForm);

export let useDip = true;

function setupScreenshotOverrides(formData = new FormData(screenshotForm)) {
	if (!dialogScreenshot.open) return;

	const offsetX = nonNullable(formData.get('x')).toString();
	const offsetY = nonNullable(formData.get('y')).toString();
	const scale = nonNullable(formData.get('scale')).toString();
	const dip = Boolean(formData.get('dip')?.toString());
	const darkTheme = Boolean(formData.get('dark')?.toString());
	const width = nonNullable(formData.get('width')).toString();
	const height = nonNullable(formData.get('height')).toString();

	setMode('screenshot');
	scrollX.fromString(offsetX);
	scrollY.fromString(offsetY);
	setScale(Number(scale));
	useDip = dip;
	document.body.classList.toggle('dark', darkTheme);
	canvas.width = Number(width);
	canvas.height = Number(height);
	theme.updateStylesFromCss();
}

function clearScreenshotOverrides() {
	setMode('inert');
	document.body.classList.remove('dark');
	theme.updateStylesFromCss();
}

async function takeScreenshot(formData: FormData) {
	const type = nonNullable(formData.get('type')).toString();
	let data: string | Blob;

	switch (type) {
		case 'svg': {
			data = await outputToSvg();
			break;
		}

		case 'png': {
			data = await new Promise<Blob>((resolve, reject) => {
				requestAnimationFrame(() => {
					canvas.toBlob(async (blob) => {
						if (blob) resolve(blob);
						else reject(new Error('Failed to generate screenshot'));
					}, 'image/png');
				});
			});
			break;
		}

		default: {
			throw new Error(`Unsupported screenshot type: ${String(type)}`);
		}
	}

	const fileName = `screenshot.${type}`;
	const url = URL.createObjectURL(new File([data], fileName));
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();

	setTimeout(() => {
		link.remove();
		URL.revokeObjectURL(url);
	}, 100);
}

export function setup() {
	setupDialog(dialogScreenshot);
	setupDialogCloseButton(dialogScreenshot);

	dialogScreenshot.addEventListener('close', () => {
		clearScreenshotOverrides();
	});

	screenshotForm.addEventListener('change', () => {
		setupScreenshotOverrides();
	});

	screenshotForm.addEventListener('check', () => {
		setupScreenshotOverrides();
	});

	screenshotForm.addEventListener('submit', (event) => {
		event.preventDefault();
		const formData = new FormData(screenshotForm, event.submitter);
		setupScreenshotOverrides(formData);
		void takeScreenshot(formData);
	});
}

export function open() {
	inputX.value = String(scrollX);
	inputY.value = String(scrollY);
	inputScale.value = String(scale);
	inputDip.checked = true;
	inputDark.checked = matchMedia('(prefers-color-scheme: dark)').matches;
	inputWidth.value = String(canvas.clientWidth * devicePixelRatio);
	inputHeight.value = String(canvas.clientHeight * devicePixelRatio);

	openDialog(dialogScreenshot);
	setupScreenshotOverrides();
}

export function close() {
	dialogScreenshot.close();
}
