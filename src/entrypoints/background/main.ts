import type { ContentService } from "../content/main";
import { onMessage } from "./rpc";

// TODO: watching session storage is enough?
type ContentState = ReturnType<ContentService["getContentState"]>;

export class BackgroundService {
	states: Record<number, ContentState> = {};

	getState(tabId: number): ContentState | undefined {
		return this.states[tabId];
	}

	setState(tabId: number, state: ContentState) {
		this.states[tabId] = state;
	}
}

export async function main() {
	onMessage("initContent", async (e) => {
		return {
			tabId: e.sender.tab!.id!,
		};
	});
}
