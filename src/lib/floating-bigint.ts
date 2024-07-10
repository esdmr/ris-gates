import {absBigInt, parseBigInt, toBigInt, toFixedPoint} from './bigint.js';

export class FloatingBigInt {
	constructor(
		public bigint = 0n,
		public float = 0,
	) {}

	normalize() {
		if (!Number.isFinite(this.float)) {
			this.float = 0;
		}

		if (this.float < 0 || this.float >= 1) {
			this.bigint += toBigInt(this.float);
			this.float %= 1;

			if (this.float < 0) {
				this.bigint -= 1n;
				this.float += 1;
			}
		}
	}

	fromString(text: string) {
		const match = /^(?<sign>[-+]?)(?<bigint>\d+)(?<decimal>\.\d*)?$/.exec(
			text,
		);

		if (match) {
			// Cast safety: Derived from regex match groups.
			const {sign, bigint, decimal} = match.groups as {
				sign: string;
				bigint: string;
				decimal?: string;
			};

			this.bigint = parseBigInt(sign + bigint);
			this.float = decimal ? Number.parseFloat(`${sign}0${decimal}`) : 0;
		} else {
			this.float = Number.parseFloat(text);
		}

		this.normalize();
	}

	toString(precision = 1n) {
		this.normalize();

		const fixed = toFixedPoint(this.float, precision);
		if (fixed === 0n) return String(this.bigint);
		if (this.bigint >= 0) return `${this.bigint}.${fixed}`;

		return `-${absBigInt(this.bigint + 1n)}.${toFixedPoint(
			1 - this.float,
			precision,
		)}`;
	}
}
