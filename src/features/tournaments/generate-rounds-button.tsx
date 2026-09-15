import type { ComponentProps } from "react";
import { Button } from "#/components/ui/button";
import { useAsyncAction } from "#/hooks/use-async-action";

export function GenerateRoundsButton({
  onGenerate,
  disabled,
  children,
  ...props
}: Pick<ComponentProps<typeof Button>, "children" | "className" | "size" | "icon" | "disabled"> & {
  onGenerate: () => Promise<void>;
}) {
  const { working, error, run } = useAsyncAction();
  return (
    <>
      <Button
        {...props}
        variant="primary"
        onClick={() => run(onGenerate)}
        disabled={disabled || working}
      >
        {working ? "Generating…" : children}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </>
  );
}
