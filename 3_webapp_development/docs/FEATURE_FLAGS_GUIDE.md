# Feature Flags System Guide

## Overview

The feature flag system allows you to easily enable/disable features for the MVP vs. full feature set. This helps focus on core educational value while keeping the code for future features.

## Configuration

**File:** `lib/config/features.ts`

This file contains all feature flags. Set a feature to `false` to hide it from the MVP.

### Current MVP Settings (Enabled = `true`):
- ✅ `DASHBOARD` - Main dashboard
- ✅ `STUDY_GROUPS` - Teams (renamed for educational context)
- ✅ `CONTRIBUTIONS` - "My Work" - core feature
- ✅ `PARTICIPATION_CHART` - Basic participation visibility
- ✅ `PEER_EVALUATIONS` - Core educational value
- ✅ `SETTINGS_PROFILE` - Basic profile settings

### Hidden for MVP (Disabled = `false`):
- ❌ `TASKS` - Task management (too complex)
- ❌ `PROJECTS` - Project management (not needed)
- ❌ `ADVANCED_ANALYTICS` - Complex charts
- ❌ `COMMUNICATION` - Team chat, discussions, messaging
- ❌ `INTEGRATIONS` - Google Docs, GitHub
- ❌ `MOTIVATIONAL_MESSAGES` - Nice to have
- ❌ `SETTINGS_ADVANCED` - Advanced settings

## How It Works

### 1. Sidebar Navigation
The sidebar automatically filters out disabled features:
```typescript
// In Sidebar.tsx
const navigationItems = [
  { label: 'Tasks', href: '/tasks', feature: 'TASKS' as const },
  // ...
].filter(item => isFeatureEnabled(item.feature));
```

### 2. Page Protection
Pages are wrapped with `FeatureGuard`:
```typescript
// In app/tasks/page.tsx
export default function TasksPage() {
  return (
    <FeatureGuard 
      feature="TASKS" 
      featureName="Task Management"
      description="Task management is not available in the MVP."
    >
      <TasksPageContent />
    </FeatureGuard>
  );
}
```

### 3. Component-Level Guards
Use the hook in components:
```typescript
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

function MyComponent() {
  const canUseTasks = useFeatureFlag('TASKS');
  
  if (!canUseTasks) {
    return <FeatureDisabled featureName="Tasks" />;
  }
  
  return <TaskComponent />;
}
```

## Usage Examples

### Check a Single Feature
```typescript
import { isFeatureEnabled } from '@/lib/config/features';

if (isFeatureEnabled('TASKS')) {
  // Show task-related UI
}
```

### Use in Components
```typescript
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

function MyComponent() {
  const showTasks = useFeatureFlag('TASKS');
  
  return (
    <div>
      {showTasks && <TaskButton />}
    </div>
  );
}
```

### Protect a Route
```typescript
import { FeatureGuard } from '@/components/features/FeatureGuard';

export default function MyPage() {
  return (
    <FeatureGuard feature="PROJECTS" featureName="Projects">
      <ProjectsContent />
    </FeatureGuard>
  );
}
```

## What Happens When a Feature is Disabled?

1. **Navigation**: Item is removed from sidebar
2. **Pages**: Shows "Feature Not Available" message with educational context
3. **Components**: Can conditionally render based on feature flag
4. **Settings**: Shows "Coming Soon" for disabled sections

## Enabling Features for Testing

To test a hidden feature:

1. Open `lib/config/features.ts`
2. Change the feature from `false` to `true`
3. Restart dev server
4. Feature will appear in navigation and be accessible

Example:
```typescript
// Enable tasks for testing
TASKS: true,  // Changed from false
```

## Best Practices

1. **Keep MVP features simple**: Only enable features that are core to participation visibility
2. **Test with real users**: Disable features, test with students, get feedback
3. **Document decisions**: Note why a feature is disabled in the code comments
4. **Gradual rollout**: Enable features one at a time after MVP validation

## Current Navigation (MVP)

With current flags, sidebar shows:
- Dashboard
- My Work (Contributions)
- Peer Evaluations
- Study Groups (Teams)
- Participation (Analytics - basic chart only)
- Settings (Profile only)

Hidden features show friendly "not available" messages when accessed directly.

## Next Steps

1. Test the MVP with students
2. Get feedback on what's confusing or missing
3. Gradually enable features based on feedback
4. Update feature flags as you learn what students actually need
