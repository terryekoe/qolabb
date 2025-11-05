# Qolabb: Focus & Simplification Plan

## 🎯 Core Problem Statement

**"Students in group projects struggle with uneven participation. Some members do most of the work while others contribute little. Qolabb helps teams see who's contributing what, so everyone can participate fairly."**

---

## 👥 User Personas

### Primary Persona: **Sarah - First-Year Student**
- **Age**: 19
- **Experience**: First group project ever
- **Tech comfort**: Basic (uses Google Docs, email, maybe GitHub)
- **Pain points**: 
  - Doesn't know how much she should contribute
  - Worried about teammates not doing their part
  - Doesn't want to be "that person" who complains
  - Overwhelmed by complex tools
  
**Goal**: "I want to see if everyone in my team is contributing fairly, without learning a complicated system."

### Secondary Persona: **Professor Chen - Course Instructor**
- **Age**: 45
- **Experience**: Teaching for 15 years
- **Pain points**:
  - Hard to grade group work fairly
  - Can't see individual contributions
  - Students complain about free-riders after project ends
  
**Goal**: "I want visibility into student participation to grade fairly and help struggling teams early."

### Tertiary Persona: **Marcus - Team Leader**
- **Age**: 20
- **Experience**: 2-3 group projects
- **Pain points**:
  - Teammates disappear when deadlines approach
  - Doesn't know how to address participation issues diplomatically
  - Spends too much time managing vs. doing work

**Goal**: "I want a simple way to show my team that participation is uneven, so we can fix it together."

---

## 🎓 Core Educational Value Proposition

**Qolabb is NOT a task management tool. It's a participation visibility tool.**

### What Makes It Educational:
1. **Fairness & Transparency**: Students see their contributions relative to teammates
2. **Early Intervention**: Instructors spot struggling teams before it's too late
3. **Self-Regulation**: Teams can self-correct without instructor intervention
4. **Learning Tool**: Students learn about collaboration and accountability

