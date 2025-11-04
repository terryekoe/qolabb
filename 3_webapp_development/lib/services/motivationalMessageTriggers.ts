// =====================================================
// Motivational Message Triggers Service
// Automatically sends motivational messages based on user activity
// =====================================================

import { supabase } from '../supabase'
import { sendMotivationalMessage } from '../db/queries'

interface TriggerContext {
  userId: string
  workspaceId?: string
  teamId?: string
  additionalData?: Record<string, any>
}

/**
 * Check and trigger messages for task completion
 */
export async function checkTaskCompletionTriggers(context: TriggerContext, taskId: string) {
  try {
    // Get task details
    const { data: task } = await supabase
      .from('tasks')
      .select('title, status, due_date, created_at, project:projects!inner(workspace_id, team_id)')
      .eq('id', taskId)
      .single()

    if (!task || task.status !== 'completed') return

    const project = (task as any).project
    const now = new Date()
    const taskCreatedAt = new Date(task.created_at)
    const daysSinceCreation = Math.floor((now.getTime() - taskCreatedAt.getTime()) / (1000 * 60 * 60 * 24))

    // Trigger 1: First task completed this week
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const { count: tasksThisWeek } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', context.userId)
      .eq('status', 'completed')
      .gte('updated_at', weekStart.toISOString())

    if (tasksThisWeek === 1) {
      await sendMotivationalMessage({
        userId: context.userId,
        messageType: 'achievement',
        title: 'First Task Complete! 🎉',
        message: 'Great job completing your first task this week! Keep up the momentum!',
        emoji: '🎉',
        triggerEvent: 'task_completed_first_week',
        priority: 'high',
        workspaceId: project.workspace_id,
        teamId: project.team_id,
        triggerData: { task_id: taskId, task_title: task.title },
      })
    }

    // Trigger 2: Task completed on time (before or on due date)
    if (task.due_date) {
      const dueDate = new Date(task.due_date)
      if (now <= dueDate) {
        await sendMotivationalMessage({
          userId: context.userId,
          messageType: 'achievement',
          title: 'On Time! ✅',
          message: 'Great work completing your task on time. Your reliability helps the whole team!',
          emoji: '✅',
          triggerEvent: 'task_completed_on_time',
          priority: 'medium',
          workspaceId: project.workspace_id,
          teamId: project.team_id,
          triggerData: { task_id: taskId, task_title: task.title },
        })
      }
    }

    // Trigger 3: Check for 3-day streak
    await checkTaskCompletionStreak(context, project.workspace_id, project.team_id)
  } catch (error) {
    console.error('checkTaskCompletionTriggers error:', error)
  }
}

/**
 * Check for task completion streak (3+ days)
 */
async function checkTaskCompletionStreak(
  context: TriggerContext,
  workspaceId?: string,
  teamId?: string
) {
  try {
    const now = new Date()
    const dates = []
    for (let i = 0; i < 3; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    // Check if user completed tasks on each of the last 3 days
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('updated_at')
      .eq('assigned_to', context.userId)
      .eq('status', 'completed')
      .gte('updated_at', dates[2])

    if (!completedTasks || completedTasks.length < 3) return

    const taskDates = new Set(
      completedTasks.map((t) => new Date(t.updated_at).toISOString().split('T')[0])
    )

    // Check if tasks completed on 3 different days
    const hasStreak = dates.every((date) => taskDates.has(date))

    if (hasStreak) {
      await sendMotivationalMessage({
        userId: context.userId,
        messageType: 'achievement',
        title: '3-Day Streak! 🔥',
        message: "You've completed tasks for 3 days in a row! Your consistency is impressive!",
        emoji: '🔥',
        triggerEvent: 'task_completed_streak_3',
        priority: 'high',
        workspaceId,
        teamId,
        triggerData: { streak_days: 3 },
      })
    }
  } catch (error) {
    console.error('checkTaskCompletionStreak error:', error)
  }
}

/**
 * Check and trigger messages for contribution logging
 */
export async function checkContributionTriggers(context: TriggerContext, contributionId: string) {
  try {
    // Get contribution details
    const { data: contribution } = await supabase
      .from('contributions')
      .select('id, created_at, project:projects!inner(workspace_id, team_id)')
      .eq('id', contributionId)
      .single()

    if (!contribution) return

    const project = (contribution as any).project
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))

    // Trigger 1: First contribution ever
    const { count: allContributions } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.userId)

    if (allContributions === 1) {
      await sendMotivationalMessage({
        userId: context.userId,
        messageType: 'encouragement',
        title: 'Getting Started! 🌱',
        message: 'Nice work on logging your first contribution! Every step counts.',
        emoji: '🌱',
        triggerEvent: 'first_contribution',
        priority: 'medium',
        workspaceId: project.workspace_id,
        teamId: project.team_id,
        triggerData: { contribution_id: contributionId },
      })
      return
    }

    // Trigger 2: 5 contributions this week
    const { count: contributionsThisWeek } = await supabase
      .from('contributions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.userId)
      .gte('created_at', weekStart.toISOString())

    if (contributionsThisWeek === 5) {
      await sendMotivationalMessage({
        userId: context.userId,
        messageType: 'achievement',
        title: '5 Contributions Logged! 📊',
        message: "You've logged 5 contributions this week. Your dedication is showing!",
        emoji: '📊',
        triggerEvent: 'contribution_logged_5',
        priority: 'medium',
        workspaceId: project.workspace_id,
        teamId: project.team_id,
        triggerData: { contribution_count: 5 },
      })
    }
  } catch (error) {
    console.error('checkContributionTriggers error:', error)
  }
}

