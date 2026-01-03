'use client'

import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer } from '@/components/ui/chart'

interface QuizResultsRadialProps {
  correct: number
  total: number
  variant?: 'card' | 'inline'
}

export function QuizResultsRadial({ correct, total, variant = 'card' }: QuizResultsRadialProps) {
  const wrong = Math.max(0, total - correct)
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0
  console.log('[DEBUG] Rendering QuizResultsRadial', { correct, wrong, total, percent })

  const chartData = [{ correct, wrong }]

  const chartConfig: ChartConfig = {
    correct: { label: 'Correct', color: '#86efac' },
    wrong: { label: 'Wrong', color: '#fca5a5' },
  }

  if (variant === 'inline') {
    return (
      <ChartContainer config={chartConfig} className="relative mx-auto w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart data={chartData} startAngle={0} endAngle={360} innerRadius="60%" outerRadius="90%">
            <RadialBar dataKey="correct" stackId="a" fill="var(--color-correct)" cornerRadius={10} />
            <RadialBar dataKey="wrong" stackId="a" fill="var(--color-wrong)" cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-base font-semibold">
                          {correct}/{total}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
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
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Quiz Performance</CardTitle>
        <CardDescription>Results overview</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
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
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="text-muted-foreground leading-none">Correct answers shown in light green; wrong in light red</div>
      </CardFooter>
    </Card>
  )
}

export default QuizResultsRadial
