'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import QuizResultsRadial from '@/components/quiz/QuizResultsRadial'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface QnAItem {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  sourceUrl?: string
  sourceTitle?: string
  section?: string
}

export default function QuizModuleQnAPage() {
  const params = useParams<{ courseId: string; moduleId: string }>()
  const courseId = Number(params?.courseId)
  const moduleId = Number(params?.moduleId)
  const [questions, setQuestions] = useState<QnAItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState<number>(0)
  const [current, setCurrent] = useState<number>(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [checked, setChecked] = useState<boolean>(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [totalCorrect, setTotalCorrect] = useState<number>(0)
  const [showResults, setShowResults] = useState<boolean>(false)
  const abortRef = useRef<AbortController | null>(null)
  const [carouselApi, setCarouselApi] = useState<CarouselApi | undefined>()

  const loadQnA = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[DEBUG] Fetching QnA (server API)', { courseId, moduleId })
      const qs = new URLSearchParams()
      qs.set('courseId', String(courseId))
      qs.set('moduleId', String(moduleId))
      qs.set('count', '20')
      abortRef.current = new AbortController()
      const res = await fetch(`/api/quiz/module-questions?${qs.toString()}`, { credentials: 'include', signal: abortRef.current.signal })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j?.error || `Failed to load QnA (${res.status})`)
        setQuestions([])
        return
      }
      const j = await res.json()
      const arr: QnAItem[] = Array.isArray(j?.questions) ? j.questions : []
      setQuestions(arr)
      setPageCount(Array.isArray(j?.pages) ? j.pages.length : 0)
      setCurrent(0)
      setSelected(null)
      setChecked(false)
      setIsCorrect(null)
      setAnswers([])
      setTotalCorrect(0)
      setShowResults(false)
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        console.log('[DEBUG] QnA generation aborted')
        setError('')
      } else {
        console.error('Failed to load QnA', e)
        setError('Failed to load QnA')
      }
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!courseId || Number.isNaN(courseId) || !moduleId || Number.isNaN(moduleId)) {
      setError('Invalid module')
      setLoading(false)
      return
    }
    loadQnA()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moduleId])

  const onCheck = () => {
    if (selected == null) return
    const q = questions[current]
    const correct = selected === q.correctIndex
    setIsCorrect(correct)
    setChecked(true)
    setAnswers(prev => {
      const next = [...prev]
      if (typeof next[current] === 'undefined') {
        next[current] = correct
        setTotalCorrect(tc => tc + (correct ? 1 : 0))
      }
      return next
    })
    if (current === questions.length - 1) {
      console.log('[DEBUG] Quiz finished', { totalCorrect: correct ? totalCorrect + 1 : totalCorrect, total: questions.length })
      setShowResults(true)
    }
  }

  const onNext = () => {
    const next = current + 1
    if (next < questions.length) {
      setCurrent(next)
      try { carouselApi?.scrollTo(next) } catch {}
      setSelected(null)
      setChecked(false)
      setIsCorrect(null)
    }
  }

  const onPrev = () => {
    const prev = current - 1
    if (prev >= 0) {
      setCurrent(prev)
      try { carouselApi?.scrollTo(prev) } catch {}
      setSelected(null)
      setChecked(false)
      setIsCorrect(null)
    }
  }

  useEffect(() => {
    if (!carouselApi) return
    try {
      const snaps = carouselApi.scrollSnapList().length
      const selected = carouselApi.selectedScrollSnap()
      setCurrent(selected)
      carouselApi.on('select', () => {
        const idx = carouselApi.selectedScrollSnap()
        setCurrent(idx)
        setSelected(null)
        setChecked(false)
        setIsCorrect(null)
      })
    } catch {}
  }, [carouselApi])

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-4">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Week Q&A</h1>
          <p className="text-sm text-muted-foreground">Course ID: {courseId} · Module ID: {moduleId}</p>
          <div className="mt-1"><Badge variant="secondary">Pages processed: {pageCount}</Badge></div>
        </div>

        {loading ? (
          <div className="w-full">
            <Empty className="w-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Spinner className="size-6" />
                </EmptyMedia>
                <EmptyTitle>Preparing your quiz</EmptyTitle>
                <EmptyDescription>
                  Please wait while we generate your quiz. Do not refresh the page.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => { try { abortRef.current?.abort() } catch {}; setLoading(false) }}>Cancel</Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : questions.length === 0 ? (
          <div className="text-sm text-muted-foreground italic">No questions generated.</div>
        ) : !showResults ? (
          <div className="w-full max-w-5xl">
            <Carousel className="w-full" setApi={setCarouselApi}>
              <CarouselContent className="-ml-4">
                {questions.map((q, qIdx) => (
                  <CarouselItem className="pl-4" key={qIdx}>
                    <div className="p-1">
                      <Card className="bg-background w-full overflow-hidden">
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">Question {qIdx + 1} of {questions.length}</div>
                            <Badge variant="secondary">Pages processed: {pageCount}</Badge>
                          </div>
                          {q.section ? (
                            <div className="text-xs font-medium text-muted-foreground">{q.section}</div>
                          ) : null}
                          <h3 className="text-lg font-semibold leading-tight">{q.question}</h3>
                          <div className="space-y-2">
                            {q.options.map((opt, idx) => {
                              const isSelectedOption = (qIdx === current) && selected === idx
                              const isCorrectOption = idx === q.correctIndex
                              let cls = "w-full text-left rounded-md border px-4 py-3 transition-colors "
                              if (qIdx !== current) {
                                cls += "opacity-60 pointer-events-none"
                              } else if (!checked) {
                                cls += isSelectedOption ? "bg-accent text-accent-foreground border-2" : "hover:bg-muted"
                              } else {
                                if (isCorrectOption) {
                                  cls += "bg-green-100 text-green-800 border-green-600"
                                } else {
                                  cls += "bg-red-100 text-red-700 border-red-600"
                                }
                                if (isSelectedOption) {
                                  cls += " border-2"
                                }
                              }
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => { if (qIdx === current) setSelected(idx) }}
                                  className={cls}
                                >
                                  <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>
                                  <span>{opt}</span>
                                </button>
                              )
                            })}
                          </div>
                          {qIdx === current && (
                            <div className="flex flex-wrap items-center gap-3 pt-3">
                              <Button size="lg" onClick={onCheck} disabled={selected == null || checked}>
                                Check answer
                              </Button>
                              <Separator className="mx-1 w-px h-6" />
                            </div>
                          )}
                          {qIdx === current && checked && (
                            <div className={"text-sm rounded-md border px-3 py-2 " + (isCorrect ? "border-green-600 text-green-700" : "border-red-600 text-red-700") }>
                              {isCorrect ? "Correct" : "Incorrect"}
                            </div>
                          )}
                          {qIdx === current && checked && selected != null && (
                            <div className="text-sm">
                              <span className="font-medium">Your answer:</span> {String.fromCharCode(65 + selected)}. {q.options[selected]}
                            </div>
                          )}
                          {qIdx === current && checked && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Explanation:</span> {q.explanation}
                              {q.sourceUrl ? (
                                <span> 
                                  <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                                    Read: {q.sourceTitle || 'Canvas Page'}
                                  </a>
                                </span>
                              ) : null}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => { e.preventDefault(); onPrev() }}
                className={(current === 0 ? 'opacity-50 ' : '') + 'absolute size-8 rounded-full top-1/2 -left-12 -translate-y-1/2'}
                aria-label="Previous"
                disabled={current === 0}
              >
                <ArrowLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => { e.preventDefault(); if (checked) onNext() }}
                className={(!checked || current >= questions.length - 1 ? 'opacity-50 ' : '') + 'absolute size-8 rounded-full top-1/2 -right-12 -translate-y-1/2'}
                aria-label="Next"
                disabled={!checked || current >= questions.length - 1}
              >
                <ArrowRight />
              </Button>
              <div className="sr-only">Question Carousel</div>
            </Carousel>
          </div>
        ) : (
          <div className="w-full max-w-5xl">
            <Card className="bg-background w-full overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">Quiz Results</h3>
                <QuizResultsRadial correct={totalCorrect} total={questions.length} />
                <div className="text-sm">You answered <span className="font-medium">{totalCorrect}</span> out of <span className="font-medium">{questions.length}</span> correctly.</div>
                <div className="flex items-center gap-3 pt-2">
                  <Button size="lg" onClick={() => { setShowResults(false); setAnswers([]); setTotalCorrect(0); setCurrent(0); setSelected(null); setChecked(false); setIsCorrect(null) }}>Redo this set</Button>
                  <Button size="lg" variant="outline" onClick={() => loadQnA()}>Generate new set</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
