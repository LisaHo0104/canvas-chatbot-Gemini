'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TableData } from '@/lib/note-content-parser'

interface NoteTableProps {
  data: TableData
}

export function NoteTable({ data }: NoteTableProps) {
  return (
    <Card className="my-4">
      {data.title && (
        <CardHeader>
          <CardTitle className="text-base">{data.title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted">
                {data.headers.map((header, index) => (
                  <th
                    key={index}
                    className="border border-border px-4 py-2 text-left font-semibold text-sm"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 0 ? 'bg-card' : 'bg-muted/30'}
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border border-border px-4 py-2 text-sm"
                    >
                      {cell}
                    </td>
                  ))}
                  {/* Fill empty cells if row is shorter than headers */}
                  {Array.from({ length: Math.max(0, data.headers.length - row.length) }).map((_, index) => (
                    <td
                      key={`empty-${index}`}
                      className="border border-border px-4 py-2 text-sm"
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
