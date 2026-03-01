## Summary
Enable users to study with a Pomodoro-based timer and earn streaks and badges when they complete a minimum of 90 minutes of focus time per day. Users start/stop the timer, see daily progress, track consecutive days, and receive badges for a 7‑day streak and for studying at least 20 days in a calendar month.

## Goals
- Increase study consistency by enforcing a 90‑minute daily focus target.
- Provide clear feedback via streaks and badges to motivate continued use.
- Offer a simple, reliable timer experience on web and mobile browsers.

## Success Metrics
- Daily Active Timer Users (DATU): users who start at least one focus session per day.
- Completion Rate: % of days where users reach 90 minutes.
- Streak Growth: average longest streak per user over 30 days.
- Badge Earned Rate: % of users earning 7‑day and 20‑day badges.

## Key Features
- Pomodoro Timer: default cycles of 25‑minute focus and 5‑minute short break; optional 15‑minute long break after 4 cycles.
- Daily Target: accumulate only focus minutes toward the 90‑minute requirement.
- Start/Stop/Resume: users click to start, pause, and resume; auto‑pause on page unload with graceful recovery.
- Daily Progress Indicator: display minutes completed and remaining toward 90 minutes.
- Streak Tracking: consecutive days meeting the 90‑minute target; streak resets on missed day.
- Badges:
  - Weekly Scholar: awarded immediately after 7 consecutive days completing 90 minutes.
  - Monthly Marathoner: awarded after studying on ≥20 distinct calendar days in the same month.
- History & Insights: daily totals, current streak, longest streak, earned badges, and monthly calendar heatmap.

## User Stories
- As a student, I can start a Pomodoro timer and see remaining time for the current focus cycle.
- As a student, I can pause/resume the timer and continue accumulating focus time.
- As a student, I can see today’s progress toward 90 minutes and how much time remains.
- As a student, I can see my streak count and be notified when I maintain or lose it.
- As a student, I earn a 7‑day streak badge and a 20‑day month badge and can view them.
- As a student, I can see a monthly view indicating which days I met the target.

## UX & Flows
- Timer Control:
  - Primary button: Start (when idle), Pause (when running), Resume (when paused), Reset (optional per day).
  - Cycle view: focus countdown (25:00) and break countdown (5:00) with clear state labels.
- Daily Progress:
  - Progress bar + numeric display (e.g., 62/90 min) counting only focus minutes.
  - Tooltip or note clarifying “only focus periods count toward the daily target”.
- Streak:
  - Streak counter with visual indicator; message when streak continues or breaks.
  - Reset logic happens at local midnight based on user’s time zone.
- Badges:
  - In‑context toast/notification upon earning a badge; badges page with badge details and earned date.
- History:
  - Calendar heatmap with green for completed days and lighter shades for partial progress.

## Functional Requirements
- Time Accounting:
  - Only focus minutes are added to the daily total; breaks do not count.
  - Timer persists across tab refresh/close via background session recovery (local storage + server sync).
  - Sessions crossing midnight are split and attributed to each calendar day by local time.
- Streak Logic:
  - A day is “complete” when ≥90 minutes of focus are logged between 00:00–23:59 local time.
  - Streak increments by 1 for each complete day following a complete day; resets on incomplete day.
- Monthly Badge Logic:
  - Award when the user completes ≥20 distinct days within the current calendar month.
- Weekly Badge Logic:
  - Award immediately when streak reaches 7 consecutive days.
- Sync & Multi‑Device:
  - Authenticated users: sessions sync to server; offline mode queues events and reconciles on reconnect.
  - Anonymous users: local only; prompt to sign in to preserve streaks and badges.
- Notifications:
  - Optional browser notifications for cycle transitions and badge awards.
- Accessibility:
  - Keyboard‑operable controls; ARIA labels; color‑contrast compliant progress/states.

## Non‑Functional Requirements
- Reliability: timer accuracy ±1 second over session; resilient to tab inactivity and reloads.
- Performance: minimal CPU when idle; efficient state updates.
- Scalability: handle concurrent sessions for many users; efficient aggregation.
- Time Zone Handling: all streak/day calculations use user’s selected time zone; default from browser.

## Anti‑Abuse & Integrity
- Cap background accumulation when tab is inactive beyond X minutes unless a session is active; no auto‑advancing without an active focus session.
- Disallow manual edits of focus totals; changes must come from timer events.
- Log transitions (start, tick, pause, resume, stop) for audit consistency.

## Data Model
- StudySession: id, userId, deviceId, startedAt, endedAt, type (focus|break), durationSeconds, source (web), recovered (bool).
- DailyAggregate: id, userId, date (YYYY‑MM‑DD with tz), focusSeconds, completed (bool), completedAt.
- Streak: userId, currentCount, longestCount, updatedAt.
- Badge: id, code (weekly_scholar|monthly_marathoner), name, description.
- UserBadge: id, userId, badgeCode, awardedAt.

## API Endpoints
- POST `-/study/session/start` → start focus or break cycle; returns sessionId.
- POST `-/study/session/stop` → stop current cycle; persists duration.
- POST `-/study/session/pause` / `-/study/session/resume` → state changes.
- GET `-/study/daily` → today’s aggregate and remaining minutes.
- GET `-/streak` → current and longest streak.
- GET `-/badges` → earned badges.
- POST `-/evaluate/badges` → server evaluates and awards badges for today; also auto‑run on session stop.

## Telemetry & Analytics
- Events: timer_start, timer_pause, timer_resume, timer_stop, day_complete, streak_continue, streak_break, badge_awarded.
- Dashboards: daily completions, streak distributions, badge awards, retention after badge.

## Acceptance Criteria
- Users can start/pause/resume a Pomodoro timer; focus cycles count toward daily total.
- Daily progress clearly shows completed minutes and remaining toward 90.
- Streak increments only on consecutive complete days and resets on missed days.
- Weekly Scholar badge is awarded at 7 consecutive days; Monthly Marathoner badge at ≥20 days in calendar month.
- Sessions crossing midnight split correctly; all calculations respect user time zone.
- State persists across reloads; authenticated users see consistent data across devices.

## Rollout Plan
- Phase 1: Core timer, daily progress, streak logic, weekly badge.
- Phase 2: Monthly badge, history calendar, notifications, offline reconciliation.
- Phase 3: Mobile optimizations, advanced settings (cycle lengths), analytics.

## Open Questions
- Should users be allowed to customize focus/break lengths, or keep fixed?
- Should idle detection be stricter (e.g., pause if tab hidden for >N minutes)?
- Do we support mobile push notifications or only browser toasts?
- Do anonymous users retain local badges if they later sign in?