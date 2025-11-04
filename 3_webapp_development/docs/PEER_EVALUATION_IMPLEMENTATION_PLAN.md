# Peer Evaluation System - Implementation Plan

## Overview
Implement a comprehensive peer evaluation system that allows team members to provide structured feedback on each other's contributions, teamwork, and collaboration skills.

---

## 1. Database Schema

### Table: `peer_evaluations`
Stores individual peer evaluation submissions.

```sql
CREATE TABLE peer_evaluations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  evaluatee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  evaluation_period_id UUID REFERENCES evaluation_periods(id) ON DELETE CASCADE,
  
  -- Evaluation Scores (1-5 scale)
  contribution_score INTEGER CHECK (contribution_score >= 1 AND contribution_score <= 5),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  collaboration_score INTEGER CHECK (collaboration_score >= 1 AND collaboration_score <= 5),
  reliability_score INTEGER CHECK (reliability_score >= 1 AND reliability_score <= 5),
  overall_score NUMERIC(3, 2) GENERATED ALWAYS AS (
    (contribution_score + communication_score + collaboration_score + reliability_score)::NUMERIC / 4
  ) STORED,
  
  -- Qualitative Feedback
  strengths TEXT,
  areas_for_improvement TEXT,
  additional_comments TEXT,
  
  -- Metadata
  is_anonymous BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_evaluation UNIQUE (evaluator_id, evaluatee_id, evaluation_period_id),
  CONSTRAINT no_self_evaluation CHECK (evaluator_id != evaluatee_id)
);

CREATE INDEX idx_peer_evaluations_team ON peer_evaluations(team_id);
CREATE INDEX idx_peer_evaluations_period ON peer_evaluations(evaluation_period_id);
CREATE INDEX idx_peer_evaluations_evaluatee ON peer_evaluations(evaluatee_id);
```

### Table: `evaluation_periods`
Manages evaluation cycles (e.g., weekly, mid-term, final).

```sql
CREATE TABLE evaluation_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  
  period_name TEXT NOT NULL, -- e.g., "Week 5 Evaluation", "Mid-Term Review"
  period_type TEXT CHECK (period_type IN ('weekly', 'mid_term', 'final', 'custom')) NOT NULL,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  
  status TEXT CHECK (status IN ('scheduled', 'active', 'closed', 'cancelled')) DEFAULT 'scheduled',
  
  -- Settings
  is_anonymous BOOLEAN DEFAULT true,
  allow_self_evaluation BOOLEAN DEFAULT false,
  require_all_members BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_evaluation_periods_team ON evaluation_periods(team_id);
CREATE INDEX idx_evaluation_periods_status ON evaluation_periods(status);
```

### Table: `evaluation_responses`
Tracks who has completed evaluations.

```sql
CREATE TABLE evaluation_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_period_id UUID REFERENCES evaluation_periods(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  evaluatee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  peer_evaluation_id UUID REFERENCES peer_evaluations(id) ON DELETE CASCADE,
  
  status TEXT CHECK (status IN ('pending', 'in_progress', 'submitted', 'reminded')) DEFAULT 'pending',
  reminder_sent_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_response UNIQUE (evaluation_period_id, evaluator_id, evaluatee_id)
);
```

### RLS Policies

```sql
-- Peer evaluations: Users can view their own evaluations (as evaluator or evaluatee)
ALTER TABLE peer_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluations" ON peer_evaluations
FOR SELECT TO authenticated
USING (
  evaluator_id = auth.uid() 
  OR evaluatee_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = peer_evaluations.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'leader'
  )
);

CREATE POLICY "Users can create evaluations" ON peer_evaluations
FOR INSERT TO authenticated
WITH CHECK (
  evaluator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = team_id
    AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own evaluations" ON peer_evaluations
FOR UPDATE TO authenticated
USING (evaluator_id = auth.uid())
WITH CHECK (evaluator_id = auth.uid());

-- Evaluation periods: Team members and leaders can view
ALTER TABLE evaluation_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view periods" ON evaluation_periods
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = evaluation_periods.team_id
    AND tm.user_id = auth.uid()
  )
);
```

---

## 2. Component Architecture

### Core Components

