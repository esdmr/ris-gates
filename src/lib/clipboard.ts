async function requestPermission(name: `clipboard-${'read' | 'write'}`) {
	try {
		// eslint-disable-next-line @internal/no-object-literals
		const permission = await navigator.permissions.query({
			// @ts-expect-error clipboard-write is not yet supported in
			// all browsers and it is not in lib.dom.
			name,
		});

		if (permission.state === 'denied') {
			throw new Error('Not allowed to write to clipboard.');
		}

		return undefined;
	} catch (error) {
		return error;
	}
}

export async function copyText(text: string) {
	const permissionError = await requestPermission('clipboard-write');

	try {
		await navigator.clipboard.writeText(text);
	} catch (error) {
		throw permissionError ?? error;
	}
}

export async function pasteText() {
	const permissionError = await requestPermission('clipboard-read');

	try {
		return await navigator.clipboard.readText();
	} catch (error) {
		throw permissionError ?? error;
	}
}
