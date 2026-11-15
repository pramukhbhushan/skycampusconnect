import { cx } from "@/components/ui";
import type { FormState } from "../actions";

/** Success or error line under a settings form. */
export function FormResult({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={cx("rounded-xl px-3.5 py-2.5 text-sm", state.ok ? "bg-ok-bg text-ok-text" : "bg-danger-bg text-danger-text")}>
      {state.ok ? state.message : state.error}
    </p>
  );
}
