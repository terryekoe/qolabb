import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Link as LinkIcon, Download, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface GradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  teamData: any;
  onGradingComplete: () => void;
}

export function GradingPanel({ isOpen, onClose, teamData, onGradingComplete }: GradingPanelProps) {
  const { team, submission } = teamData;
  const [grade, setGrade] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (submission) {
      setGrade(submission.grade?.toString() || '');
      setFeedback(submission.feedback || '');
    } else {
      setGrade('');
      setFeedback('');
    }
  }, [submission]);

  const handleSave = async () => {
    if (!submission) {
      toast.error('No submission to grade');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('project_submissions')
        .update({
          grade: parseFloat(grade),
          feedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
          // graded_by: user.id // Handled by RLS or trigger if needed, but we can pass it if we have context
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast.success('Grade saved successfully');
      onGradingComplete();
    } catch (error: any) {
      console.error('Error saving grade:', error);
      toast.error('Failed to save grade');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-full max-w-2xl bg-white dark:bg-gray-800 h-full shadow-2xl overflow-y-auto"
        >
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Grading: {team.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {submission ? `Submitted on ${new Date(submission.submitted_at).toLocaleDateString()}` : 'No submission yet'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            {/* Submission Content */}
            {!submission ? (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800 text-center">
                <p className="text-orange-800 dark:text-orange-300">
                  This team has not submitted their project yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Notes & Contribution Report */}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                    <FileText size={18} className="mr-2 text-blue-500" />
                    Submission Notes & Report
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300 max-h-60 overflow-y-auto">
                    {submission.content || 'No notes provided.'}
                  </div>
                </div>

                {/* Attachments */}
                {submission.resources && submission.resources.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                      <LinkIcon size={18} className="mr-2 text-blue-500" />
                      Attachments
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {submission.resources.map((resource: any) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 transition-colors group"
                        >
                          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg mr-3">
                            {resource.type === 'link' ? <LinkIcon size={16} className="text-blue-600" /> : <FileText size={16} className="text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{resource.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{resource.type === 'file' ? resource.size : 'External Link'}</p>
                          </div>
                          <Download size={16} className="text-gray-400 group-hover:text-blue-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <hr className="border-gray-200 dark:border-gray-700" />

                {/* Grading Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Grade (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter score..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Feedback
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                      placeholder="Provide constructive feedback..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50 sticky bottom-0">
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSave} 
                disabled={saving || !submission}
                className="flex items-center"
              >
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                Save Grade
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
