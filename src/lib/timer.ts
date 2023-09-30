export abstract class Timer {
	readonly promise: Promise<void>;
	protected _resolve!: (() => void) | undefined;
	protected _reject!: ((reason?: any) => void) | undefined;

	constructor() {
		this.promise = new Promise<void>((resolve, reject) => {
			this._resolve = resolve;
			this._reject = reject;
		});

		// Silence unhandled promise rejection when nobody uses the promise.
		this.promise.catch(() => undefined);
	}

	done() {
		this._clear();
		this._resolve?.();
		this._resolve = undefined;
		this._reject = undefined;
	}

	stop() {
		this._clear();
		this._reject?.(new Error('Timer ended'));
		this._resolve = undefined;
		this._reject = undefined;
	}

	protected abstract _clear(): void;
}

export class Interval extends Timer {
	private readonly _id;

	constructor(ms: number, callback: () => void) {
		super();
		this._id = setInterval(callback, ms);
	}

	protected override _clear() {
		clearInterval(this._id);
	}
}

export class Timeout extends Timer {
	private readonly _id;

	constructor(ms: number) {
		super();

		this._id = setTimeout(() => {
			this.done();
		}, ms);
	}

	protected override _clear() {
		clearTimeout(this._id);
	}
}
