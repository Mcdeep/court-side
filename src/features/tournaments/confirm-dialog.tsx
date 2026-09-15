import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { useAsyncAction } from "#/hooks/use-async-action";

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { working, error, run } = useAsyncAction();
  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display font-bold text-[20px] tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={working}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            // Keep the dialog open until onConfirm closes it, so failures stay visible.
            onClick={(e) => {
              e.preventDefault();
              run(onConfirm);
            }}
            variant={danger ? "ghost" : "primary"}
            className={danger ? "!text-red-500 !ring-red-200 hover:!bg-red-50" : ""}
            disabled={working}
          >
            {working ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
