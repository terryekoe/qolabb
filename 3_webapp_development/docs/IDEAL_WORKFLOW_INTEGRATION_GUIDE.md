# Ideal Workflow Integration Guide

This guide shows how to integrate all 6 ideal workflow improvements into your app.

## ✅ Components Created

### 1. First-Run Tour ✅
**Component:** `components/onboarding/FirstRunTour.tsx`
**Status:** Integrated into Dashboard
**Usage:**
```tsx
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';

// In DashboardPage
{showTour && <FirstRunTour onComplete={() => setShowTour(false)} />}
```

---

### 2. Task Triage & WIP Limits ✅
**Component:** `components/tasks/TaskTriageView.tsx`
**Component:** `components/tasks/DeadlineNudger.tsx`
**Status:** Components created, ready for integration

**Integration in Tasks Page:**
```tsx
import { TaskTriageView } from '@/components/tasks/TaskTriageView';
import { DeadlineNudger } from '@/components/tasks/DeadlineNudger';

// Add triage view mode
const [viewMode, setViewMode] = useState<'board' | 'list' | 'triage'>('board');

// In render
{viewMode === 'triage' && (
  <TaskTriageView
    tasks={tasks}
    onTriageStatusChange={handleTriageStatusChange}
    onStartTask={handleStartTask}
    wipLimit={5}
    currentWip={inProgressTasks.length}
  />
)}

// Add deadline nudger to dashboard or task page header
<DeadlineNudger
  tasks={tasks}
  onTaskClick={(taskId) => openTaskDetail(tasks.find(t => t.id === taskId))}
  onSnooze={(taskId, hours) => handleSnoozeTask(taskId, hours)}
/>
```

**Database Migration:** `042_add_first_tour_completed.sql` (run this first)

---

### 3. Participation Visibility - Proactive Alerts ✅
**Component:** `components/participation/ParticipationAlert.tsx`
**Service:** `lib/services/participationAlerts.ts`
**Status:** Components and service created

**Integration:**
```tsx
import { ParticipationAlertsPanel } from '@/components/participation/ParticipationAlert';
import { analyzeTeamWorkload, getParticipationAlerts } from '@/lib/services/participationAlerts';

// In Dashboard or Teams page
const [alerts, setAlerts] = useState([]);

useEffect(() => {
  async function loadAlerts() {
    if (currentWorkspace && currentTeam) {
      // Generate alerts
      const newAlerts = await analyzeTeamWorkload(currentTeam.id, currentWorkspace.id);
      
      // Or load saved alerts
      const savedAlerts = await getParticipationAlerts(currentWorkspace.id, currentTeam.id);
      setAlerts(savedAlerts);
    }
  }
  loadAlerts();
}, [currentWorkspace, currentTeam]);

// Render
<ParticipationAlertsPanel
  alerts={alerts}
  onDismiss={(alertId) => handleDismissAlert(alertId)}
  onAction={(alertId, action) => handleAlertAction(alertId, action)}
/>
```

---

### 4. Team Collaboration - Weekly Retros & Decision Logging ✅
**Component:** `components/team/WeeklyRetrospective.tsx`
**Component:** `components/team/WeeklyLoopManager.tsx`
**Status:** Components created

**Integration in Teams Page:**
```tsx
import { WeeklyRetrospective } from '@/components/team/WeeklyRetrospective';
import { WeeklyLoopManager } from '@/components/team/WeeklyLoopManager';

// Show weekly loop prompt
{showWeeklyLoop && (
  <WeeklyLoopManager
    teamId={team.id}
    teamName={team.name}
    onComplete={() => setShowWeeklyLoop(false)}
  />
)}

// Or standalone retrospective
<WeeklyRetrospective
  teamId={team.id}
  teamName={team.name}
  onComplete={(responses) => handleRetroComplete(responses)}
  onSkip={() => setShowRetro(false)}
/>
```

**Database Migration:** `043_add_workflow_features.sql` (includes retro and decision tables)

---

### 5. Analytics & Decisions - Actionable Tips ✅
**Component:** `components/analytics/ActionableRecommendation.tsx`
**Service:** `lib/services/actionableRecommendations.ts`
**Status:** Components and service created

