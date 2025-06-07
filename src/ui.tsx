export function SelectWrapper<T>({
	value,
	options,
	onChange,
	// convenient default when `T extends string`
	labelFn = String,
	keyFn = (value) => JSON.stringify({ value }), // wrap it so that `undefined` becomes `{}`
	...selectProps
}: {
	value: T;
	options: readonly T[];
	onChange: (value: T) => void;
	labelFn?: (value: T) => React.ReactNode;
	keyFn?: (value: T) => React.Key;
} & Omit<React.JSX.IntrinsicElements["select"], "value" | "onChange">) {
	return (
		<select
			value={options.indexOf(value)}
			onChange={(e) => onChange(options[Number(e.target.value)]!)}
			{...selectProps}
		>
			{options.map((option, i) => (
				<option key={keyFn(option)} value={i}>
					{labelFn(option)}
				</option>
			))}
		</select>
	);
}

export const cls = (...classes: (string | undefined | boolean)[]) =>
	classes.filter(Boolean).join(" ");
