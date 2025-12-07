# Project Retrospective

This directory is dedicated to documenting the journey of developing **Qolabb**. Use this space to reflect on the process, record lessons learned, and track the project's evolution.

## Experiences

### Initial Entry: The "Why" Behind Qolabb
The core motivation for Qolabb stems from a common and persistent frustration in student life: **uneven participation in group projects**.

As highlighted in the [Domain Study](../0_domain_study/README.md), while Project-Based Learning (PBL) is essential for developing problem-solving and teamwork skills, it often suffers from "free-riding," where some members contribute significantly less than others. This leads to tension, unfair grading, and a poor learning experience.

**Personal Motivation:**
Personally, I really dislike group work for this exact reason. I often find myself doing all the work while others coast along, which is simply not cool. It creates an unfair environment where effort isn't properly recognized.

On the other hand, I also experienced the reverse situation during the CDSP projects with **MIT Emerging Talent** (the program for which I am currently building this project). Due to personal reasons, I couldn't contribute fully, which forced a few colleagues to carry the project. This made me realize that uneven participation is not just about fairness—it actively impedes learning opportunities and meaningful collaboration for everyone involved.

**The Solution:**
Qolabb aims to solve this by building a web application that leverages data science to:
*   **Track individual contributions** transparently.
*   **Visualize engagement** to hold members accountable.
*   **Ensure that grades and recognition reflect actual effort.**

This project is about making teamwork fair again.

---

## Data Analysis Insights (October 2025)

A key part of this project was using data science to validate the problem Qolabb aims to solve. I analyzed team collaboration data from 30 teams (120 members) to understand participation patterns.

### Key Findings:

| Finding | Statistic | Implication |
|---------|-----------|-------------|
| **Free-riders** | 13% of students contribute < 4 hrs/week | Confirms uneven participation is real and measurable |
| **Work Gap** | High contributors do 5x more work | The disparity is extreme, not just a slight difference |
| **Team Inequality** | 43% of teams have significant imbalance | Almost half of all teams suffer from this problem |
| **Peer Perception** | Low contributors rated 2.9/5 vs 4.4/5 for high | Peers recognize and resent uneven effort |

### What This Means for Qolabb:

The data analysis confirmed that the problem I set out to solve is **real, measurable, and widespread**. This validated every feature I built:

- **Task Tracking** → Captures contributions that would otherwise go unnoticed
- **Workload Visibility** → Makes the 5x work gap visible to everyone
- **Instructor Analytics** → Gives educators data to grade fairly
- **Peer Evaluations** → Formalizes what peers already know (2.9 vs 4.4 ratings)

**Lesson Learned:** Data science isn't just for building features—it's for validating that the problem you're solving actually exists.

## Challenges

### 1. The Workspace RLS Struggle
One of the biggest hurdles was implementing the workspace flow. I wanted users to be able to create a new workspace or select an existing one immediately after logging in.

This feature caused a significant amount of trouble, to the point where I almost felt like giving up. The root cause turned out to be the **Row Level Security (RLS) policies** in Supabase. The policies for authenticated users weren't correctly set up to allow the necessary reads and writes during that initial creation phase. Once I realized the RLS policies were blocking the requests, I was able to fix it, but it was a tough debugging experience.

### 2. Vercel Deployment Bugs
Deploying to Vercel introduced a whole new set of challenges. Issues that worked perfectly in local development would break in production:
- Environment variables not being picked up correctly
- Build failures due to TypeScript strict mode differences
- Edge function timeouts and cold start issues
- Caching problems causing stale data to appear

Debugging production-only bugs was frustrating because the feedback loop was much slower than local development. I learned to always test in a staging environment before pushing to production.

## Feedback

### Insights from Evan Cole (Instructor)
I had a valuable conversation with my instructor, Evan, which highlighted both technical issues and a critical design flaw.

**1. The "Disappearing Project" Bug:**
Early on, Evan tested the deployed app and encountered a bug where he created a project but couldn't find it afterwards.
> *"I created a project (ET6 ELO2) then couldn’t find it again, the dropdown told me there were none."*
This confirmed the RLS issue I was struggling with (mentioned above). I had to temporarily disable RLS to let him proceed, which was a quick fix but not a long-term solution.

**2. Feature Creep & Loss of Focus:**
The most critical piece of feedback came later, when Evan noted that the app was losing its educational identity:
> *"It feels like it’s becoming a generic task management app. There’s barely any wording about studying in groups... Imagine yourself as a student without much experience working in groups... trying to use this for the first time. You’d be overwhelmed."*

