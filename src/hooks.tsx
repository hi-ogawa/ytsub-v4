import React from "react";
import type { storage } from "wxt/utils/storage";

export function createUseStorage<T>(
	item: ReturnType<typeof storage.defineItem<T>>,
) {
	let snapshot = item.fallback;
	const listeners = new Set<() => void>();

	const store = {
		get: () => snapshot,
		set: (newValue: T) => {
			snapshot = newValue;
			store.notify();
			item.setValue(newValue); // hanging async
		},
		subscribe: (listener: () => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		notify: () => {
			for (const listener of listeners) {
				listener();
			}
		},
	};

	item.getValue().then((value) => {
		snapshot = value;
		store.notify();
	});

	item.watch((newValue) => {
		snapshot = newValue;
		store.notify();
	});

	return () => {
		const value = React.useSyncExternalStore(store.subscribe, store.get);
		return [value, store.set] as const;
	};
}
