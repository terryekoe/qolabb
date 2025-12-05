'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Users, TrendingDown, Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';

export interface ParticipationAlert {
  id: string;
  type: 'workload_imbalance' | 'low_participation' | 'overloaded' | 'underutilized';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  affectedUsers: Array<{ id: string; name: string; avatar_url?: string }>;
  recommendations: string[];
  actions?: Array<{ label: string; onClick: () => void }>;
}

interface ParticipationAlertProps {
  alert: ParticipationAlert;
  onDismiss?: (alertId: string) => void;
  onAction?: (alertId: string, action: string) => void;
}

export function ParticipationAlertCard({ alert, onDismiss, onAction }: ParticipationAlertProps) {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = () => {
    switch (alert.type) {
      case 'workload_imbalance':
        return <Users className="text-blue-600" size={20} />;
      case 'low_participation':
        return <TrendingDown className="text-yellow-600" size={20} />;
      case 'overloaded':
        return <AlertTriangle className="text-red-600" size={20} />;
      case 'underutilized':
        return <Lightbulb className="text-blue-600" size={20} />;
      default:
        return <AlertTriangle className="text-gray-600" size={20} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-xl border-2 p-5 ${getSeverityColor()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getSeverityIcon()}
          <div>
            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss alert"
          >
            ×
          </button>
        )}
      </div>

      {/* Affected Users */}
      {alert.affectedUsers.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Affected:</p>
          <div className="flex flex-wrap gap-2">
            {alert.affectedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-1 px-2 py-1 bg-white rounded-lg text-xs"
              >
                <span className="font-medium text-gray-700">{user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations in Plain Language */}
      {alert.recommendations.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">What you can do:</p>
          <ul className="space-y-1">
            {alert.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {alert.actions && alert.actions.length > 0 && (
        <div className="flex items-center space-x-2 pt-3 border-t border-gray-200">
          {alert.actions.map((action, index) => (
            <Button
              key={index}
              variant={index === 0 ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                action.onClick();
                if (onAction) onAction(alert.id, action.label);
              }}
              className="flex items-center space-x-1"
            >
              <span>{action.label}</span>
              <ArrowRight size={14} />
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

interface ParticipationAlertsPanelProps {
  alerts: ParticipationAlert[];
  onDismiss?: (alertId: string) => void;
  onAction?: (alertId: string, action: string) => void;
}

export function ParticipationAlertsPanel({
  alerts,
  onDismiss,
  onAction,
}: ParticipationAlertsPanelProps) {
  if (alerts.length === 0) return null;

  const highPriorityAlerts = alerts.filter((a) => a.severity === 'high');
  const otherAlerts = alerts.filter((a) => a.severity !== 'high');

  return (
    <div className="space-y-4">
      {highPriorityAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center space-x-2">
            <AlertTriangle size={16} />
            <span>Needs Attention</span>
          </h3>
          <div className="space-y-3">
            {highPriorityAlerts.map((alert) => (
              <ParticipationAlertCard
                key={alert.id}
                alert={alert}
                onDismiss={onDismiss}
                onAction={onAction}
              />
            ))}
          </div>
        </div>
      )}

      {otherAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggestions</h3>
          <div className="space-y-3">
            {otherAlerts.map((alert) => (
              <ParticipationAlertCard
                key={alert.id}
                alert={alert}
                onDismiss={onDismiss}
                onAction={onAction}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
