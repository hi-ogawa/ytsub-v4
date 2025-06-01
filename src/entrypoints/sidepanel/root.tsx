import React from "react";

// TODO:
// - settings
//   - default language pair
// - storage
//   - cache last loaded subtitles
// - monitor active tab video
//   - refresh
//   - disable when not
// - fetch metadata
// - subtitles UI
// - abstract service interface (context/provider?)

export function Root() {
	return (
		<div>
			<h1>WXT + TypeScript</h1>
			<div className="card">
				<Counter />
			</div>
		</div>
	);
}

function Counter() {
	const [count, setCount] = React.useState(0);
	return (
		<button onClick={() => setCount((c) => c + 1)}>Count is {count}</button>
	);
}
