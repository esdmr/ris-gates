import {
	query,
	queryAll,
	setupDialogCloseButton,
	create,
} from '../../lib/dom.js';
import * as canvas from '../canvas.js';
import * as mode from '../mode.js';
import * as theme from '../theme.js';
import * as tree from '../tree.js';
import * as selection from '../selection.js';
import {Timeout} from '../../lib/timer.js';
import {asNumber} from '../../lib/bigint.js';

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

function setupScreenshotOverrides() {
	if (!dialogScreenshot.open) return;

	mode.setMode('screenshot');
	tree.scrollX.fromString(inputX.value);
	tree.scrollY.fromString(inputY.value);
	tree.setScale(inputScale.valueAsNumber);
	useDip = inputDip.checked;
	document.body.classList.toggle('dark', inputDark.checked);
	canvas.canvas.width = inputWidth.valueAsNumber;
	canvas.canvas.height = inputHeight.valueAsNumber;
	theme.updateStylesFromCss();
}

function clearScreenshotOverrides() {
	mode.setMode('inert');
	document.body.classList.remove('dark');
	theme.updateStylesFromCss();
}

async function takeScreenshot(type: string) {
	let data: string | Blob;

	switch (type) {
		case 'svg': {
			data = await canvas.outputToSvg();
			break;
		}

		case 'png': {
			data = await new Promise<Blob>((resolve, reject) => {
				requestAnimationFrame(() => {
					canvas.canvas.toBlob(async (blob) => {
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

	// eslint-disable-next-line @internal/no-object-literals
	const link = create('a', {
		href: url,
		download: fileName,
	});

	document.body.append(link);
	link.click();
	await new Timeout(100).promise;
	link.remove();
	URL.revokeObjectURL(url);
}

export function setup() {
	mode.setupDialog(dialogScreenshot);
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

	for (const button of queryAll(
		'[name=type]',
		HTMLButtonElement,
		dialogScreenshot,
	)) {
		button.addEventListener('click', () => {
			setupScreenshotOverrides();
			void takeScreenshot(button.value);
		});
	}
}

export function open(target?: 'selection') {
	inputScale.value = tree.scale.toFixed(1);
	inputDip.checked = true;
	inputDark.checked = matchMedia('(prefers-color-scheme: dark)').matches;

	if (target === 'selection') {
		const realScale = inputScale.valueAsNumber * devicePixelRatio;
		const box = selection.getBox();
		inputX.value = String(box.topLeft.x);
		inputY.value = String(box.topLeft.y);
		inputWidth.value = String(realScale * asNumber(box.width));
		inputHeight.value = String(realScale * asNumber(box.height));
	} else {
		inputX.value = tree.scrollX.toString();
		inputY.value = tree.scrollY.toString();
		inputWidth.value = (
			canvas.canvas.clientWidth * devicePixelRatio
		).toFixed(0);
		inputHeight.value = (
			canvas.canvas.clientHeight * devicePixelRatio
		).toFixed(0);
	}

	mode.openDialog(dialogScreenshot);
	setupScreenshotOverrides();
}
