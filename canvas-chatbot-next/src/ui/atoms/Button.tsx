"use client"
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cx, variants } from '../utils/variants'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'ghost' | 'link'
  color?: 'primary' | 'neutral' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-foreground] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

const config = {
  variant: {
    solid: 'bg-[--color-foreground] text-white hover:opacity-90',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-50',
    link: 'text-slate-700 underline underline-offset-4 hover:text-slate-900'
  },
  color: {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    neutral: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  },
  size: {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-6 text-base'
  }
} as const

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'solid', color = 'primary', size = 'md', fullWidth, leftIcon, rightIcon, className, children, ...rest },
  ref
) {
  const cls = variants(base, config as any, { variant, color, size })
  return (
    <button ref={ref} className={cx(cls, fullWidth && 'w-full', className)} {...rest}>
      {leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
    </button>
  )
})