/**
 * Check for low participation and send encouragement
 */
export async function checkParticipationTriggers(context: TriggerContext) {
  try {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

    // Check if user has been inactive for 3+ days
    const { data: recentActivity } = await supabase
      .from('contributions')
      .select('created_at')
      .eq('user_id', context.userId)
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    // Also check tasks
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('updated_at')
      .eq('assigned_to', context.userId)
      .eq('status', 'completed')
      .gte('updated_at', threeDaysAgo.toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)

    // If no activity in last 3 days
    if ((!recentActivity || recentActivity.length === 0) && (!recentTasks || recentTasks.length === 0)) {
      // Check if we already sent this message recently (prevent spam)
      const { data: recentMessages } = await supabase
        .from('motivational_messages')
        .select('sent_at')
        .eq('user_id', context.userId)
        .eq('trigger_event', 'low_participation_3_days')
        .gte('sent_at', threeDaysAgo.toISOString())
        .limit(1)

      if (!recentMessages || recentMessages.length === 0) {
        await sendMotivationalMessage({
          userId: context.userId,
          messageType: 'encouragement',
          title: 'We Miss You! 💙',
          message: "Haven't seen you active lately. Your team could use your input!",
          emoji: '💙',
          triggerEvent: 'low_participation_3_days',
          priority: 'high',
          workspaceId: context.workspaceId,
          teamId: context.teamId,
        })
      }
    }
  } catch (error) {
    console.error('checkParticipationTriggers error:', error)
  }
}

/**
 * Check for first task assignment
 */
export async function checkFirstTaskAssignment(context: TriggerContext, taskId: string) {
  try {
    // Check if this is user's first assigned task
    const { count: totalTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', context.userId)

    if (totalTasks === 1) {
      const { data: task } = await supabase
        .from('tasks')
        .select('title, project:projects!inner(workspace_id, team_id)')
        .eq('id', taskId)
        .single()

      if (task) {
        const project = (task as any).project
        await sendMotivationalMessage({
          userId: context.userId,
          messageType: 'encouragement',
          title: 'New Task! 🚀',
          message: "You've been assigned a new task. You've got this!",
          emoji: '🚀',
          triggerEvent: 'first_task_assigned',
          priority: 'medium',
          workspaceId: project.workspace_id,
          teamId: project.team_id,
          triggerData: { task_id: taskId, task_title: task.title },
        })
      }
    }
  } catch (error) {
    console.error('checkFirstTaskAssignment error:', error)
  }
}

/**
 * Check for active week (activity every day for a week)
 */
export async function checkActiveWeekTrigger(context: TriggerContext) {
  try {
    const now = new Date()
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
    const dates = []

    // Generate dates for the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart)
      date.setDate(date.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }

    // Check contributions for each day
    const { data: contributions } = await supabase
      .from('contributions')
      .select('created_at')
      .eq('user_id', context.userId)
      .gte('created_at', weekStart.toISOString())

    // Check task completions
    const { data: tasks } = await supabase
      .from('tasks')
      .select('updated_at')
      .eq('assigned_to', context.userId)
      .eq('status', 'completed')
      .gte('updated_at', weekStart.toISOString())

    const allActivity = [
      ...(contributions || []).map((c) => new Date(c.created_at).toISOString().split('T')[0]),
      ...(tasks || []).map((t) => new Date(t.updated_at).toISOString().split('T')[0]),
    ]

    const activityDates = new Set(allActivity)

    // Check if activity on all 7 days
    const hasActiveWeek = dates.every((date) => activityDates.has(date))

    if (hasActiveWeek && (contributions?.length || 0) + (tasks?.length || 0) >= 7) {
      // Check if we already sent this message this week
      const { data: recentMessages } = await supabase
        .from('motivational_messages')
        .select('sent_at')
        .eq('user_id', context.userId)
        .eq('trigger_event', 'active_week')
        .gte('sent_at', weekStart.toISOString())
        .limit(1)

      if (!recentMessages || recentMessages.length === 0) {
        await sendMotivationalMessage({
          userId: context.userId,
          messageType: 'consistency',
          title: 'Active Week! 💪',
          message: "You've been active every day this week. Consistency is key to success!",
          emoji: '💪',
          triggerEvent: 'active_week',
          priority: 'medium',
          workspaceId: context.workspaceId,
          teamId: context.teamId,
        })
      }
    }
  } catch (error) {
    console.error('checkActiveWeekTrigger error:', error)
  }
}
