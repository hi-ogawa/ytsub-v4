import { useStore } from "@tanstack/react-store";
import { AsyncQueryStore } from "../../utils/storage";
import { cls } from "../../utils/ui";
import { createContentServiceClient } from "../content/rpc";

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const rpc = createContentServiceClient(tabId);

const pageStateStore = new AsyncQueryStore({
	get: () => rpc.getPageState(),
	initial: {
		ui: false,
		videoId: undefined,
	},
	interval: 200,
});

export function RootControl() {
	const pageState = useStore(pageStateStore);

	async function toggleUi() {
		await (pageState.ui ? rpc.hideUI() : rpc.showUI());
		await pageStateStore.refetch();
	}

	return (
		<button
			className={cls(
				`flex justify-center items-center cursor-pointer w-full h-full rounded-full border-0 hover:brightness-105 transition`,
				pageState.ui ? `bg-green-800/80` : `bg-green-500/90`,
			)}
			onClick={() => toggleUi()}
		>
			<span
				className={cls(
					"size-[20px] bg-white",
					pageState.ui ? "icon-[ri--close-line]" : "icon-[ri--translate-2]",
				)}
			></span>
		</button>
	);
}
