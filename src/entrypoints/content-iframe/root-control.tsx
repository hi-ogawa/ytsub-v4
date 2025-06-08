import { createContentServiceClient } from "../content/rpc";

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const rpc = createContentServiceClient(tabId);

export function RootControl() {
	return (
		<button
			className={`flex justify-center items-center cursor-pointer w-full h-full rounded-full border-0 bg-green-500/90 hover:brightness-105 transition`}
			onClick={() => rpc.showUI()}
		>
			<span className="icon-[ri--translate-2] size-[25px] bg-white"></span>
		</button>
	);
}
