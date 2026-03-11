// Injecting time makes token expiry logic deterministic in tests.
export interface Clock {
	now(): number;
}

export class SystemClock implements Clock {
	public now(): number {
		return Date.now();
	}
}
