import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { browser } from "wxt/browser";
import { cls } from "../../ui";
import { parseVideoId } from "../../utils";
import { sendMessage } from "../content/rpc";

const queryClient = new QueryClient();

export function Root() {
	return (
		<QueryClientProvider client={queryClient}>
			<RootInner />
		</QueryClientProvider>
	);
}

function RootInner() {
	const query = useQuery({
		queryKey: ["currentTab"],
		queryFn: async () => {
			const tabs = await browser.tabs.query({
				active: true,
				currentWindow: true,
			});
			const tab = tabs[0];
			if (!tab?.id || !tab.url || !parseVideoId(tab.url)) {
				return undefined;
			}
			const state = await sendMessage("getState", undefined, { tabId: tab.id });
			return { id: tab.id, mounted: state.mounted };
		},
		refetchInterval: 500,
	});
	const state = query.data;

	return (
		<div className="p-2 w-[250px]">
			<button
				className={cls(`btn btn-sm w-full`, !state && "btn-disabled")}
				onClick={async () => {
					if (state) {
						if (state.mounted) {
							await sendMessage("hide", undefined, { tabId: state.id });
						} else {
							await sendMessage("show", undefined, { tabId: state.id });
						}
						query.refetch();
					}
				}}
			>
				{state?.mounted ? "Hide Caption" : "Show Caption"}
			</button>
			{!state && (
				<div role="alert" className="alert alert-error alert-soft text-sm mt-2">
					<span>This extension cannot be used on the current page.</span>
				</div>
			)}
		</div>
	);
}
