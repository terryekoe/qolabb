# Motivational Messages System - Implementation Plan

## Overview
Implement a dedicated system for sending encouraging, motivational messages to users based on their activity, achievements, and participation patterns to boost engagement and improve group dynamics.

---

## 1. Database Schema

### Table: `motivational_messages`
Stores message templates and triggered messages.

```sql
CREATE TABLE motivational_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  
  -- Message Content
  message_type TEXT CHECK (message_type IN (
    'achievement', 'milestone', 'encouragement', 'participation', 
    'teamwork', 'improvement', 'consistency', 'leadership', 'support'
  )) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  emoji TEXT, -- Optional emoji for visual appeal
  
  -- Context
  trigger_event TEXT, -- e.g., 'task_completed', 'contribution_logged', 'week_active'
  trigger_data JSONB DEFAULT '{}', -- Additional context data
  
  -- Delivery
  delivery_method TEXT CHECK (delivery_method IN ('in_app', 'notification', 'email', 'all')) DEFAULT 'in_app',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  
  -- Priority
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_motivational_messages_user ON motivational_messages(user_id);
CREATE INDEX idx_motivational_messages_unread ON motivational_messages(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_motivational_messages_type ON motivational_messages(message_type);
```

### Table: `message_templates`
Pre-defined message templates for different scenarios.

```sql
CREATE TABLE message_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_type TEXT NOT NULL,
  trigger_condition TEXT NOT NULL, -- SQL-like condition description
  
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  emoji TEXT,
  
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  frequency_limit INTERVAL, -- e.g., '1 day' to prevent spam
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO message_templates (message_type, trigger_condition, title_template, message_template, emoji, priority) VALUES
-- Achievement messages
('achievement', 'task_completed_first_week', 'First Task Complete! 🎉', 'Great job completing your first task this week! Keep up the momentum!', '🎉', 'high'),
('achievement', 'task_completed_streak_3', '3-Day Streak! 🔥', 'You''ve completed tasks for 3 days in a row! Your consistency is impressive!', '🔥', 'high'),
('achievement', 'contribution_logged_5', '5 Contributions Logged! 📊', 'You''ve logged 5 contributions this week. Your dedication is showing!', '📊', 'medium'),

-- Encouragement messages
('encouragement', 'low_participation_3_days', 'We Miss You! 💙', 'Haven''t seen you active lately. Your team could use your input!', '💙', 'high'),
('encouragement', 'first_contribution', 'Getting Started! 🌱', 'Nice work on logging your first contribution! Every step counts.', '🌱', 'medium'),

-- Teamwork messages
('teamwork', 'team_milestone_reached', 'Team Milestone! 🎯', 'Your team just reached a milestone! Thanks for being part of the success!', '🎯', 'high'),
('teamwork', 'helping_others', 'Great Team Player! 🤝', 'You''ve been helping other team members. Your collaboration is appreciated!', '🤝', 'medium'),

-- Improvement messages
('improvement', 'participation_increased', 'On the Rise! 📈', 'Your participation has improved this week. Keep it up!', '📈', 'medium'),
('improvement', 'quality_contributions', 'Quality Work! ⭐', 'Your recent contributions show great attention to detail. Well done!', '⭐', 'medium'),

-- Consistency messages
('consistency', 'active_week', 'Active Week! 💪', 'You''ve been active every day this week. Consistency is key to success!', '💪', 'medium'),
('consistency', 'on_time_tasks', 'Reliable Contributor! ✅', 'You''ve been completing tasks on time. Your reliability helps the whole team!', '✅', 'medium');
```

### Table: `message_preferences`
User preferences for motivational messages.

```sql
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS motivational_messages BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS achievement_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS encouragement_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS teamwork_notifications BOOLEAN DEFAULT true;
```

### RLS Policies

