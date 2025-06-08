import { useTinyForm } from "@hiogawa/tiny-form/dist/react";
import { zip } from "@hiogawa/utils";
import { cls } from "../utils/ui";

// ported from https://github.com/hi-ogawa/ytsub-v3/blob/main/app/routes/typing/index.tsx

export function TypingPracticeViewRoot() {
	const text = new URL(window.location.href).searchParams.get("text") ?? "";
	return <TypingPracticeView test={text} />;
}

export function TypingPracticeView(props: { test: string }) {
	const form = useTinyForm({ test: props.test, answer: "" });
	const matches = zip([...form.data.test], [...form.data.answer]).map(
		([x, y]) => ({
			ok: x === y,
			x,
			y,
		}),
	);
	const ok = matches.every((m) => m.ok);
	const allOk = form.data.test === form.data.answer;

	return (
		<div className="w-full flex justify-center">
			<div className="w-full max-w-2xl flex flex-col">
				<div className="p-6 flex flex-col gap-3">
					<form
						className="w-full flex flex-col gap-5 text-lg"
						onSubmit={form.handleSubmit(() => {})}
					>
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 text-lg">Reference</div>
							<div className="flex flex-col relative">
								<textarea
									className={cls(
										"textarea w-full p-1 text-lg",
										allOk ? "border-green-600" : !ok && "border-red-600",
									)}
									value={form.fields.test.value}
									onChange={(e) => {
										const value = e.target.value;
										form.fields.test.onChange(value);
									}}
								/>
								<div
									className="absolute pointer-events-none absolute p-1 border border-transparent text-transparent"
									data-testid="typing-mismatch-overlay"
								>
									{matches.map((m, i) => (
										<span
											key={i}
											className={cls(
												!m.ok && "border-b-2 border-red-900 opacity-80",
											)}
										>
											{m.x}
										</span>
									))}
								</div>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 text-lg">
								Practice Input
							</div>
							<textarea
								className="textarea w-full p-1 text-lg"
								{...form.fields.answer.props()}
							/>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
