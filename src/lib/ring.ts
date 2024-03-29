export class RingBuffer<T> {
	protected readonly _array: Array<T | undefined>;
	protected _index = 0;

	constructor(protected readonly _size: number) {
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

export class PooledRingBuffer<T> extends RingBuffer<T> {
	// eslint-disable-next-line @typescript-eslint/ban-types
	private readonly _pool: Array<T & object> = [];

	getFromPool() {
		return this._pool.pop();
	}

	addToPool(currentValue: T | undefined) {
		if (typeof currentValue === 'object' && currentValue !== null) {
			this._pool.push(currentValue);
		}
	}

	override push(item: T): void {
		this.addToPool(this._array[this._index]);
		super.push(item);
	}

	override updateLast(item: T): void {
		this.addToPool(this._array[this._index]);
		super.updateLast(item);
	}
}
