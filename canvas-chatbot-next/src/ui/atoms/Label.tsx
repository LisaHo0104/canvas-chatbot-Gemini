import { LabelHTMLAttributes } from 'react'

type Props = LabelHTMLAttributes<HTMLLabelElement>

export function Label({ className, ...rest }: Props) {
  return <label className={`block text-sm font-medium text-slate-700 ${className || ''}`} {...rest} />
}