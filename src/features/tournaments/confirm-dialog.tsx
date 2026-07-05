import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import { useAsyncAction } from '#/hooks/use-async-action'

export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; body: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  const { working, run } = useAsyncAction()
  return (
    <AlertDialog open onOpenChange={o => !o && onCancel()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display font-bold text-[20px] tracking-tight">{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={working}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => run(onConfirm)}
            variant={danger ? 'ghost' : 'primary'}
            className={danger ? '!text-red-500 !ring-red-200 hover:!bg-red-50' : ''}
            disabled={working}>
            {working ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
