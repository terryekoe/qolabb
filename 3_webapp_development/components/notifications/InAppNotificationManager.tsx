'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { InAppNotification } from './InAppNotification';
import { Notification } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';

interface InAppNotificationManagerProps {
  userId?: string;
  onNotificationClick?: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
}

export function InAppNotificationManager({
  userId,
  onNotificationClick,
  onMarkAsRead,
}: InAppNotificationManagerProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

  // Listen for new notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`in-app-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          // Only show unread notifications
          if (!newNotification.read) {
            // Check if this notification should be shown
            // (filter based on type if needed)
            setActiveNotification(newNotification);

            // Add to notifications list
            setNotifications((prev) => {
              // Avoid duplicates
              if (prev.find((n) => n.id === newNotification.id)) {
                return prev;
              }
              return [newNotification, ...prev].slice(0, 10); // Keep last 10
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleClose = useCallback((notificationId: string) => {
    setActiveNotification(null);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  }, []);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      if (onNotificationClick) {
        onNotificationClick(notification);
      }
      handleClose(notification.id);
    },
    [onNotificationClick, handleClose]
  );

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      if (onMarkAsRead) {
        onMarkAsRead(notificationId);
      }
    },
    [onMarkAsRead]
  );

  return (
    <div className="fixed top-20 right-6 z-50 space-y-4">
      <AnimatePresence mode="wait">
        {activeNotification && (
          <div className="pointer-events-auto">
            <InAppNotification
              key={activeNotification.id}
              notification={activeNotification}
              onClose={() => handleClose(activeNotification.id)}
              onMarkAsRead={handleMarkAsRead}
              duration={6000}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
