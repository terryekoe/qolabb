# Peer Evaluation System - Testing Guide

## ✅ Prerequisites

1. **Run the database migration** in Supabase:
   - Go to Supabase Dashboard → SQL Editor
   - Run the migration file: `supabase/migrations/046_add_peer_evaluation_system.sql`
   - Verify tables were created: `evaluation_periods`, `peer_evaluations`, `evaluation_responses`

2. **Ensure you have**:
   - A workspace with teams
   - At least one team with multiple members
   - A user account that is a team leader (to create evaluation periods)

---

## 🧪 Testing Steps

### Test 1: Create Evaluation Period (Team Leader)

1. **Log in as a team leader** (or instructor/admin)
2. **Navigate to Evaluations page**: `/evaluations`
3. **Click "Create Evaluation Period"** button (should appear in header)
4. **Fill out the form**:
   - Period Name: "Week 1 Evaluation" or "Test Evaluation"
   - Period Type: Select "Weekly" (or any type)
   - Start Date: Today's date
   - End Date: 7 days from now
   - Due Date: 7 days from now (or later)
   - Check "Keep evaluations anonymous" if desired
5. **Click "Create Evaluation Period"**
6. **Expected Result**:
   - ✅ Success toast notification
   - Evaluation period created
   - All team members should now have pending evaluations

---

### Test 2: View Pending Evaluations (Team Member)

1. **Log in as a regular team member** (not the leader)
2. **Navigate to Evaluations page**: `/evaluations`
3. **Check the page**:
   - Should see "Pending Evaluations" section
   - Should see cards for each team member they need to evaluate
   - Each card shows:
     - Team member's name and avatar
     - Period name
     - Due date
     - Status (Pending/Due Soon/Overdue)

---

### Test 3: Submit an Evaluation

1. **Click on a pending evaluation card**
2. **Fill out the evaluation form**:
   - **Star Ratings** (Required - 1-5 stars):
     - Contribution to Team
     - Communication
     - Collaboration
     - Reliability
   - **Strengths** (Optional): Text area
   - **Areas for Improvement** (Optional): Text area
   - **Additional Comments** (Optional): Text area
3. **Click "Submit Evaluation"**
4. **Expected Result**:
   - ✅ Success toast notification
   - Modal closes
   - Evaluation card disappears from pending list
   - Stats update (pending count decreases)

---

### Test 4: View Evaluation Results

1. **After someone evaluates you**, navigate to Evaluations page
2. **Scroll down to "My Evaluation Results"** section
3. **Check the results**:
   - Should show average scores for each category:
     - Contribution
     - Communication
     - Collaboration
     - Reliability
   - Overall average score
   - Total number of evaluations received
   - Scores should match what was submitted

---

### Test 5: Multiple Evaluations

1. **Create multiple evaluation periods** (as team leader)
2. **Submit evaluations in each period** (as team members)
3. **Verify**:
   - Each period shows separate pending evaluations
   - Results aggregate correctly across periods
   - Average scores calculate properly

---

## 🔍 Verification Checklist

### ✅ Database
- [ ] `evaluation_periods` table exists
- [ ] `peer_evaluations` table exists
- [ ] `evaluation_responses` table exists
- [ ] RLS policies are active
- [ ] Helper function `create_evaluation_period_with_responses` exists

### ✅ UI Components
- [ ] Evaluation page loads without errors
- [ ] "Create Evaluation Period" button appears for team leaders
- [ ] Pending evaluations display correctly
- [ ] Evaluation form opens when clicking a card
- [ ] Star ratings work (clickable 1-5 stars)
- [ ] Form submission works
- [ ] Results display with correct averages

### ✅ Functionality
- [ ] Team leaders can create periods
- [ ] Team members see pending evaluations
- [ ] Evaluations can be submitted
- [ ] Results aggregate correctly
- [ ] Anonymous evaluations hide evaluator names
- [ ] Due dates display correctly
- [ ] Overdue evaluations show warning

---

## 🐛 Common Issues & Solutions

### "Create Evaluation Period" button not showing
- **Cause**: User is not a team leader or instructor
- **Solution**: Check user's role in team or workspace

### No pending evaluations showing
- **Cause**: No evaluation periods created yet, or all are submitted
- **Solution**: Create an evaluation period as team leader

### Error: "Could not find relationship"
- **Cause**: Migration not run, or database schema issue
- **Solution**: Run migration `046_add_peer_evaluation_system.sql`

### Evaluation form not submitting
- **Cause**: Missing required ratings (all 4 categories need 1-5 stars)
- **Solution**: Ensure all star ratings are selected

### Results showing 0 scores
- **Cause**: No evaluations submitted yet, or user hasn't been evaluated
- **Solution**: Have team members submit evaluations for you

---

## 📊 Expected Test Results

After completing all tests, you should have:
- ✅ Multiple evaluation periods created
- ✅ Multiple evaluations submitted
- ✅ Results showing aggregated scores
- ✅ Pending evaluations decreasing as they're completed
- ✅ Average scores calculating correctly
- ✅ No console errors

---

## 🎯 Quick Test Scenario

1. **As Team Leader**:
   - Create evaluation period "Week 1 Test"
   - Set due date: 7 days from now

2. **As Team Member A**:
   - Log in
   - See pending evaluations for other team members
   - Submit evaluation for Team Member B

3. **As Team Member B**:
   - Log in
   - Check "My Evaluation Results"
   - Should see average scores from Team Member A's evaluation

4. **Verify**:
   - ✅ All features work
   - ✅ Scores are correct
   - ✅ No errors in console

---

## 📝 Notes

- Evaluations are anonymous by default (configurable when creating period)
- Each team member must evaluate all other team members
- Self-evaluation is disabled by default
- Results aggregate across all evaluation periods
- Due dates trigger overdue warnings
