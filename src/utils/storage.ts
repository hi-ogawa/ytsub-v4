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
