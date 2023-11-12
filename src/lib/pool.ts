type Writable<T> = {-readonly [K in keyof T]: T[K]};

class Pool<T> {
	private readonly _pool: Array<Writable<T>> = [];
	private readonly _used: Array<Writable<T>> = [];

	constructor(private readonly create: () => Writable<T>) {}

	get() {
		const item = this._pool.pop() ?? this.create();
		this._used.push(item);
		return item;
	}
}
