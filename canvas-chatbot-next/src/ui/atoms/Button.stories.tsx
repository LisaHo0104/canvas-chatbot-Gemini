import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
}
export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { children: 'Primary', color: 'primary', variant: 'solid' }
}

export const Outline: Story = {
  args: { children: 'Outline', variant: 'outline' }
}

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}