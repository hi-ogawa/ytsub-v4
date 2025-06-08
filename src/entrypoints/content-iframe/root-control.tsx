import { createContentServiceClient } from "../content/rpc";

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const rpc = createContentServiceClient(tabId);

export function RootControl() {
	return (
		<div className="w-full h-full">
			<button
				className={`btn btn-sm w-full h-full rounded-xl border-1`}
				onClick={() => rpc.showUI()}
			>
				<span className="icon-[ri--translate-2] text-2xl bg-green-600"></span>
			</button>
		</div>
	);
}
