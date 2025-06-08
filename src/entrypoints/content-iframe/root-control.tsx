import { useStore } from "@tanstack/react-store";
import { AsyncQueryStore } from "../../utils/storage";
import { cls } from "../../utils/ui";
import { createContentServiceClient } from "../content/rpc";

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const rpc = createContentServiceClient(tabId);

const store = new AsyncQueryStore({
	initial: false,
	get: async () => {
		const state = await rpc.getPageState();
		return state.ui;
	},
	interval: 200,
});

export function RootControl() {
	const uiOpen = useStore(store);
	return (
		<button
			className={cls(
				`flex justify-center items-center cursor-pointer w-full h-full rounded-full border-0 hover:brightness-105 transition`,
				uiOpen ? `bg-green-800/80` : `bg-green-500/90`,
			)}
			onClick={async () => {
				if (uiOpen) {
					await rpc.hideUI();
				} else {
					await rpc.showUI();
				}
				store.refetch();
			}}
		>
			<span className="icon-[ri--translate-2] size-[20px] bg-white"></span>
		</button>
	);
}
