"use client"
import * as Dialog from '@radix-ui/react-dialog'

type ModalProps = {
  title?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Modal({ title, open, onOpenChange, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg focus:outline-none">
          {title && <Dialog.Title className="text-lg font-semibold text-slate-900 mb-2">{title}</Dialog.Title>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}