import React from "react";

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
