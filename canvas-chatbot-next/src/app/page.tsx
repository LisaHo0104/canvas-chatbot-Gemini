'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '@/components/ai-elements/tool'
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning'
import { Message as AIMessage, MessageContent as AIMessageContent, MessageResponse } from '@/components/ai-elements/message'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { PromptInput, PromptInputProvider, PromptInputBody, PromptInputTextarea, PromptInputFooter, PromptInputTools, PromptInputButton, PromptInputSubmit } from '@/components/ai-elements/prompt-input'
import { SparklesIcon, GlobeIcon } from 'lucide-react'
import { UserCountBadge } from '@/components/UserCountBadge'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      if (data.user) {
        router.replace('/protected/chat')
      }
    })
    return () => { mounted = false }
  }, [router, supabase])
  return (
    <div className="min-h-screen bg-white">
      <main className="px-6">
        <section className="mx-auto max-w-6xl text-center py-16">
          <div className="mx-auto w-full max-w-md">
            <img src="/dog_logo.png" alt="Lulu illustration" className="w-full h-auto" />
          </div>
          <h1 className="mt-8 text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight">Smarter learning with Canvas integration</h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto leading-relaxed text-lg">Connect your Canvas to summarize courses, track deadlines, and surface announcements — all in one place.</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-8">
            <UserCountBadge variant="prominent" />
            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/sign-up"><Button size="lg" className="px-8 h-12 text-base font-semibold shadow-lg">Sign up and try it free</Button></Link>
              <Link href="/auth/login"><Button size="lg" variant="outline" className="px-8 h-12 text-base font-semibold">Log in</Button></Link>
            </div>
          </div>
        </section>



        <section className="mx-auto max-w-6xl pb-24">
          <h2 className="text-center text-2xl font-semibold text-slate-900">Study a course using our methodology</h2>
          <p className="mt-2 text-center text-slate-600">Scroll to reveal tools, thinking, and answers.</p>

          <ChatShowcase />
        </section>


      </main>


    </div>
  )
}

