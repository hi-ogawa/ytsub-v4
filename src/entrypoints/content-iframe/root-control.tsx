import { useStore } from "@tanstack/react-store";
import { AsyncQueryStore } from "../../utils/storage";
import { cls } from "../../utils/ui";
import { createContentServiceClient } from "../content/rpc";

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const rpc = createContentServiceClient(tabId);

const uiStore = new AsyncQueryStore({
	initial: false,
	get: async () => {
		const state = await rpc.getPageState();
		return state.ui;
	},
	async set(v) {
		await (v ? rpc.showUI() : rpc.hideUI());
	},
	interval: 200,
});

export function RootControl() {
	const uiOpen = useStore(uiStore);
	return (
		<button
			className={cls(
				`flex justify-center items-center cursor-pointer w-full h-full rounded-full border-0 hover:brightness-105 transition`,
				uiOpen ? `bg-green-800/80` : `bg-green-500/90`,
			)}
			onClick={async () => {
				await uiStore.mutate(!uiOpen);
			}}
		>
			<span className="icon-[ri--translate-2] size-[20px] bg-white"></span>
		</button>
	);
}
