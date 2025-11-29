import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link as LinkIcon, FileText, Loader2, AlertCircle, Upload, CheckSquare } from 'lucide-react';
import { submitProject, uploadProjectFile } from '@/lib/db/queries';
import { ProjectSubmission, ProjectResource } from '@/lib/types/database';
import { toast } from 'react-hot-toast';

interface ProjectSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  userId: string;
  onSubmissionComplete: (submission: ProjectSubmission) => void;
}

export function ProjectSubmissionModal({
  isOpen,
  onClose,
  projectId,
  userId,
  onSubmissionComplete
}: ProjectSubmissionModalProps) {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !file) {
      setError('Please provide a URL or upload a file');
      return;
    }

    if (!confirmed) {
      setError('Please confirm this is the final submission');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      let uploadedFileUrl = '';
      const resources: ProjectResource[] = [];

      // Upload file if present
      if (file) {
        try {
          uploadedFileUrl = await uploadProjectFile(projectId, file);
          resources.push({
            id: crypto.randomUUID(),
            type: 'file',
            name: file.name,
            url: uploadedFileUrl,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            fileType: file.type,
            addedBy: userId,
            addedAt: new Date().toISOString()
          });
        } catch (uploadErr) {
          console.error('File upload failed:', uploadErr);
          throw new Error('Failed to upload file. Please try again.');
        }
      }

      // Add URL resource if present
      if (url.trim()) {
        resources.push({
          id: crypto.randomUUID(),
          type: 'link',
          name: 'Project Link',
          url: url.trim(),
          addedBy: userId,
          addedAt: new Date().toISOString()
        });
      }

      // Content is primarily the notes, but we can include the URL for legacy support
      const finalContent = notes.trim() 
        ? notes.trim()
        : (url.trim() ? `Submission Link: ${url.trim()}` : 'File Submission');

      const submission = await submitProject(projectId, userId, finalContent, resources);
      
      if (submission) {
        onSubmissionComplete(submission);
        toast.success('Project submitted successfully!');
        onClose();
      } else {
        throw new Error('Submission failed');
      }
    } catch (err: any) {
      console.error('Error submitting project:', err);
      setError(err.message || 'Failed to submit project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Submit Project</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Files (Optional)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <FileText size={24} />
                      <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                        Click to upload project files
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        PDF, ZIP, Slides (Max 50MB)
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Project Link (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LinkIcon size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes (Optional)
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText size={18} className="text-gray-400" />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information for the instructor..."
                  rows={4}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all resize-none"
                />
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-gray-100">Final Submission Confirmation</span>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    I certify that this is the final submission on behalf of my team and all requirements have been met.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Project'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
