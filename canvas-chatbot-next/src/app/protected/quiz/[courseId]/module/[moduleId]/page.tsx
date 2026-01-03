'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import QuizResultsRadial from '@/components/quiz/QuizResultsRadial'
import { ResultPage } from '@/components/quiz/ResultPage'
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = Number(params?.courseId)
  const moduleId = Number(params?.moduleId)
  const itemIdParam = searchParams.get('itemId')
  const itemId = itemIdParam ? Number(itemIdParam) : null
  const [questions, setQuestions] = useState<QnAItem[]>([])
  const [summary, setSummary] = useState<string>("")
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
  const [expandedResults, setExpandedResults] = useState<Record<number, boolean>>({})
  const [selections, setSelections] = useState<Record<number, number | undefined>>({})
  const rightColRef = useRef<HTMLDivElement | null>(null)
  const [sidebarHeight, setSidebarHeight] = useState<number | null>(null)

  function displayOption(opt: string): string {
    let s = String(opt || '')
    s = s.replace(/^\s*\(\s*[A-Za-z]\s*\)\s*/, '')
    s = s.replace(/^\s*[A-Za-z]\s*[\.\):]\s*/, '')
    s = s.replace(/^\s*\d+\s*[\.\):]\s*/, '')
    return s.trim()
  }
  function cleanExplanation(exp: string): string {
    let s = String(exp || '')
    s = s.replace(/https?:\/\/\S+/gi, '')
    s = s.replace(/(?:^|\s)(Source(?:s)?\s*Title?\s*:\s*.+?)$/gi, '')
    s = s.replace(/(?:^|\s)(Source(?:s)?\s*:\s*.+?)$/gi, '')
    s = s.replace(/\s{2,}/g, ' ')
    return s.trim()
  }
  function extractTopic(stem: string): string {
    let s = String(stem || '').trim()
    s = s.replace(/\s*\?.*$/, '')
    s = s.replace(/^(what|which|how|why|when|where|according to|does|is|are|can)\b[\s,:-]*/i, '')
    s = s.replace(/\s{2,}/g, ' ')
    s = s.trim()
    if (!s) return 'Key concept review'
    return s
  }
  function firstSentence(s: string): string {
    const t = String(s || '').trim()
    if (!t) return ''
    const parts = t.split(/(?<=\.)\s+/)
    const head = parts[0] || t
    return head.trim()
  }
  function buildReviewBullet(q: QnAItem): string {
    const exp = firstSentence(cleanExplanation(q.explanation || ''))
    if (exp) return exp
    const stem = extractTopic(q.question || '')
    return stem
  }

  const loadQnA = async () => {
    try {
      setLoading(true)
      setError(null)
      console.debug('[DEBUG] Fetching QnA (server API)', { courseId, moduleId, itemId })
      const qs = new URLSearchParams()
      qs.set('courseId', String(courseId))
      qs.set('moduleId', String(moduleId))
      qs.set('count', '20')
      if (itemId) qs.set('itemId', String(itemId))
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
      const sum = typeof j?.summary === 'string' ? j.summary : ''
      setSummary(sum)
      console.debug('[DEBUG] QnA summary loaded', { hasSummary: !!sum, length: sum?.length || 0 })
      setCurrent(0)
      setAnswers([])
      setTotalCorrect(0)
      setShowResults(false)
      setExpandedResults({})
      setSelections({})
      setSidebarHeight(null)
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        console.debug('[DEBUG] QnA generation aborted')
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
    const key = `${courseId}:${moduleId}:${itemId || 'module'}`
    if ((window as any).__qna_loaded_key !== key) {
      (window as any).__qna_loaded_key = key
      loadQnA()
    } else {
      console.debug('[DEBUG] Skip duplicate loadQnA due to dev double render')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, moduleId])

  const onCheck = () => {
    if (selected == null) return
    const q = questions[current]
    const correct = selected === q.correctIndex
    console.debug('[DEBUG] Answer checked', { current, isCorrect: correct, selected, correctIndex: q.correctIndex })
    setIsCorrect(correct)
    setChecked(true)
    setAnswers(prev => {
      const next = [...prev]
      if (typeof next[current] === 'undefined') {
        next[current] = correct
        setTotalCorrect(tc => tc + (correct ? 1 : 0))
        setSelections(s => ({ ...s, [current]: selected }))
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

  const completedCount = answers.reduce((acc, v) => acc + (typeof v !== 'undefined' ? 1 : 0), 0)
  useEffect(() => {
    const measure = () => {
      if (rightColRef.current) {
        setSidebarHeight(rightColRef.current.clientHeight)
      }
    }
    setTimeout(measure, 0)
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [showResults, questions, answers, expandedResults])

  return (
    <div className="min-h-[calc(100vh-3rem)] w-full px-4 py-4">
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Week Q&A</h1>
          <p className="text-sm text-muted-foreground">Course ID: {courseId} · Module ID: {moduleId}</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">Pages processed: {pageCount}</Badge>
            {questions.length > 0 && (
              <Badge variant="secondary">Questions generated: {questions.length}</Badge>
            )}
            {questions.length > 0 && (
              <Badge variant="secondary">Completed: {completedCount}/{questions.length}</Badge>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="mr-2" />
            <span className="text-sm text-muted-foreground">
              {itemId ? 'Generating questions for selected item…' : 'Generating questions for module…'}
            </span>
          </div>
        )}

        {!loading && error && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia />
              <EmptyTitle>Failed to load Q&A</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => loadQnA()}>Retry</Button>
              {typeof error === 'string' && (error.includes('Canvas') || error.includes('log in')) && (
                <Button variant="outline" onClick={() => { console.debug('[DEBUG] Navigate to settings from quiz error'); router.push('/protected/settings') }}>
                  Open Settings
                </Button>
              )}
            </EmptyContent>
          </Empty>
        )}

        {!loading && !error && !showResults && questions.length > 0 && (
          <div className="relative">
            <Carousel setApi={setCarouselApi}>
              <CarouselContent>
                {questions.map((q, qIdx) => (
                  <CarouselItem key={qIdx} className="px-3 sm:px-4 py-2">
                    <Card className="bg-background box-border w-full max-w-full mx-2">
                      <CardContent className="p-4 space-y-4">
                        <div className="text-base font-medium">{q.question}</div>
                        <div className="grid grid-cols-1 gap-2">
                          {q.options.map((opt, idx) => {
                            const isSelectedOption = selected === idx && qIdx === current
                            const isCorrectOption = checked && qIdx === current && idx === q.correctIndex
                            let cls = "w-full text-left p-3 rounded-md border bg-background hover:bg-muted/40 transition-colors box-border"
                            if (checked && qIdx === current) {
                              if (isCorrectOption) {
                                cls += " bg-green-50 border-green-600"
                              } else if (isSelectedOption) {
                                cls += " bg-red-50 border-red-600"
                              } else {
                                cls += " bg-muted/50"
                              }
                            } else if (isSelectedOption) {
                              cls += " ring-2 ring-primary/40 border-primary bg-primary/5"
                            }
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => { if (qIdx === current) { console.debug('[DEBUG] Option selected', { questionIndex: current, optionIndex: idx }); setSelected(idx) } }}
                                className={cls}
                                aria-selected={isSelectedOption && qIdx === current ? true : undefined}
                              >
                                <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + idx)}.</span>
                                <span>{displayOption(opt)}</span>
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
                          <div className="mt-3 space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">{isCorrect ? 'Correct' : 'Correct answer'}:</span>{' '}
                              <span className="font-mono text-xs mr-1">{String.fromCharCode(65 + q.correctIndex)}.</span>
                              <span>{displayOption(q.options[q.correctIndex])}</span>
                            </div>
                            {q.explanation && (
                              <div className="text-sm">
                                <span className="font-medium">Explanation:</span>{' '}
                                <span>{cleanExplanation(q.explanation)}</span>
                              </div>
                            )}
                            {(q.sourceUrl || q.sourceTitle) && (
                              <div className="text-sm">
                                <span className="font-medium">Source:</span>{' '}
                                {q.sourceUrl ? (
                                  <a
                                    href={q.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                  >
                                    {q.sourceTitle || q.sourceUrl}
                                  </a>
                                ) : (
                                  <span>{q.sourceTitle}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
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
        )}

        {!loading && !error && showResults && (
          (() => {
            const donut = <div className="w-full h-full"><QuizResultsRadial correct={totalCorrect} total={questions.length} variant="inline" /></div>
            const mapped = questions.map((q, i) => {
              const selectedIdx = selections[i]
              const userAnswer = typeof selectedIdx === 'number' ? displayOption(q.options[selectedIdx]) : undefined
              return {
                id: String(i + 1),
                question: q.question,
                isCorrect: answers[i] === true,
                explanation: cleanExplanation(q.explanation || ''),
                userAnswer,
                correctAnswer: displayOption(q.options[q.correctIndex]),
                topic: q.section || extractTopic(q.question),
              }
            })
            const onFocusedPractice = () => {
              const sectionMap: Record<string, { total: number; correct: number }> = {}
              questions.forEach((q, i) => {
                const sec = q.section || 'General'
                const ok = answers[i] === true
                const cur = sectionMap[sec] || { total: 0, correct: 0 }
                sectionMap[sec] = { total: cur.total + 1, correct: cur.correct + (ok ? 1 : 0) }
              })
              const weak = Object.entries(sectionMap)
                .map(([name, st]) => ({ name, acc: st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0 }))
                .filter(s => s.acc < 60)
                .sort((a, b) => a.acc - b.acc)
                .map(s => s.name)
                .slice(0, 3)
              const qs = new URLSearchParams()
              qs.set('focus', weak.join(','))
              router.push(`/protected/quiz/${courseId}/module/${moduleId}/practice?${qs.toString()}`)
            }
            const onRedo = () => {
              setShowResults(false)
              setAnswers([])
              setTotalCorrect(0)
              setCurrent(0)
              setSelected(null)
              setChecked(false)
              setIsCorrect(null)
            }
            const onGenerate = () => {
              loadQnA()
            }
            return (
              <ResultPage
                score={totalCorrect}
                total={questions.length}
                questions={mapped}
                donut={donut}
                onFocusedPractice={onFocusedPractice}
                onRedo={onRedo}
                onGenerate={onGenerate}
              />
            )
          })()
        )}
      </div>
    </div>
  )
}
