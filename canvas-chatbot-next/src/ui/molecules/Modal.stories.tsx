import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from '../atoms/Button'

const meta: Meta<typeof Modal> = {
  title: 'Molecules/Modal',
  component: Modal,
}
export default meta

type Story = StoryObj<typeof Modal>

export const Basic: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <div>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal title="Example Modal" open={open} onOpenChange={setOpen}>
          <p className="text-sm text-slate-700">Hello from the modal.</p>
        </Modal>
      </div>
    )
  }
}