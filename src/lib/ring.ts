export class RingBuffer<T> {
	private readonly _array: Array<T | undefined>;
	private _index = 0;

	constructor(private readonly _size: number) {
		// eslint-disable-next-line unicorn/no-new-array
		this._array = new Array<undefined>(_size).fill(undefined);
	}

	push(item: T) {
		if (this._size === 0) return;
		this._array[this._index] = item;
		this._index = (this._index + 1) % this._size;
	}

	updateLast(item: T) {
		if (this._size === 0) return;
		this._array[this._index] = item;
	}

	pop() {
		if (this._size === 0) return;
		this._index = (this._index + this._size - 1) % this._size;
		const item = this._array[this._index];
		this._array[this._index] = undefined;
		return item;
	}
}
