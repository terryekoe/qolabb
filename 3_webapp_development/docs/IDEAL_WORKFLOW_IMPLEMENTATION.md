# Ideal Workflow Implementation Guide

This document outlines the implementation of the 6 ideal workflow improvements.

## 1. Getting Started: Role-Based First-Run Tour ✅ IN PROGRESS

**Status:** Component created, needs integration

**Implementation:**
- ✅ Created `FirstRunTour.tsx` component
- ✅ Role-specific tours (Student/Instructor)
- ⏳ Database migration for `first_tour_completed` field
- ⏳ Dashboard integration to show on first load
- ⏳ Update Profile type to include tour fields

**Next Steps:**
1. Update Profile type
2. Integrate into Dashboard
3. Add check for tour completion on workspace join

---

## 2. Task Handling: Triage, WIP Limits, Auto-Nudging

**Status:** Planning

**Features Needed:**
- Task triage workflow (Inbox → Triage → Working)
- Work-in-progress (WIP) limits per user
- Automatic deadline nudging (24h, 48h before due)
- Task prioritization suggestions

**Implementation Plan:**
1. Add `triage_status` field to tasks table
2. Create TriageView component
3. Add WIP limit settings (user preferences)
4. Create deadline notification system
5. Add auto-nudge cron job or scheduled checks

---

## 3. Participation Visibility: Proactive Alerts

**Status:** Planning

**Features Needed:**
- "Who needs help" proactive alerts
- Plain-language recommendations
- Automatic reassignment suggestions
- Real-time imbalance notifications

**Implementation Plan:**
1. Create `ParticipationAlert` component
2. Add alert generation logic (workload imbalance detection)
3. Create notification system for alerts
4. Add actionable recommendation cards
5. Integrate with analytics dashboard

---

## 4. Team Collaboration: Email, Retros, Decision Logging

**Status:** Planning

**Features Needed:**
- Email integration for notifications
- Weekly retrospective system
- Decision logging/audit trail
- Chat integration (optional)

**Implementation Plan:**
1. Set up email service (Resend/SendGrid)
2. Create Retrospective component
3. Add decision_log table
4. Create weekly retro prompts
5. Email digest system

---

## 5. Analytics & Decisions: Actionable Tips

**Status:** Planning

**Features Needed:**
- Specific task-level recommendations
- "Team B overloaded—swap Task X to Team C" style tips
- One-click action buttons
- Workload redistribution wizard

**Implementation Plan:**
1. Enhance TeamWorkloadWidget with actionable suggestions
2. Create TaskRedistributionModal
3. Add quick action buttons to recommendations
4. Improve recommendation engine specificity

---

## 6. Rhythm & Feedback: Weekly Loop

**Status:** Planning

**Features Needed:**
- Weekly update prompts
- Review cycle
- Retrospective templates
- Automated scheduling

**Implementation Plan:**
1. Create WeeklyLoop component
2. Add update prompts system
3. Create retro templates
4. Schedule weekly reminders
5. Track completion status

---

## Implementation Order

1. ✅ First-Run Tour (Start)
2. Task Triage & WIP Limits
3. Participation Alerts
4. Actionable Analytics
5. Team Collaboration Features
6. Weekly Loop System

---

## Database Changes Needed

1. `profiles.first_tour_completed` (boolean)
2. `tasks.triage_status` (enum: 'inbox', 'triage', 'working')
3. `tasks.wip_priority` (integer)
4. `user_preferences.wip_limit` (integer)
5. `weekly_retrospectives` (new table)
6. `decisions` (new table)
7. `participation_alerts` (new table)

---

## Key Components to Create

1. `FirstRunTour.tsx` ✅
2. `TaskTriageView.tsx`
3. `WIPLimitIndicator.tsx`
4. `DeadlineNudger.tsx`
5. `ParticipationAlert.tsx`
6. `ActionableRecommendation.tsx`
7. `WeeklyRetrospective.tsx`
8. `DecisionLogger.tsx`
9. `TaskRedistributionWizard.tsx`
10. `WeeklyLoopManager.tsx`
