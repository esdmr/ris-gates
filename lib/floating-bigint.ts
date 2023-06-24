export class FloatingBigInt {
	bigint = 0n;
	float = 0;

	normalize() {
		if (this.float < 0 || this.float >= 1) {
			this.bigint += BigInt(Math.trunc(this.float));
			this.float %= 1;

			if (this.float < 0) {
				this.bigint -= 1n;
				this.float += 1;
			}
		}
	}
}
