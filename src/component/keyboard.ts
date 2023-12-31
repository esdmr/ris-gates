import * as mode from './mode.js';

const keyBinds = new Map<string, Partial<Record<mode.Mode, () => void>>>();

export function extendKeyBinds(
	name: string,
	binds: Partial<Record<mode.Mode, () => void>>,
) {
	// eslint-disable-next-line @internal/no-object-literals
	keyBinds.set(name, {
		...keyBinds.get(name),
		...binds,
	});
}

export function setup() {
	document.body.addEventListener('keydown', (event) => {
		const key =
			(event.altKey ? 'Alt ' : '') +
			(event.ctrlKey ? 'Control ' : '') +
			(event.shiftKey ? 'Shift ' : '') +
			event.code;

		const handler = keyBinds.get(key)?.[mode.mode];
		if (!handler) return;

		event.preventDefault();
		if (!event.repeat) handler();
	});
}