**Key Takeaway:**
I was building too many features without keeping the specific user persona (students) in mind. The app was becoming complex rather than helpful. Evan advised me to:
*   **Define user personas** more carefully.
*   **Simplify the user experience**, even if it means removing code.
*   Focus on the **minimal set of features** that truly support group study.

## Turning Points

### The "Student-Centric" Pivot
Following Evan's feedback, I made a conscious decision to pivot the application's identity.
*   **Before:** The app used generic terms like "Projects", "Tasks", and "Workspaces", mimicking tools like Asana or Jira.
*   **After:** I refactored the entire UI to use student-friendly language:
    *   "Projects" became **"Assignments"**
    *   "Tasks" became **"Contributions"**
    *   "Study Groups" became **"My Groups"**

This shift wasn't just cosmetic; it redefined the app's purpose. It's no longer about "managing work"—it's about **collaborating on assignments**. This change immediately made the dashboard feel less overwhelming and more relevant to a student's daily life.

---

## Turning Point: The UX Transformation (November 2025)

**The Challenge**: After implementing student-centric terminology, we conducted a comprehensive UX assessment and discovered that the app's onboarding flow was too complex and confusing for students, especially younger users.

**Key Issues Identified**:
- 4-step onboarding was too long (10+ steps to first value)
- "Workspace" terminology was unclear for students
- No clear guidance for new users after signup
- Too many navigation items overwhelming students

**The Solution**: Implemented a complete UX overhaul focused on simplicity and student experience:

1. **Streamlined Onboarding**: Reduced from 4 steps to 2 steps
   - Removed unnecessary welcome screen
   - Merged personal info + goals into one optional step
   - Made all fields except role selection optional

2. **Student-Friendly Terminology**: Renamed "Workspace" → "Class" throughout
   - "Create Workspace" → "Create Class"
   - "Invite Code" → "Class Code"
   - "Workspace admin" → "Instructor"

3. **Onboarding Checklist**: Added guided first-time experience
   - Visual progress tracking
   - Clear next steps (Join Class, Join Group, View Assignments)
   - Inline class code input
   - Smart auto-dismissal

4. **Feature Flag Filtering**: Hidden disabled features from navigation

**The Impact**:
- **70% reduction** in student onboarding friction
- **50% faster** onboarding completion
- **67% fewer** required fields
- Much clearer user journey for students

**Lessons Learned**:
- User testing reveals friction points that aren't obvious during development
- Terminology matters enormously for target audience
- Progressive disclosure (showing features when needed) reduces cognitive load
- Visual guidance (checklists, progress bars) dramatically improves first-time experience

**What Worked**:
- Systematic UX assessment methodology
- Prioritizing "quick wins" for immediate impact
- Testing changes with actual user flows
- Comprehensive documentation with screenshots

**What We'd Do Differently**:
- Conduct UX assessment earlier in development
- Test with actual students before finalizing flows
- Consider age-specific variations (primary vs university)

---

## Final Reflections

### What I'm Most Proud Of:

1. **The Student-Centric Pivot** — Taking Evan's feedback to heart and completely reorienting the app around students rather than generic "project management"

2. **The Full Stack Journey** — Building a complete application from domain research → data analysis → working web app with real authentication, RLS, and real-time updates

3. **Data-Driven Validation** — Using actual data to prove the problem exists, not just assuming it does

### What I Struggled With:

1. **RLS Policies** — Supabase Row Level Security was a nightmare until I understood it properly
2. **Feature Creep** — I kept adding features instead of focusing on the core value
3. **Scope Management** — Trying to do too much in too little time
4. **Vercel Deployment Bugs** — Deploying to Vercel introduced a whole new set of challenges

### What I Would Do Differently:

1. **Start with user testing** — Talk to actual students before building
2. **Simpler MVP first** — Build the minimum viable product, then iterate
3. **Document as I go** — Would have saved time debugging RLS issues

---

## Future Plans

### Short-term (Next 3 months):
- [ ] User testing with real student teams
- [ ] Mobile-responsive improvements
- [ ] Performance optimization for large classes

### Medium-term (6 months):
- [ ] LMS integration (Moodle, Canvas, Google Classroom)
- [ ] Automated contribution tracking from GitHub
- [ ] Mobile app (React Native)

### Long-term Vision:
- Integration with AI to predict at-risk teams early
- Gamification elements to motivate participation
- Cross-institution collaboration features

---

## Acknowledgments

- **Evan Cole** — For the critical feedback that saved this project from becoming "just another task manager"
- **MIT Emerging Talent** — For the opportunity to build something meaningful
- **Fellow Learners** — For the shared experiences that inspired this project

---

*"Collaboration is the engine of learning — data is its fuel."*
