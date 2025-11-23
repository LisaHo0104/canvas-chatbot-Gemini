"use client"
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

type Item = { label: string; onSelect?: () => void }

type Props = {
  trigger: React.ReactNode
  items: Item[]
}

export function Dropdown({ trigger, items }: Props) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Content className="min-w-[12rem] rounded-md bg-white p-1 shadow-md border border-slate-200">
        {items.map((item) => (
          <DropdownMenu.Item
            key={item.label}
            onSelect={item.onSelect}
            className="px-3 py-2 text-sm text-slate-700 rounded hover:bg-slate-50 focus:outline-none"
          >
            {item.label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}