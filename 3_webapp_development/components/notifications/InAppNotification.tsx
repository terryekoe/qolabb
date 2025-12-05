'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Bell, Trophy, Sparkles, Star, Zap } from 'lucide-react';
import { Notification } from '@/lib/db/queries';
import { cn } from '@/lib/utils';

interface InAppNotificationProps {
  notification: Notification;
  onClose: () => void;
  onMarkAsRead?: (notificationId: string) => void;
  duration?: number;
}

export function InAppNotification({
  notification,
  onClose,
  onMarkAsRead,
  duration = 5000,
}: InAppNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Auto-close after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    // Progress bar animation
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return Math.max(0, newProgress);
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    handleClose();
  };

  const getNotificationConfig = () => {
    switch (notification.type) {
      case 'task_assignment':
        return {
          icon: Zap,
          gradient: 'from-blue-500 via-blue-600 to-indigo-600',
          glow: 'shadow-blue-500/50',
          emoji: '⚡',
          particles: ['✨', '⭐'],
        };
      case 'task_completed':
        return {
          icon: Trophy,
          gradient: 'from-green-500 via-emerald-600 to-teal-600',
          glow: 'shadow-green-500/50',
          emoji: '🎉',
          particles: ['✨', '🎊', '⭐'],
        };
      case 'project_created':
        return {
          icon: Sparkles,
          gradient: 'from-purple-500 via-pink-600 to-rose-600',
          glow: 'shadow-purple-500/50',
          emoji: '🚀',
          particles: ['✨', '🌟', '💫'],
        };
      case 'project_completed':
        return {
          icon: Trophy,
          gradient: 'from-yellow-500 via-amber-600 to-orange-600',
          glow: 'shadow-yellow-500/50',
          emoji: '🎊',
          particles: ['✨', '🎉', '🏆'],
        };
      case 'milestone_achieved':
        return {
          icon: Star,
          gradient: 'from-amber-500 via-yellow-600 to-orange-600',
          glow: 'shadow-amber-500/50',
          emoji: '🏆',
          particles: ['⭐', '🌟', '💫'],
        };
      case 'team_invitation':
        return {
          icon: Bell,
          gradient: 'from-indigo-500 via-purple-600 to-pink-600',
          glow: 'shadow-indigo-500/50',
          emoji: '👥',
          particles: ['✨', '⭐'],
        };
      default:
        return {
          icon: Bell,
          gradient: 'from-gray-500 via-gray-600 to-gray-700',
          glow: 'shadow-gray-500/50',
          emoji: '🔔',
          particles: ['✨'],
        };
    }
  };

  const config = getNotificationConfig();
  const Icon = config.icon;
  const isAchievement = ['task_completed', 'project_completed', 'milestone_achieved'].includes(
    notification.type
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8, rotateX: -15 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            transition: {
              type: 'spring',
              stiffness: 300,
              damping: 25,
            },
          }}
          exit={{
            opacity: 0,
            y: -20,
            scale: 0.9,
            transition: { duration: 0.2 },
          }}
          onClick={handleClick}
          className={cn('relative cursor-pointer overflow-hidden', 'transform-gpu')}
          style={{ perspective: '1000px' }}
        >
          {/* Main notification card */}
          <div
            className={cn(
              'relative z-10 rounded-2xl shadow-2xl border-2',
              `bg-gradient-to-br ${config.gradient}`,
              `shadow-lg ${config.glow}`,
              'backdrop-blur-sm',
              'min-w-[320px] max-w-[420px]',
              notification.read ? 'opacity-90' : ''
            )}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl" />

            {/* Content */}
            <div className="relative z-10 p-5">
              {/* Header with icon and close */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {/* Animated icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 15,
                      delay: 0.1,
                    }}
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      'bg-white/20 backdrop-blur-md',
                      'border-2 border-white/30',
                      'shadow-lg'
                    )}
                  >
                    <Icon className="text-white" size={24} />
                  </motion.div>

                  <div className="flex-1">
                    <motion.h3
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white font-bold text-lg mb-1 flex items-center gap-2"
                    >
                      {notification.title}
                      {isAchievement && (
                        <motion.span
                          animate={{
                            rotate: [0, 10, -10, 10, 0],
                            scale: [1, 1.2, 1],
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatDelay: 2,
                          }}
                          className="text-2xl"
                        >
                          {config.emoji}
                        </motion.span>
                      )}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90 text-sm leading-relaxed"
                    >
                      {notification.message}
                    </motion.p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                  }}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-white/60 rounded-full"
                  style={{ transition: 'width 0.1s linear' }}
                />
              </div>
            </div>

            {/* Floating particles for achievements */}
            {isAchievement && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {config.particles.map((particle, idx) => (
                  <motion.div
                    key={idx}
                    initial={{
                      opacity: 0,
                      scale: 0,
                      x: '50%',
                      y: '50%',
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                      x: `${50 + (Math.random() - 0.5) * 100}%`,
                      y: `${50 + (Math.random() - 0.5) * 100}%`,
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: idx * 0.3,
                      ease: 'easeOut',
                    }}
                    className="absolute text-2xl"
                  >
                    {particle}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Unread indicator */}
            {!notification.read && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-3 right-12 w-3 h-3 bg-white rounded-full shadow-lg"
              >
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-white rounded-full"
                />
              </motion.div>
            )}
          </div>

          {/* Shine effect */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 3,
              ease: 'easeInOut',
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 z-20 pointer-events-none"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