#### `PeerEvaluationForm.tsx`
Form for submitting peer evaluations with:
- Rating scales (1-5 stars) for each category
- Text areas for strengths/improvements/comments
- Anonymous toggle
- Validation and submission

#### `PeerEvaluationDashboard.tsx`
Overview dashboard showing:
- Pending evaluations
- Completion status
- Historical evaluation results
- Average scores over time

#### `EvaluationPeriodManager.tsx` (Instructor/Leader)
Create and manage evaluation periods:
- Schedule evaluations
- Set deadlines
- View completion status
- Trigger reminders

#### `PeerEvaluationResults.tsx`
Display aggregated results:
- Average scores per category
- Feedback summary
- Trends over time
- Comparison with team averages

#### `EvaluationCard.tsx`
Individual evaluation card showing:
- Who to evaluate
- Due date
- Progress indicator
- Quick access to form

---

## 3. Implementation Steps

### Phase 1: Database & Backend (Days 1-2)
1. Create migration file: `046_add_peer_evaluation_system.sql`
2. Implement RLS policies
3. Create helper functions in `lib/db/queries.ts`:
   - `createEvaluationPeriod()`
   - `submitPeerEvaluation()`
   - `getPendingEvaluations()`
   - `getEvaluationResults()`
   - `getEvaluationStats()`

### Phase 2: Core Components (Days 3-4)
1. Build `PeerEvaluationForm.tsx`
2. Build `EvaluationCard.tsx`
3. Build `PeerEvaluationDashboard.tsx`
4. Create evaluation page: `app/evaluations/page.tsx`

### Phase 3: Advanced Features (Days 5-6)
1. Build `EvaluationPeriodManager.tsx`
2. Build `PeerEvaluationResults.tsx`
3. Add reminder notification system
4. Add auto-generation of evaluation periods

### Phase 4: Integration (Day 7)
1. Add evaluation link to Teams page
2. Add evaluation notifications
3. Integrate with Analytics dashboard
4. Add evaluation data to participation metrics

---

## 4. User Flows

### Student Flow
1. Receive notification about pending evaluation
2. View dashboard with pending evaluations
3. Click evaluation card
4. Fill out form (ratings + feedback)
5. Submit evaluation
6. View own evaluation results (aggregated)

### Instructor/Leader Flow
1. Navigate to Teams page
2. Select team
3. Create new evaluation period
4. Set parameters (dates, anonymity, etc.)
5. System automatically creates evaluation tasks
6. Monitor completion status
7. View aggregated results
8. Export evaluation data

---

## 5. Key Features

### Automatic Period Creation
- Option to create recurring weekly evaluations
- Auto-generate evaluation tasks for all team members
- Set default deadlines (e.g., end of week)

### Reminder System
- Automatic reminders for pending evaluations
- Configurable reminder frequency
- Email/in-app notifications

### Anonymity Options
- Option for anonymous evaluations
- Aggregate feedback to hide individual evaluators
- Show only average scores and general feedback

### Results Visualization
- Charts showing score trends
- Comparison with team averages
- Category breakdowns
- Time-series analysis

---

## 6. Integration Points

1. **Teams Page**: Add "Evaluations" tab to team details
2. **Notifications**: Evaluation reminders and completion alerts
3. **Analytics**: Include evaluation scores in participation metrics
4. **Dashboard**: Show pending evaluations and recent results

---

## 7. Files to Create

```
supabase/migrations/
  └── 046_add_peer_evaluation_system.sql

app/evaluations/
  └── page.tsx

components/evaluations/
  ├── PeerEvaluationForm.tsx
  ├── PeerEvaluationDashboard.tsx
  ├── EvaluationCard.tsx
  ├── EvaluationPeriodManager.tsx
  ├── PeerEvaluationResults.tsx
  └── EvaluationStats.tsx

lib/db/
  └── queries.ts (add peer evaluation functions)
```

---

## 8. Success Metrics

- ✅ Users can create and submit peer evaluations
- ✅ Evaluation periods can be scheduled and managed
- ✅ Results are aggregated and displayed clearly
- ✅ Reminders are sent automatically
- ✅ Evaluation data integrates with analytics
- ✅ Anonymity options work correctly