**Integration in Analytics Page:**
```tsx
import { ActionableRecommendationsPanel } from '@/components/analytics/ActionableRecommendation';
import { generateActionableRecommendations, executeTaskRedistribution } from '@/lib/services/actionableRecommendations';

const [recommendations, setRecommendations] = useState([]);

useEffect(() => {
  async function loadRecommendations() {
    if (currentWorkspace) {
      const recs = await generateActionableRecommendations(currentWorkspace.id);
      setRecommendations(recs);
    }
  }
  loadRecommendations();
}, [currentWorkspace]);

// Render
<ActionableRecommendationsPanel
  recommendations={recommendations}
  onApply={async (recId) => {
    const rec = recommendations.find(r => r.id === recId);
    if (rec?.type === 'task_redistribution' && rec.affectedEntities.task) {
      await executeTaskRedistribution(
        rec.affectedEntities.task.id,
        rec.affectedEntities.from!.id,
        rec.affectedEntities.to!.id
      );
    }
  }}
  onDismiss={(recId) => setRecommendations(prev => prev.filter(r => r.id !== recId))}
/>
```

---

### 6. Rhythm & Feedback - Weekly Loop ✅
**Component:** `components/team/WeeklyLoopManager.tsx`
**Status:** Component created (includes Update → Review → Retro flow)

**Integration:**
```tsx
import { WeeklyLoopManager } from '@/components/team/WeeklyLoopManager';

// Check if weekly loop is due (could be done in Dashboard or Teams page)
const shouldShowWeeklyLoop = useMemo(() => {
  const lastCompleted = getLastWeekLoopCompletion();
  const daysSince = (Date.now() - lastCompleted) / (1000 * 60 * 60 * 24);
  return daysSince >= 7;
}, []);

{shouldShowWeeklyLoop && (
  <WeeklyLoopManager
    teamId={currentTeam.id}
    teamName={currentTeam.name}
    onComplete={() => {
      markWeeklyLoopCompleted();
      setShowWeeklyLoop(false);
    }}
  />
)}
```

---

## 📋 Database Migrations to Run

Run these migrations in order:

1. **`042_add_first_tour_completed.sql`** - Adds tour completion tracking
2. **`043_add_workflow_features.sql`** - Adds triage, retros, decisions, alerts tables

---

## 🚀 Quick Integration Checklist

- [ ] Run database migrations
- [ ] Update Profile type (already done ✅)
- [ ] Integrate FirstRunTour in Dashboard (already done ✅)
- [ ] Add TaskTriageView to Tasks page
- [ ] Add DeadlineNudger to Tasks page or Dashboard
- [ ] Integrate ParticipationAlertsPanel in Dashboard/Teams
- [ ] Add WeeklyLoopManager to Teams page
- [ ] Integrate ActionableRecommendationsPanel in Analytics page
- [ ] Set up weekly loop prompts (check on dashboard load)

---

## 💡 Example: Full Integration in Dashboard

```tsx
// app/dashboard/page.tsx
import { FirstRunTour } from '@/components/onboarding/FirstRunTour';
import { DeadlineNudger } from '@/components/tasks/DeadlineNudger';
import { ParticipationAlertsPanel } from '@/components/participation/ParticipationAlert';
import { ActionableRecommendationsPanel } from '@/components/analytics/ActionableRecommendation';

export default function DashboardPage() {
  // ... existing code ...
  
  return (
    <DashboardLayout>
      {showTour && <FirstRunTour onComplete={() => setShowTour(false)} />}
      
      {/* Deadline Nudges */}
      <div className="mb-6">
        <DeadlineNudger tasks={tasks} onTaskClick={handleTaskClick} />
      </div>
      
      {/* Participation Alerts */}
      <div className="mb-6">
        <ParticipationAlertsPanel alerts={alerts} />
      </div>
      
      {/* Actionable Recommendations */}
      <div className="mb-6">
        <ActionableRecommendationsPanel recommendations={recommendations} />
      </div>
      
      {/* Rest of dashboard */}
    </DashboardLayout>
  );
}
```

---

## 🎯 Next Steps

1. Run the migrations
2. Integrate components into respective pages
3. Set up periodic alerts generation (could be a scheduled function or useEffect)
4. Test the complete workflow

All components are ready to use! 🚀
