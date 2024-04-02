async function compress(data: string) {
	const buffer = await new Response(
		new Blob([data]).stream().pipeThrough(new CompressionStream('gzip')),
	).arrayBuffer();
	const uint8 = Array.from(new Uint8Array(buffer))
		.map((i) => String.fromCodePoint(i))
		.join('');
	return btoa(uint8);
}

async function decompress(data: string) {
	return new Response(
		new Blob([
			Uint8Array.from(atob(data), (i) => i.codePointAt(0) ?? 0).buffer,
		])
			.stream()
			.pipeThrough(new DecompressionStream('gzip')),
	).text();
}

export async function maybeCompress(data: unknown) {
	const json = JSON.stringify(data);
	const compressed = await compress(json);
	return compressed.length < json.length ? compressed : json;
}

export async function maybeDecompress(json: string) {
	json = json.trim();

	// GZipped files start of the magic string `1F 8B`. Converting it to base64
	// will result in `H4…`. Since `H` is an invalid character at the start of a
	// JSON string, we will use it to differentiate between raw JSON and base64
	// gzip.
	if (json.startsWith('H')) {
		json = await decompress(json);
	}

	// Cast safety: unknown is more correct compared to a blanket any.
	return JSON.parse(json) as unknown;
}
