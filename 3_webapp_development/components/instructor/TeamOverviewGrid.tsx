import React from 'react';
import { CheckCircle2, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/Button';
import Avatar, { AvatarGroup } from '@/components/ui/Avatar';

interface TeamOverviewGridProps {
  teams: any[];
  loading: boolean;
  onGrade: (team: any) => void;
  onViewTasks: (team: any) => void;
}

export function TeamOverviewGrid({ teams, loading, onGrade, onViewTasks }: TeamOverviewGridProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">No teams found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm">
          <tr>
            <th className="px-6 py-4 font-medium">Team</th>
            <th className="px-6 py-4 font-medium">Members</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Submitted On</th>
            <th className="px-6 py-4 font-medium">Grade</th>
            <th className="px-6 py-4 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {teams.map((item) => {
            const { team, submission } = item;
            const status = submission?.status || 'pending';
            
            return (
              <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{team.name}</span>
                </td>
                <td className="px-6 py-4">
                  <AvatarGroup
                    users={team.members?.map((m: any) => ({
                      userId: m.user.id,
                      name: m.user.full_name,
                      src: m.user.avatar_url
                    })) || []}
                    max={3}
                    size="sm"
                  />
                </td>
                <td className="px-6 py-4">
                  {status === 'submitted' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle2 size={12} className="mr-1" /> Submitted
                    </span>
                  )}
                  {status === 'graded' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      <CheckCircle2 size={12} className="mr-1" /> Graded
                    </span>
                  )}
                  {status === 'pending' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                      <Clock size={12} className="mr-1" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {submission?.submitted_at 
                    ? new Date(submission.submitted_at).toLocaleDateString() 
                    : '-'}
                </td>
                <td className="px-6 py-4">
                  {submission?.grade !== null && submission?.grade !== undefined ? (
                    <span className="font-bold text-gray-900 dark:text-gray-100">{submission.grade}%</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewTasks(item)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      View Tasks
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onGrade(item)}
                      className="inline-flex items-center"
                    >
                      {status === 'graded' ? 'Edit Grade' : 'Grade'} <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
