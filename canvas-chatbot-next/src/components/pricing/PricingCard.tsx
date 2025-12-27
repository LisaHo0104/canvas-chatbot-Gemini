'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PricingCardProps {
    plan: {
        id: string
        name: string
        description: string
        price: number
        features: string[]
        popular?: boolean
    }
    isLoading?: boolean
    onSelect: (planId: string) => void
    isSelected?: boolean
}

export function PricingCard({ plan, isLoading, onSelect, isSelected }: PricingCardProps) {
    return (
        <Card className={cn(
            'relative flex flex-col h-full transition-all duration-200 bg-background shadow-xs',
            isSelected && 'border-blue-500 ring-2 ring-blue-500'
        )}>

            <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-base mt-2">{plan.description}</CardDescription>
                <div className="mt-6">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-500 ml-1">/month</span>
                </div>
            </CardHeader>

            <CardContent className="flex-grow">
                <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            {plan.id !== 'free' && (
                <CardFooter className="pt-6">
                    <Button
                        onClick={() => onSelect(plan.id)}
                        disabled={isLoading}
                        className={cn('w-full')}
                        size="lg"
                    >
                        {isLoading ? 'Loading...' : 'Get Started'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}
