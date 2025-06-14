import { type AnyUpdater, Store } from "@tanstack/react-store";
import type { WxtStorageItem } from "wxt/utils/storage";

export class WxtStorageStore<
	TState,
	TUpdater extends AnyUpdater = (cb: TState) => TState,
> extends Store<TState, TUpdater> {
	constructor(item: WxtStorageItem<TState, {}>) {
		super(item.fallback, {
			onUpdate: () => {
				item.setValue(this.state);
			},
		});
		item.getValue().then((value) => {
			this.setState(value);
		});
		item.watch((newValue) => {
			this.setState(newValue);
		});
	}
}

export class AsyncQueryStore<
	T,
	TUpdater extends AnyUpdater = (cb: T) => T,
> extends Store<T, TUpdater> {
	constructor(
		private asyncOptions: {
			initial: T;
			get: () => Promise<T>;
			set?: (newValue: T) => void | Promise<void>;
			interval: number;
		},
	) {
		super(asyncOptions.initial);
		setTimeout(() => this.refetch());
		setInterval(() => this.refetch(), this.asyncOptions.interval);
	}

	async refetch() {
		const value = await this.asyncOptions.get();
		this.setState(value);
	}
}
