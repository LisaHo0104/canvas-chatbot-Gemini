'use client'

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SummaryUI, type SummaryNote } from '../../summary/summary-ui'

describe('SummaryUI', () => {
  const base: SummaryNote = {
    title: 'Test Module',
    meta: { estimatedTime: '45–60 min', difficulty: 'Intro' },
    sections: [],
    checklist: [],
    resources: [],
  }

  it('renders header and tabs', () => {
    render(<SummaryUI data={base} />)
    expect(screen.getByText('Test Module')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Checklist')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  })

  it('shows derived key concepts when none provided', () => {
    const withSections: SummaryNote = {
      ...base,
      sections: [{ title: 'Core Ideas', bullets: ['Concept A', 'Concept B'] }],
    }
    render(<SummaryUI data={withSections} />)
    expect(screen.getByText(/Core Ideas/i)).toBeInTheDocument()
  })

  it('shows empty states for resources and content', () => {
    render(<SummaryUI data={base} />)
    // Resources tab contains helper when empty
    expect(screen.getByText(/No resources added/i)).toBeInTheDocument()
    // Content tab helper when no sections
    expect(screen.getByText(/No content sections/i)).toBeInTheDocument()
  })
})