### What It's NOT:
- ❌ A project management system (that's what Trello/Asana are for)
- ❌ A communication platform (that's what Slack/Discord are for)
- ❌ A document editor (that's what Google Docs is for)
- ❌ A task tracker (that's what GitHub Issues are for)

---

## 🚴 The Agile Bicycle: MVP Features

### Phase 1: The Absolute Minimum (Week 1-2)

**For Students:**
1. **Join a Study Group** (workspace/team)
   - Simple: Enter group code or get invited
   - No complex team management

2. **Log What You Did**
   - "I worked on [project] for [X] hours"
   - "I completed [task]"
   - Simple form, not a full task management system

3. **See Group Participation**
   - Simple bar chart: "Who contributed how much this week?"
   - No complex analytics, just visibility

**For Instructors:**
4. **View Group Activity**
   - See all groups in their course
   - Spot teams with participation imbalances (red flags)

---

## 📋 Feature Audit: Keep vs. Hide vs. Remove

### ✅ **KEEP (Core MVP)**

1. **Workspaces/Teams** → Rename to "Study Groups"
   - Simplify: Just name, description, invite code
   - Remove: Complex team management, colors, roles

2. **Contributions** → Rename to "What I Did"
   - Simplify: Just log hours worked + brief description
   - Remove: Complex task associations, attachments, status tracking

3. **Basic Dashboard** → Rename to "My Group Activity"
   - Show: Simple participation chart (who did how much)
   - Remove: Complex analytics, multiple views, filters

4. **Peer Evaluations** → KEEP (Core educational feature!)
   - This is unique to educational context
   - Helps with fairness and accountability

### 🚫 **HIDE (Comment Out - Can Add Back Later)**

1. **Task Management** (`/tasks`)
   - Too complex for MVP
   - Students can use Google Docs or simple lists

2. **Project Management** (`/projects`)
   - Too complex for MVP
   - Focus on contributions, not project structure

3. **Advanced Analytics** (`/analytics`)
   - Keep only basic participation chart
   - Hide complex metrics, trends, exports

4. **Communication Features**
   - Team Chat
   - Project Discussions  
   - Direct Messaging
   - Students already use WhatsApp/Slack

5. **Settings Page Complexity**
   - Keep: Profile, basic account settings
   - Hide: Integrations, advanced notifications, appearance settings

6. **External Integrations**
   - Google Docs integration
   - GitHub integration
   - Too complex for first-time users

7. **Motivational Messages**
   - Nice to have, not core
   - Can add back after MVP

### ❌ **REMOVE (Or Move to Future Phase)**

1. **Complex Team Management**
   - Team colors, detailed member management
   - Multiple roles, permissions

2. **Advanced Features**
   - Notifications system (too complex)
   - Export functionality
   - Workspace switching (start simple)

---

## 🎨 Educational Language & UX Changes

### Rename Everything for Education Context:

| Current Term | Educational Term | Why |
|-------------|------------------|-----|
| Workspace | Course/Study Group | More familiar to students |
| Team | Group | Simpler, more relatable |
| Project | Assignment | Educational context |
| Task | What I Did | More personal, less formal |
| Contribution | My Work | Simpler language |
| Dashboard | My Group | Personal, not technical |
| Analytics | Participation | Clear purpose |

### Simplified Navigation:

**Current (Too Many Options):**
- Dashboard
- Teams
- Projects
- Tasks
- Contributions
- Analytics
- Evaluations
- Messages
- Settings

**MVP (Focused):**
- My Group (dashboard)
- What I Did (log contributions)
- Participation (view chart)
- Evaluations (peer feedback)
- Settings (profile only)

---

## 📝 Implementation Plan

### Step 1: Create Feature Flags
Create a `config/features.ts` file:
```typescript
export const FEATURES = {
  TASKS: false,              // Hide task management
  PROJECTS: false,            // Hide project management
  ADVANCED_ANALYTICS: false,  // Hide complex charts
  COMMUNICATION: false,       // Hide chat/discussions
  INTEGRATIONS: false,       // Hide Google/GitHub
  MOTIVATIONAL_MESSAGES: false, // Hide messages
  SETTINGS_ADVANCED: false,  // Hide advanced settings
};
```

### Step 2: Update Navigation
- Comment out hidden features in sidebar
- Simplify to 4-5 main items

### Step 3: Update Language
- Replace "workspace" with "study group"
- Replace "task" with "what I did"
- Replace "project" with "assignment"
- Add educational context everywhere

### Step 4: Simplify UI
- Remove complex filters
- Remove advanced options
- Focus on one clear action per page

### Step 5: Add Educational Context
- Onboarding: "Welcome! This helps you see how much everyone in your study group is contributing."
- Empty states: "Log your first contribution to get started!"
- Tooltips: "This shows who's contributing how much to help keep your group fair."

---

## 🎯 Success Metrics for MVP

**For Students:**
- Can join a study group in < 2 minutes
- Can log a contribution in < 30 seconds
- Can see participation chart in < 10 seconds
- Understands what the chart means without reading docs

**For Instructors:**
- Can see all groups in their course
- Can spot participation imbalances in < 30 seconds
- Can export basic participation report

---

## 📚 Educational Research to Reference

1. **Social Loafing**: Students contribute less in groups
   - **Solution**: Visibility reduces social loafing

2. **Free-Rider Problem**: Some students let others do the work
   - **Solution**: Transparency makes free-riders visible

3. **Fairness Perception**: Students want fair grading
   - **Solution**: Data helps instructors grade fairly

4. **Self-Regulation**: Teams can fix problems if they see them
   - **Solution**: Simple visibility enables self-correction

---

## 🚀 Next Steps

1. **Review this plan** with supervisor
2. **Prioritize features** together
3. **Create feature flags** to hide non-MVP features
4. **Update language** throughout app
5. **Test with real students** (2-3) to get feedback
6. **Iterate based on feedback**

---

## 💡 Key Insight

**"Less is more. Students don't need another complex tool. They need simple visibility into participation so they can focus on learning, not managing tools."**

---

## 📞 Questions for Supervisor

1. What's the absolute minimum a student needs to see?
2. Should we keep peer evaluations in MVP? (I think yes - it's uniquely educational)
3. How much should instructors see vs. students?
4. Should we focus on one course/project type first?
5. Can we test with 2-3 real student groups?
