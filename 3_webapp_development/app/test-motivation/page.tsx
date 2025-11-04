'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, Clock, Code, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { sendMotivationalMessage, getMotivationalMessages } from '@/lib/db/queries';
import { MotivationalMessageCard } from '@/components/motivation/MotivationalMessageCard';
import type { MotivationalMessage } from '@/lib/db/queries';
import { toast } from 'react-hot-toast';

export default function TestMotivationPage() {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState<MotivationalMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMessages = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getMotivationalMessages(user.id);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadMessages();
  }, [user?.id]);

  const sendTestMessage = async (
    type: MotivationalMessage['message_type'],
    title: string,
    message: string,
    emoji?: string,
    triggerEvent?: string
  ) => {
    if (!user?.id) {
      toast.error('Please log in first');
      return;
    }

    try {
      const messageId = await sendMotivationalMessage({
        userId: user.id,
        messageType: type,
        title,
        message,
        emoji,
        triggerEvent: triggerEvent || `test_${type}`,
        priority: 'medium',
        workspaceId: currentWorkspace?.id,
      });

      if (messageId) {
        toast.success('Message sent successfully!');
        await loadMessages();
      } else {
        toast.error('Message was not sent (may have hit frequency limit)');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to send message');
    }
  };

  const testMessages = [
    {
      type: 'achievement' as const,
      title: 'First Task Complete! 🎉',
      message: 'Great job completing your first task this week! Keep up the momentum!',
      emoji: '🎉',
      trigger: 'task_completed_first_week',
    },
    {
      type: 'achievement' as const,
      title: '3-Day Streak! 🔥',
      message: "You've completed tasks for 3 days in a row! Your consistency is impressive!",
      emoji: '🔥',
      trigger: 'task_completed_streak_3',
    },
    {
      type: 'encouragement' as const,
      title: 'Getting Started! 🌱',
      message: 'Nice work on logging your first contribution! Every step counts.',
      emoji: '🌱',
      trigger: 'first_contribution',
    },
    {
      type: 'achievement' as const,
      title: '5 Contributions Logged! 📊',
      message: "You've logged 5 contributions this week. Your dedication is showing!",
      emoji: '📊',
      trigger: 'contribution_logged_5',
    },
    {
      type: 'encouragement' as const,
      title: 'We Miss You! 💙',
      message: "Haven't seen you active lately. Your team could use your input!",
      emoji: '💙',
      trigger: 'low_participation_3_days',
    },
    {
      type: 'teamwork' as const,
      title: 'Great Team Player! 🤝',
      message: "You've been helping other team members. Your collaboration is appreciated!",
      emoji: '🤝',
      trigger: 'helping_others',
    },
    {
      type: 'consistency' as const,
      title: 'Active Week! 💪',
      message: "You've been active every day this week. Consistency is key to success!",
      emoji: '💪',
      trigger: 'active_week',
    },
    {
      type: 'improvement' as const,
      title: 'On the Rise! 📈',
      message: 'Your participation has improved this week. Keep it up!',
      emoji: '📈',
      trigger: 'participation_increased',
    },
  ];

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-300">
              Please log in to test motivational messages
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Test Motivational Messages
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Send test messages to verify the motivational messages system is working
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={loadMessages}>
              Refresh Messages
            </Button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {messages.length} total messages • {messages.filter((m) => !m.is_read).length} unread
            </span>
          </div>
        </div>

        {/* Test Message Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Send Test Messages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {testMessages.map((testMsg, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  sendTestMessage(
                    testMsg.type,
                    testMsg.title,
                    testMsg.message,
                    testMsg.emoji,
                    testMsg.trigger
                  )
                }
                className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left"
              >
                <div className="text-2xl mb-2">{testMsg.emoji}</div>
                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">
                  {testMsg.title.split(' ')[0]}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {testMsg.type}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Messages Display */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Your Messages ({messages.length})
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="text-gray-300 dark:text-gray-600 mx-auto mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Click a test button above to send a message
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <MotivationalMessageCard
                  key={message.id}
                  message={message}
                  onDismiss={async (id) => {
                    await loadMessages();
                  }}
                  onRead={async (id) => {
                    await loadMessages();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Testing Instructions
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
            <li>Click any test message button to send a message</li>
            <li>Check the banner at the top of the page (should appear if you have unread messages)</li>
            <li>Messages appear in reverse chronological order (newest first)</li>
            <li>Click a message card to mark it as read</li>
            <li>Frequency limits: Similar messages won't be sent more than once per day</li>
            <li>To see real triggers: Complete tasks, log contributions, or wait for inactivity</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
