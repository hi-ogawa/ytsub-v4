import "../../styles.css";
import ReactDomClient from "react-dom/client";
import type { ContentService } from "./main";

export function mount(container: HTMLElement, service: ContentService) {
	ReactDomClient.createRoot(container).render(<Root service={service} />);
}

function Root(props: { service: ContentService }) {
	return (
		<button
			className={`h-[42px] min-w-[42px] group rounded-2xl bg-green-500 hover:brightness-105 cursor-pointer text-white flex justify-center items-center p-1.5`}
			onClick={() => {
				props.service.showUI();
			}}
		>
			<span className="icon-[ri--translate-2] size-[25px] bg-white"></span>
			<span className="text-[16px] font-bold overflow-hidden opacity-0 text-nowrap w-0 group-hover:w-[200px] group-hover:opacity-100 transition-all duration-500 ease-in-out">
				Show transcript
			</span>
		</button>
	);
}
