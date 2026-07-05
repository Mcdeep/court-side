import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '#/components/ui/dialog'

export function AppDialog({ open, onOpenChange, title, description, footer, maxWidth, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  footer?: ReactNode
  maxWidth?: string
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className={maxWidth ?? 'sm:max-w-[440px]'}>
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-[22px] tracking-tight">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer && <div className="flex gap-2 pt-1">{footer}</div>}
      </DialogContent>
    </Dialog>
  )
}
