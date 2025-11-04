# Implementation Roadmap: Peer Evaluations & Motivational Messages

## Overview
This document provides a step-by-step guide for implementing the missing "Feedback and Motivation Tools" features.

---

## Priority Order

### High Priority (Week 1)
1. **Motivational Messages System** - Quick wins, immediate impact on engagement
2. **Basic Peer Evaluation System** - Core functionality for feedback

### Medium Priority (Week 2)
3. **Advanced Peer Evaluation Features** - Periods, automation, analytics
4. **Enhanced Motivational Messages** - Templates, customization

---

## Week 1: Core Implementation

### Day 1-2: Motivational Messages (Database & Backend)
**Estimated Time**: 6-8 hours

**Tasks**:
1. ✅ Create migration `047_add_motivational_messages.sql`
   - Create `motivational_messages` table
   - Create `message_templates` table with default templates
   - Add RLS policies
   - Update `notification_preferences` table

2. ✅ Implement backend functions in `lib/db/queries.ts`:
   ```typescript
   - sendMotivationalMessage()
   - getMotivationalMessages()
   - markMessageAsRead()
   - getUnreadMessageCount()
   ```

3. ✅ Create trigger service `lib/services/motivationalMessageTriggers.ts`:
   ```typescript
   - checkTaskCompletionTriggers()
   - checkContributionTriggers()
   - checkParticipationTriggers()
   - checkTeamMilestoneTriggers()
   ```

**Deliverables**:
- ✅ Database schema ready
- ✅ Backend functions working
- ✅ Trigger logic implemented

---

### Day 3: Motivational Messages (UI Components)
**Estimated Time**: 6-8 hours

**Tasks**:
1. ✅ Create `components/motivation/MotivationalMessageCard.tsx`
2. ✅ Create `components/motivation/MotivationalMessagesPanel.tsx`
3. ✅ Create `components/motivation/MotivationalMessageBanner.tsx`
4. ✅ Integrate banner into Dashboard
5. ✅ Add messages to notification dropdown

**Deliverables**:
- ✅ UI components complete
- ✅ Messages visible to users
- ✅ Basic interaction working

---

### Day 4: Peer Evaluations (Database & Backend)
**Estimated Time**: 6-8 hours

**Tasks**:
1. ✅ Create migration `046_add_peer_evaluation_system.sql`
   - Create `peer_evaluations` table
   - Create `evaluation_periods` table
   - Create `evaluation_responses` table
   - Add RLS policies

2. ✅ Implement backend functions in `lib/db/queries.ts`:
   ```typescript
   - createEvaluationPeriod()
   - submitPeerEvaluation()
   - getPendingEvaluations()
   - getEvaluationResults()
   - getEvaluationStats()
   ```

**Deliverables**:
- ✅ Database schema ready
- ✅ Backend functions working

---

### Day 5: Peer Evaluations (Core UI)
**Estimated Time**: 6-8 hours

**Tasks**:
1. ✅ Create `components/evaluations/PeerEvaluationForm.tsx`
2. ✅ Create `components/evaluations/EvaluationCard.tsx`
3. ✅ Create `app/evaluations/page.tsx`
4. ✅ Add navigation link to sidebar

**Deliverables**:
- ✅ Basic evaluation form working
- ✅ Users can submit evaluations
- ✅ Evaluations page accessible

---

### Day 6-7: Integration & Polish
**Estimated Time**: 8-10 hours

**Tasks**:
1. ✅ Integrate message triggers into existing workflows
2. ✅ Add evaluation notifications
3. ✅ Connect evaluations to Teams page
4. ✅ Add settings/preferences
5. ✅ Testing and bug fixes
6. ✅ Documentation

**Deliverables**:
- ✅ Full integration complete
- ✅ Features working end-to-end
- ✅ User documentation ready

---

## Week 2: Advanced Features (Optional)

### Advanced Peer Evaluations
- Evaluation period management
- Automated period creation
- Results visualization
- Export functionality
- Anonymous evaluation options

### Enhanced Motivational Messages
- Template management UI
- Custom message creation
- A/B testing for messages
- Analytics on message effectiveness
- Team-level motivational messages

---

## Quick Start: Minimal Viable Implementation

If time is limited, here's the minimal implementation:

### Motivational Messages (2 days)
1. Create database tables
2. Implement 3-5 basic triggers (task completion, first contribution, low participation)
3. Create simple message card component
4. Add to dashboard

### Peer Evaluations (2 days)
1. Create database tables
2. Create basic evaluation form (4 rating categories + comments)
3. Create evaluation page
4. Allow manual evaluation creation (skip period management initially)

**Total**: 4 days for basic functionality

---

## Testing Checklist

### Motivational Messages
- [ ] Messages trigger on correct events
- [ ] Frequency limits work (no spam)
- [ ] Messages display correctly
- [ ] Read/unread states work
- [ ] Preferences are respected
- [ ] Messages are encouraging and appropriate

### Peer Evaluations
- [ ] Users can submit evaluations
- [ ] No self-evaluation allowed
- [ ] Scores calculate correctly
- [ ] Results aggregate properly
- [ ] RLS policies enforce privacy
- [ ] Anonymous option works (if implemented)
- [ ] Evaluation period workflow works

---

## Dependencies

### Required
- Existing notification system (✅ exists)
- Team membership system (✅ exists)
- Task tracking (✅ exists)
- Contribution logging (✅ exists)

### Nice to Have
- Email notifications (for reminders)
- Analytics dashboard (for results visualization)

---

## Success Criteria

### Motivational Messages
- ✅ At least 5 different trigger types implemented
- ✅ Messages appear within 1 hour of triggering event
- ✅ User can view and dismiss messages
- ✅ No more than 1 message per day per trigger type

### Peer Evaluations
- ✅ Users can evaluate all team members
- ✅ Evaluation form is clear and easy to use
- ✅ Results are aggregated and displayed
- ✅ Privacy/anonymity options work correctly

---

## Getting Started

1. **Review the implementation plans**:
   - `PEER_EVALUATION_IMPLEMENTATION_PLAN.md`
   - `MOTIVATIONAL_MESSAGES_IMPLEMENTATION_PLAN.md`

2. **Start with Motivational Messages** (easier, faster):
   ```bash
   # Create migration
   touch supabase/migrations/047_add_motivational_messages.sql
   
   # Create service file
   touch lib/services/motivationalMessageTriggers.ts
   
   # Create components directory
   mkdir -p components/motivation
   ```

3. **Then implement Peer Evaluations**:
   ```bash
   # Create migration
   touch supabase/migrations/046_add_peer_evaluation_system.sql
   
   # Create components directory
   mkdir -p components/evaluations
   
   # Create page
   touch app/evaluations/page.tsx
   ```

4. **Follow the day-by-day plan above**

---

## Need Help?

- Check existing similar implementations (notifications, contributions)
- Reference the existing component patterns
- Use TypeScript types from `lib/types/database.ts`
- Follow existing RLS policy patterns
