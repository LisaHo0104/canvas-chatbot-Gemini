'use client'

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'

interface QuizResultsRadialProps {
  correct: number
  total: number
  minimal?: boolean
}

export function QuizResultsRadial({ correct, total, minimal = false }: QuizResultsRadialProps) {
  const wrong = Math.max(0, total - correct)
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0
  console.log('[DEBUG] Rendering QuizResultsRadial', { correct, wrong, total, percent, minimal })

  const chartData = [{ correct, wrong }]

  const chartConfig: ChartConfig = {
    correct: { label: 'Correct', color: '#86efac' },
    wrong: { label: 'Wrong', color: '#fca5a5' },
  }

  const chart = (
    <ChartContainer config={chartConfig} className="mx-auto w-full">
      <ResponsiveContainer width="100%" height={320}>
        <RadialBarChart data={chartData} startAngle={0} endAngle={360} innerRadius={110} outerRadius={180}>
          <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[116, 104]} />
          <RadialBar dataKey="correct" stackId="a" fill="var(--color-correct)" cornerRadius={10} />
          <RadialBar dataKey="wrong" stackId="a" fill="var(--color-wrong)" cornerRadius={10} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                      {correct}/{total}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 34} className="fill-muted-foreground">
                      {percent}%
                    </tspan>
                    </text>
                  )
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )

  if (minimal) {
    return chart
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Quiz Performance</CardTitle>
        <CardDescription>Results overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {chart}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">Correct answers shown in light green; wrong in light red</div>
      </CardFooter>
    </Card>
  )
}

export default QuizResultsRadial
