import { createContentServiceClient } from "../content/rpc";

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const rpc = createContentServiceClient(tabId);

export function RootControl() {
	return (
		<button
			className={`btn btn-sm w-full h-full rounded-full border-0 bg-green-500 hover:brightness-105`}
			onClick={() => rpc.showUI()}
		>
			<span className="icon-[ri--translate-2] size-[25px] bg-white"></span>
		</button>
	);
}
