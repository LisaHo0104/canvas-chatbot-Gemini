'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import Breadcrumbs from '@/components/Breadcrumbs'
import { StudyRoadmapProgress } from '@/components/StudyRoadmapProgress'

interface FormData {
  studyGoals: string
  hoursPerWeek: string
  preferredSchedule: string
  learningStyle: string
  priorityAreas: string
  deadlineInfo: string
  additionalNotes: string
}

export default function StudyRoadmapQuestionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    studyGoals: '',
    hoursPerWeek: '',
    preferredSchedule: '',
    learningStyle: '',
    priorityAreas: '',
    deadlineInfo: '',
    additionalNotes: '',
  })

  // Get selected items from query params
  const selectedItemsParam = searchParams.get('selectedItems')
  const courseId = searchParams.get('courseId')
  const courseName = searchParams.get('courseName')

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null) // Clear previous errors

    try {
      // Use mock data for testing - navigate directly to timeline
      // This bypasses all validation and API calls
      const mockPlanId = 'mock-plan-' + Date.now()
      const selectedItems = selectedItemsParam ? JSON.parse(selectedItemsParam) : []
      
      // Store mock data in sessionStorage for the timeline page to use
      const mockStudyPlan = {
        id: mockPlanId,
        course_id: courseId ? Number(courseId) : 12345,
        course_name: courseName || 'Sample Course',
        generated_plan: {
          timeline: [
            {
              period: 'Week 1',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              events: [
                {
                  title: 'Study Module 1: Introduction',
                  type: 'study_session',
                  date: new Date().toISOString().split('T')[0],
                  duration: '2 hours',
                  description: 'Review introduction materials and complete readings',
                  isChecked: false,
                },
                {
                  title: 'Complete Assignment 1',
                  type: 'assignment',
                  date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  points: 100,
                  description: 'Complete and submit Assignment 1',
                  isChecked: false,
                },
              ],
            },
            {
              period: 'Week 2',
              startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              events: [
                {
                  title: 'Study Module 2: Core Concepts',
                  type: 'study_session',
                  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  duration: '3 hours',
                  description: 'Deep dive into core concepts and practice problems',
                  isChecked: false,
                },
                {
                  title: 'Quiz 1: Fundamentals',
                  type: 'quiz',
                  date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  description: 'Take Quiz 1 covering fundamentals',
                  isChecked: false,
                },
              ],
            },
            {
              period: 'Week 3',
              startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              events: [
                {
                  title: 'Study Module 3: Advanced Topics',
                  type: 'study_session',
                  date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  duration: '4 hours',
                  description: 'Explore advanced topics and complete practice exercises',
                  isChecked: false,
                },
                {
                  title: 'Midterm Exam',
                  type: 'exam',
                  date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  description: 'Prepare for and take midterm exam',
                  isChecked: false,
                },
              ],
            },
          ],
          summary: {
            totalWeeks: 3,
            totalStudyHours: 9,
            totalAssignments: 2,
            keyMilestones: ['Midterm Exam', 'Final Project'],
          },
        },
        progress: {
          completedEvents: [],
        },
      }
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mockStudyPlan', JSON.stringify(mockStudyPlan))
      }
      
      // Navigate to timeline with mock plan ID
      router.push(`/protected/study-roadmap/timeline?planId=${mockPlanId}&mock=true`)
      
      // Uncomment below to use real API instead of mock data:
      /*
      if (selectedItems.length === 0) {
        setError('Please select at least one module item to include in your study plan.')
        setIsSubmitting(false)
        return
      }

      // Call the study plan generation API
      const response = await fetch('/api/study-plan/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          courseId: Number(courseId),
          courseName,
          selectedItems,
          studyPreferences: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        const errorMessage = errorData.error || errorData.details || `Failed to generate study plan (${response.status})`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      
      if (!data.success || !data.studyPlanId) {
        throw new Error('Invalid response from server')
      }
      
      // Navigate to the timeline page with the generated plan ID
      router.push(`/protected/study-roadmap/timeline?planId=${data.studyPlanId}`)
      */
    } catch (error) {
      console.error('Error submitting form:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate study plan. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <Breadcrumbs />
        <StudyRoadmapProgress currentStep="questions" />
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mb-2">Study Plan Questions</h1>
          <p className="text-muted-foreground">
            Answer the following questions for a better roadmap
          </p>
          {courseName && (
            <p className="text-sm text-muted-foreground mt-2">
              Course: <span className="font-medium">{courseName}</span>
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Study Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What are your study goals?</CardTitle>
                <CardDescription>
                  What do you want to achieve with this study plan?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Master the core concepts, prepare for final exam, improve my grade to an A..."
                  value={formData.studyGoals}
                  onChange={(e) => handleInputChange('studyGoals', e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Hours Per Week */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How many hours per week can you dedicate to studying?</CardTitle>
                <CardDescription>
                  Be realistic about your available time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.hoursPerWeek}
                  onValueChange={(value) => handleInputChange('hoursPerWeek', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select hours per week" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5 hours</SelectItem>
                    <SelectItem value="6-10">6-10 hours</SelectItem>
                    <SelectItem value="11-15">11-15 hours</SelectItem>
                    <SelectItem value="16-20">16-20 hours</SelectItem>
                    <SelectItem value="21-25">21-25 hours</SelectItem>
                    <SelectItem value="26+">26+ hours</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Preferred Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What is your preferred study schedule?</CardTitle>
                <CardDescription>
                  When do you prefer to study?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.preferredSchedule}
                  onValueChange={(value) => handleInputChange('preferredSchedule', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preferred schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (6am - 12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm - 6pm)</SelectItem>
                    <SelectItem value="evening">Evening (6pm - 12am)</SelectItem>
                    <SelectItem value="night">Night (12am - 6am)</SelectItem>
                    <SelectItem value="flexible">Flexible - any time</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Learning Style */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What is your preferred learning style?</CardTitle>
                <CardDescription>
                  How do you learn best?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.learningStyle}
                  onValueChange={(value) => handleInputChange('learningStyle', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select learning style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual - I learn by seeing (diagrams, charts, videos)</SelectItem>
                    <SelectItem value="auditory">Auditory - I learn by hearing (lectures, discussions)</SelectItem>
                    <SelectItem value="reading">Reading/Writing - I learn by reading and taking notes</SelectItem>
                    <SelectItem value="kinesthetic">Kinesthetic - I learn by doing (hands-on practice)</SelectItem>
                    <SelectItem value="mixed">Mixed - Combination of styles</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Priority Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What are your priority areas or topics?</CardTitle>
                <CardDescription>
                  Which topics or modules do you want to focus on most?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Focus on modules 3-5, prioritize assignments over readings, need extra help with statistics..."
                  value={formData.priorityAreas}
                  onChange={(e) => handleInputChange('priorityAreas', e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Deadline Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Any important deadlines or exam dates?</CardTitle>
                <CardDescription>
                  Share any upcoming deadlines, exams, or important dates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., Final exam on Dec 15, Assignment 3 due Nov 30, Midterm on Nov 20..."
                  value={formData.deadlineInfo}
                  onChange={(e) => handleInputChange('deadlineInfo', e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Notes (Optional)</CardTitle>
                <CardDescription>
                  Any other information that would help create a better study plan?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., I work part-time on weekends, prefer shorter study sessions, need breaks every hour..."
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Study Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
