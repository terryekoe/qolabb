'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  const changeColors = {
    positive: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
    negative: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    neutral: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${colorClasses[color]} w-12 h-12 rounded-lg flex items-center justify-center`}>
          <Icon size={24} className="text-white" />
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${changeColors[changeType]}`}>
            {change}
          </span>
        )}
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </motion.div>
  );
};
