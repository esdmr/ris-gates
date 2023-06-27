export function mapGet<K, T>(map: Map<K, T>, key: K, ctor: (key: K) => T) {
	let value = map.get(key);

	if (value === undefined) {
		value = ctor(key);
		map.set(key, value);
	}

	return value;
}

export function setToggle<T>(set: Set<T>, value: T, force: boolean) {
	if (force) {
		set.add(value);
	} else {
		set.delete(value);
	}
}