```sql
ALTER TABLE motivational_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON motivational_messages
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can create messages" ON motivational_messages
FOR INSERT TO authenticated
WITH CHECK (true); -- Will use SECURITY DEFINER function

CREATE POLICY "Users can update own messages" ON motivational_messages
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## 2. Component Architecture

### Core Components

#### `MotivationalMessageCard.tsx`
Display individual motivational messages with:
- Title and message
- Emoji
- Timestamp
- Dismiss/read actions
- Priority indicators

#### `MotivationalMessagesPanel.tsx`
Panel showing all motivational messages:
- Unread messages first
- Grouped by type
- Filter options
- Mark all as read

#### `MotivationalMessageTrigger.tsx`
Background service that:
- Monitors user activity
- Triggers appropriate messages
- Respects frequency limits
- Checks user preferences

#### `MessageTemplateManager.tsx` (Admin/Instructor)
Manage message templates:
- Create/edit templates
- Set trigger conditions
- Preview messages
- Enable/disable templates

---

## 3. Implementation Steps

### Phase 1: Database & Backend (Day 1)
1. Create migration: `047_add_motivational_messages.sql`
2. Insert default message templates
3. Create helper functions in `lib/db/queries.ts`:
   - `sendMotivationalMessage()`
   - `getMotivationalMessages()`
   - `markMessageAsRead()`
   - `checkMessageTriggers()`

### Phase 2: Trigger System (Day 2)
1. Create `lib/services/motivationalMessageTriggers.ts`
2. Implement trigger checks:
   - Task completion triggers
   - Contribution logging triggers
   - Participation pattern triggers
   - Team milestone triggers
3. Add frequency limiting logic

### Phase 3: UI Components (Days 3-4)
1. Build `MotivationalMessageCard.tsx`
2. Build `MotivationalMessagesPanel.tsx`
3. Build `MotivationalMessageBanner.tsx` (top banner for unread)
4. Integrate into dashboard and settings

### Phase 4: Integration (Day 5)
1. Add message triggers to existing workflows:
   - Task completion
   - Contribution logging
   - Team activities
2. Add to notification dropdown
3. Add preferences to settings page
4. Add auto-dismiss options

---

## 4. Trigger Conditions

### Activity-Based Triggers
- First task completed this week
- 3+ day task completion streak
- 5+ contributions logged in a week
- First contribution ever
- Active every day for a week

### Participation-Based Triggers
- Low participation detected (3+ days inactive)
- Participation increased from previous week
- Consistent participation pattern
- High-quality contributions detected

### Team-Based Triggers
- Team milestone reached
- Helping other team members
- Team workload balanced
- Positive team dynamics

### Achievement Triggers
- Task completed on time
- Multiple tasks completed
- Contribution streak
- Leadership activities

---

## 5. Message Examples

### Achievement
- **Title**: "First Task Complete! 🎉"
- **Message**: "Great job completing your first task this week! Keep up the momentum!"
- **Trigger**: First task completed in current week

### Encouragement
- **Title**: "We Miss You! 💙"
- **Message**: "Haven't seen you active lately. Your team could use your input!"
- **Trigger**: 3+ days of inactivity

### Teamwork
- **Title**: "Great Team Player! 🤝"
- **Message**: "You've been helping other team members. Your collaboration is appreciated!"
- **Trigger**: Assigned tasks to others, helped with questions

### Improvement
- **Title**: "On the Rise! 📈"
- **Message**: "Your participation has improved this week. Keep it up!"
- **Trigger**: Participation increased 25%+ from previous week

---

## 6. User Flows

### Receiving Messages
1. User completes action (task, contribution, etc.)
2. System checks for matching triggers
3. Message created if conditions met
4. Message appears in:
   - Dashboard banner (high priority)
   - Notification dropdown
   - Motivational messages panel

### Viewing Messages
1. User clicks notification or opens panel
2. Messages displayed in chronological order
3. Unread messages highlighted
4. User can mark as read or dismiss

### Managing Preferences
1. User goes to Settings → Notifications
2. Toggle motivational message types
3. Set frequency preferences
4. Save preferences

---

## 7. Integration Points

1. **Dashboard**: Banner for unread high-priority messages
2. **Notifications**: Include in notification dropdown
3. **Tasks Page**: Trigger on task completion
4. **Contributions Page**: Trigger on contribution logging
5. **Teams Page**: Trigger on team milestones
6. **Settings**: Message preferences

---

## 8. Files to Create

```
supabase/migrations/
  └── 047_add_motivational_messages.sql

lib/services/
  └── motivationalMessageTriggers.ts

components/motivation/
  ├── MotivationalMessageCard.tsx
  ├── MotivationalMessagesPanel.tsx
  ├── MotivationalMessageBanner.tsx
  └── MessageTemplateManager.tsx

lib/db/
  └── queries.ts (add motivational message functions)
```

---

## 9. Success Metrics

- ✅ Messages trigger automatically based on user activity
- ✅ Users can view and manage motivational messages
- ✅ Frequency limits prevent message spam
- ✅ Messages improve user engagement
- ✅ Preferences are respected
- ✅ Messages are visually appealing and encouraging

---

## 10. Advanced Features (Future)

1. **Personalization**: AI-generated personalized messages based on user behavior
2. **Team Messages**: Motivational messages for entire teams
3. **Scheduled Messages**: Weekly/monthly encouragement messages
4. **Custom Templates**: Allow instructors to create custom messages
5. **Gamification**: Badges and achievements tied to motivational messages
