export function assert(condition: unknown): asserts condition {
	if (!condition) {
		throw new Error('Assertion Error');
	}
}

export function nonNullable<T>(expression: T) {
	assert(expression !== null && expression !== undefined);
	return expression;
}

export function assertObject(
	value: unknown,
): asserts value is Record<string, unknown> {
	assert(typeof value === 'object' && value !== null);
}

export function assertArray(
	value: unknown,
): asserts value is readonly unknown[] {
	assert(Array.isArray(value));
}