function ChatShowcase() {
  const [visible, setVisible] = useState([false, false, false, false, false])
  const refs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const idxAttr = (entry.target as HTMLElement).getAttribute('data-step-index')
        const idx = idxAttr ? parseInt(idxAttr, 10) : -1
        if (idx >= 0 && entry.isIntersecting) {
          setVisible((prev) => {
            const next = [...prev]
            next[idx] = true
            return next
          })
        }
      })
    }, { threshold: 0.25 })

    refs.current.forEach((el, i) => {
      if (el) {
        el.setAttribute('data-step-index', String(i))
        const already = el.getAttribute('data-observed')
        if (!already) {
          el.setAttribute('data-observed', 'true')
          observer.observe(el)
        }
      }
    })
    return () => observer.disconnect()
  }, [])

  const stepClass = (i: number) => `transition-all duration-700 ease-out ${visible[i] ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-4 blur-[1px]'} `

  return (
    <div className="mt-8 rounded-xl border border-slate-200 p-0">
      <Conversation className="relative size-full">
        <ConversationContent className="p-6">
          <div ref={(el) => { refs.current[0] = el }} className={stepClass(0)}>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start">
              <div className="min-w-0 space-y-3 md:order-1">
                <AIMessage from="user">
                  <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                    <MessageResponse>How should I study Module 2 this week?</MessageResponse>
                  </AIMessageContent>
                </AIMessage>
              </div>
              <div className="flex flex-col items-center md:order-2 md:items-start">
                <img src="/dog_chat.png" alt="Lulu student question" className="w-24 h-24 rounded" />
                <div className="mt-2 text-slate-900 font-medium">Student Question</div>
                <p className="mt-1 text-slate-600 text-sm text-center md:text-left">Ask specific, course-grounded questions for targeted guidance.</p>
                <p className="mt-1 text-slate-600 text-xs text-center md:text-left">Reference modules and mention upcoming deadlines.</p>
              </div>
            </div>
          </div>

          <div ref={(el) => { refs.current[1] = el }} className={stepClass(1)}>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start">
              <div className="min-w-0 md:order-1">
                <AIMessage from="assistant">
                  <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                    <Reasoning isStreaming={true} defaultOpen>
                      <ReasoningTrigger />
                      <ReasoningContent>
                        Goal: master Module 2 concepts and submit graded items on time.
                        Constraints: quiz Fri 5pm; mini-project Sun 8pm; regular classes Mon–Thu.
                        Inputs: Canvas modules, assignment requirements, and discussion prompts.
                        Plan: skim module overview, deep read core materials, practice with notebook,
                        contribute to discussion, run project draft, and leave buffer for review and quiz.
                      </ReasoningContent>
                    </Reasoning>
                  </AIMessageContent>
                </AIMessage>
              </div>
              <div className="flex flex-col items-center md:order-2 md:items-start">
                <img src="/dog_thinking.png" alt="Lulu thinking" className="w-24 h-24 rounded" />
                <div className="mt-2 text-slate-900 font-medium">Assistant Thinking</div>
                <p className="mt-1 text-slate-600 text-sm text-center md:text-left">Plans your study flow aligned to Canvas schedule and deadlines.</p>
                <p className="mt-1 text-slate-600 text-xs text-center md:text-left">Explains rationale to make steps transparent.</p>
              </div>
            </div>
          </div>

          <div ref={(el) => { refs.current[2] = el }} className={stepClass(2)}>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start">
              <div className="min-w-0 overflow-x-auto md:order-1">
                <AIMessage from="assistant">
                  <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                    <Tool defaultOpen>
                      <ToolHeader type="tool-canvas-fetch" state="output-available" />
                      <ToolContent>
                        <ToolInput input={{ action: 'fetch_course_context', course: 'Intro to Data Science', courseId: 'DS101', endpoints: ['modules', 'assignments', 'announcements'] }} />
                        <ToolOutput output={{
                          modules: [
                            { name: 'Module 2: Regression Basics', start: 'Mon', end: 'Fri' },
                            { name: 'Module 3: Classification', start: 'Next Mon', end: 'Next Fri' }
                          ],
                          assignments: [
                            { title: 'Module 2 Quiz', due: 'Fri 17:00', points: 10 },
                            { title: 'Mini-Project: Linear Regression', due: 'Sun 20:00', points: 30 }
                          ],
                          announcements: [
                            { title: 'Office hours update', posted: 'Tue 12:00' },
                            { title: 'Dataset correction', posted: 'Wed 09:30' }
                          ]
                        }} errorText={undefined} />
                      </ToolContent>
                    </Tool>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[720px] w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-600">
                            <th className="py-2 pr-4">Item</th>
                            <th className="py-2 pr-4">Details</th>
                            <th className="py-2 pr-4">Schedule</th>
                            <th className="py-2 pr-4">Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Module 2: Regression Basics</td>
                            <td className="py-2 pr-4 text-slate-700">Read, notebook exercises, discussion</td>
                            <td className="py-2 pr-4 text-slate-700">Mon–Thu</td>
                            <td className="py-2 pr-4 text-slate-700">Fri 17:00 (quiz)</td>
                          </tr>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Mini-Project: Linear Regression</td>
                            <td className="py-2 pr-4 text-slate-700">Data prep, model fit, brief report</td>
                            <td className="py-2 pr-4 text-slate-700">Fri–Sun</td>
                            <td className="py-2 pr-4 text-slate-700">Sun 20:00 (project)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </AIMessageContent>
                </AIMessage>
              </div>
              <div className="flex flex-col items-center md:order-2 md:items-start">
                <img src="/dog_laptop.png" alt="Lulu with laptop" className="w-24 h-24 rounded" />
                <div className="mt-2 text-slate-900 font-medium">Canvas Tools</div>
                <p className="mt-1 text-slate-600 text-sm text-center md:text-left">Fetch modules, assignments, and announcements to ground answers.</p>
                <p className="mt-1 text-slate-600 text-xs text-center md:text-left">Data tables present concise, actionable context.</p>
              </div>
            </div>
          </div>

          <div ref={(el) => { refs.current[3] = el }} className={stepClass(3)}>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start">
              <div className="min-w-0 md:order-1">
                <AIMessage from="assistant">
                  <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                    <Reasoning isStreaming={false} defaultOpen>
                      <ReasoningTrigger />
                      <ReasoningContent>
                        Allocate time around classes and due dates.
                        Reading early in the week reduces load before the quiz.
                        Practice notebook mid-week solidifies concepts before project work.
                        Keep buffers for unexpected issues and review.
                      </ReasoningContent>
                    </Reasoning>
                    <div className="mt-4">
                      <div className="text-slate-900 font-medium">Study distribution</div>
                      <div className="mt-2 flex items-end gap-2 h-24">
                        <div className="w-8 bg-slate-300" style={{ height: '65%' }} />
                        <div className="w-8 bg-slate-300" style={{ height: '75%' }} />
                        <div className="w-8 bg-slate-300" style={{ height: '85%' }} />
                        <div className="w-8 bg-slate-300" style={{ height: '55%' }} />
                        <div className="w-8 bg-slate-300" style={{ height: '45%' }} />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-slate-600">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-[560px] w-full text-sm">
                          <thead>
                            <tr className="text-left text-slate-600">
                              <th className="py-2 pr-4">Task</th>
                              <th className="py-2 pr-4">Estimate</th>
                              <th className="py-2 pr-4">When</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-slate-200">
                              <td className="py-2 pr-4 text-slate-900">Module 2 readings</td>
                              <td className="py-2 pr-4 text-slate-700">2–3h</td>
                              <td className="py-2 pr-4 text-slate-700">Mon–Tue</td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-2 pr-4 text-slate-900">Practice notebook</td>
                              <td className="py-2 pr-4 text-slate-700">2h</td>
                              <td className="py-2 pr-4 text-slate-700">Wed</td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-2 pr-4 text-slate-900">Discussion post</td>
                              <td className="py-2 pr-4 text-slate-700">45m</td>
                              <td className="py-2 pr-4 text-slate-700">Thu</td>
                            </tr>
                            <tr className="border-t border-slate-200">
                              <td className="py-2 pr-4 text-slate-900">Quiz review + take</td>
                              <td className="py-2 pr-4 text-slate-700">1.5h</td>
                              <td className="py-2 pr-4 text-slate-700">Fri</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </AIMessageContent>
                </AIMessage>
              </div>
              <div className="flex flex-col items-center md:order-2 md:items-start">
                <img src="/dog_thinking.png" alt="Lulu refine plan" className="w-24 h-24 rounded" />
                <div className="mt-2 text-slate-900 font-medium">Refine Plan</div>
                <p className="mt-1 text-slate-600 text-sm text-center md:text-left">Adjust workload and timelines; visualize pacing.</p>
                <p className="mt-1 text-slate-600 text-xs text-center md:text-left">Charts and estimates guide execution confidently.</p>
              </div>
            </div>
          </div>

          <div ref={(el) => { refs.current[4] = el }} className={stepClass(4)}>
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start">
              <div className="min-w-0 space-y-3 md:order-1">
                <AIMessage from="assistant">
                  <AIMessageContent className="w-fit max-w-[85%] min-w-0">
                    <MessageResponse>
                      {`# Module 2 Study Plan

**Goal:** Master regression basics and submit graded items on time.

## Weekly Overview
- Mon–Tue: reading and notes
- Wed: practice notebook
- Thu: discussion post
- Fri: review + quiz (17:00)
- Sat–Sun: mini-project (submit by 20:00)

### Key Tips
- Pace reading across two days for better retention.
- Schedule short review blocks each day.
- Use office hours or discussion to unblock.

#### Quick Math Reminder
Linear model: \`y = m x + b\`

##### Checklist
- [x] Read Module 2 overview
- [x] Set up dataset for notebook
- [ ] Draft mini-project report

> "Consistency beats cramming" — plan small daily wins.

### Resources
- **Dataset:** annotated sample
- *Slides:* Week 2 deck
- Notes: highlight assumptions and evaluation metrics
`}
                    </MessageResponse>
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-[560px] w-full text-sm">
                        <thead>
                          <tr className="text-left text-slate-600">
                            <th className="py-2 pr-4">Day</th>
                            <th className="py-2 pr-4">Plan</th>
                            <th className="py-2 pr-4">Deliverable</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Mon</td>
                            <td className="py-2 pr-4 text-slate-700">Read Module 2</td>
                            <td className="py-2 pr-4 text-slate-700">Notes</td>
                          </tr>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Tue</td>
                            <td className="py-2 pr-4 text-slate-700">Read & summary</td>
                            <td className="py-2 pr-4 text-slate-700">Summary</td>
                          </tr>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Wed</td>
                            <td className="py-2 pr-4 text-slate-700">Practice notebook</td>
                            <td className="py-2 pr-4 text-slate-700">Notebook</td>
                          </tr>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Thu</td>
                            <td className="py-2 pr-4 text-slate-700">Discussion</td>
                            <td className="py-2 pr-4 text-slate-700">Post</td>
                          </tr>
                          <tr className="border-t border-slate-200">
                            <td className="py-2 pr-4 text-slate-900">Fri</td>
                            <td className="py-2 pr-4 text-slate-700">Quiz + project prep</td>
                            <td className="py-2 pr-4 text-slate-700">Quiz</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </AIMessageContent>
                </AIMessage>
              </div>
              <div className="flex flex-col items-center md:order-2 md:items-start">
                <img src="/dog_mail.png" alt="Lulu answer delivered" className="w-24 h-24 rounded" />
                <div className="mt-2 text-slate-900 font-medium">Answer</div>
                <p className="mt-1 text-slate-600 text-sm text-center md:text-left">Actionable steps and schedule rendered with tables and markdown.</p>
                <p className="mt-1 text-slate-600 text-xs text-center md:text-left">Includes tips and checklist to keep momentum.</p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <PromptInputProvider>
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 items-start border-t border-slate-200 pt-2">
                <div className="min-w-0 md:order-1">
                  <Suggestions className="max-w-full overflow-x-hidden flex-wrap md:flex-nowrap p-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button aria-label="Generate suggestions" variant="outline" size="icon" type="button" onClick={() => { }}>
                          <SparklesIcon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Generate suggestions</TooltipContent>
                    </Tooltip>
                    {[
                      'Can you quiz me on Module 2?',
                      'Summarize key formulas',
                      'Show mistakes to avoid in the project',
                      'Suggest a weekend review plan'
                    ].map((s, i) => (
                      <Suggestion key={`${s}-${i}`} suggestion={s} onClick={() => { }} />
                    ))}
                  </Suggestions>
                  <div className="min-w-0">
                    <PromptInput className="px-4 pb-4 w-full max-w-full" onSubmit={(m) => { }}>
                      <PromptInputBody>
                        <PromptInputTextarea placeholder="Type a follow-up… (demo)" className="w-full" />
                      </PromptInputBody>
                      <PromptInputFooter>
                        <PromptInputTools className="flex flex-wrap md:flex-nowrap gap-1">
                        </PromptInputTools>
                        <PromptInputSubmit status={'ready'} />
                      </PromptInputFooter>
                    </PromptInput>
                  </div>
                </div>
                <div className="flex flex-col items-center md:order-2 md:items-start px-4">
                  <img src="/dog_chat.png" alt="Lulu follow-up" className="w-24 h-24 rounded" />
                  <div className="mt-2 text-slate-900 font-medium">Follow-up Suggestions</div>
                  <p className="mt-1 text-slate-600 text-sm text-center md:text-left">Keep momentum with one-click prompts that adapt to your latest answer.</p>
                  <p className="mt-1 text-slate-600 text-xs text-center md:text-left">Use them to review, quiz, summarize, and plan next steps.</p>
                </div>
              </div>
            </PromptInputProvider>
          </div>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  )
}
