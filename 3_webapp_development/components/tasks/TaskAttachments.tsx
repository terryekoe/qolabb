'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image,
  File,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/Button';
import Avatar from '@/components/ui/Avatar';
import { getTaskAttachments, uploadTaskAttachment, addTaskAttachmentLink, deleteTaskAttachment } from '@/lib/db/queries';
import { supabase } from '@/lib/supabase';
import { TaskAttachment } from '@/lib/types/database';
import { cn } from '@/lib/utils';

interface TaskAttachmentsProps {
  taskId: string;
  userId: string;
  canManage: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return Image;
  if (fileType === 'application/pdf') return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId, userId, canManage }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [addMode, setAddMode] = useState<'upload' | 'link'>('upload');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTaskAttachments(taskId);
      setAttachments(data as TaskAttachment[]);
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setError(err.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadAttachments();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`task_attachments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_attachments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          loadAttachments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, loadAttachments]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload images, PDFs, documents, or archives.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`;
    }
    return null;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const validationError = validateFile(file);
        if (validationError) {
          throw new Error(validationError);
        }

        const attachment = await uploadTaskAttachment(taskId, userId, file);
        return attachment;
      });

      await Promise.all(uploadPromises);
      await loadAttachments();
    } catch (err: any) {
      console.error('Error uploading files:', err);
      setError(err.message || 'Failed to upload file(s)');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await deleteTaskAttachment(attachmentId, userId);
      await loadAttachments();
    } catch (err: any) {
      console.error('Error deleting attachment:', err);
      setError(err.message || 'Failed to delete attachment');
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    // Validate URL format
    try {
      new URL(linkUrl.trim());
    } catch {
      setError('Please enter a valid URL (must start with http:// or https://)');
      return;
    }

    setAddingLink(true);
    setError('');

    try {
      console.log('Adding link:', { taskId, userId, url: linkUrl.trim(), name: linkName.trim() });
      const result = await addTaskAttachmentLink(taskId, userId, linkUrl.trim(), linkName.trim() || undefined);
      console.log('Link added successfully:', result);
      setLinkUrl('');
      setLinkName('');
      // Reset to upload mode after successful link addition
      setAddMode('upload');
      await loadAttachments();
    } catch (err: any) {
      console.error('Error adding link:', err);
      setError(err.message || 'Failed to add link. Please check your URL and try again.');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDownload = async (attachment: TaskAttachment) => {
    // If it's an external URL, just open it
    if (attachment.external_url) {
      window.open(attachment.external_url, '_blank');
      return;
    }

    // Otherwise download from storage
    if (!attachment.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      setError('Failed to download file');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!canManage) {
      setError('You do not have permission to upload attachments');
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };

  const canDelete = (attachment: TaskAttachment) => {
    return canManage && (attachment.user_id === userId || canManage);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Paperclip size={16} className="mr-2" />
          Attachments
        </h4>
        {canManage && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setAddMode('upload');
                  if (addMode === 'upload') {
                    fileInputRef.current?.click();
                  }
                }}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  addMode === 'upload'
                    ? 'bg-white text-qolabb-navy-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Upload size={12} className="inline mr-1" />
                Upload
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Link button clicked, setting addMode to link');
                  setAddMode('link');
                }}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded transition-colors',
                  addMode === 'link'
                    ? 'bg-white text-qolabb-navy-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <LinkIcon size={12} className="inline mr-1" />
                Link
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
        accept={ALLOWED_TYPES.join(',')}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Upload Zone / Add Link */}
      {canManage && (
        <>
          {addMode === 'upload' ? (
            <div
              ref={dropZoneRef}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                dragActive
                  ? 'border-qolabb-navy-400 bg-qolabb-navy-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400',
                uploading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    Drag and drop files here, or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-qolabb-navy-600 hover:text-qolabb-navy-800 font-medium"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    Max {formatFileSize(MAX_FILE_SIZE)} per file • Images, PDFs, documents, archives
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    💡 Tip: Use "Link" mode to save Supabase storage space
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-blue-400 rounded-lg p-6 bg-blue-50 border-blue-400 shadow-sm">
              <div className="space-y-4">
                <div className="text-center">
                  <LinkIcon size={28} className="mx-auto text-blue-600 mb-2" />
                  <p className="text-base font-semibold text-gray-900 mb-1">Add a link to external file</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Supports Google Drive, Dropbox, OneDrive, and other cloud storage links
                  </p>
                  <p className="text-xs text-blue-700 mt-2 font-medium bg-blue-100 px-2 py-1 rounded inline-block">
                    💡 Saves Supabase storage space!
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      disabled={addingLink}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={linkName}
                      onChange={(e) => setLinkName(e.target.value)}
                      placeholder="e.g., Project Proposal.pdf"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-qolabb-navy-500 focus:border-transparent"
                      disabled={addingLink}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddLink}
                    disabled={addingLink || !linkUrl.trim()}
                    className="w-full flex items-center justify-center"
                  >
                    {addingLink ? (
                      <>
                        <Loader2 size={14} className="animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <LinkIcon size={14} className="mr-2" />
                        Add Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Attachments List */}
      {loading ? (
        <div className="text-center py-4 text-sm text-gray-500">Loading attachments...</div>
      ) : attachments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <Paperclip size={20} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">No attachments yet</p>
          {canManage && (
            <p className="text-gray-400 text-xs mt-1">
              Upload files by dragging them here or clicking the upload button
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {attachments.map((attachment) => {
              const FileIcon = attachment.external_url ? ExternalLink : getFileIcon(attachment.file_type);
              const isImage = attachment.file_type?.startsWith('image/') && !attachment.external_url && attachment.file_path;
              const isExternalLink = !!attachment.external_url;

              return (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white border border-gray-200 rounded-lg p-3 flex items-center space-x-3 hover:shadow-sm transition-shadow"
                >
                  <div className="flex-shrink-0">
                    {isImage ? (
                      <img
                        src={`${supabase.storage.from('task-attachments').getPublicUrl(attachment.file_path!).data.publicUrl}`}
                        alt={attachment.file_name || 'Attachment'}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className={cn(
                        "w-12 h-12 rounded flex items-center justify-center",
                        isExternalLink ? "bg-blue-100" : "bg-gray-100"
                      )}>
                        <FileIcon size={20} className={isExternalLink ? "text-blue-600" : "text-gray-500"} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file_name || 'External Link'}
                      </p>
                      {isExternalLink && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Link
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      {attachment.file_size && (
                        <>
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>
                        {attachment.user?.full_name || 'Unknown'} •{' '}
                        {new Date(attachment.uploaded_at).toLocaleDateString()}
                      </span>
                    </div>
                    {isExternalLink && attachment.external_url && (
                      <a
                        href={attachment.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 truncate block mt-1"
                      >
                        {attachment.external_url}
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download size={16} className="text-gray-600" />
                    </button>
                    {canDelete(attachment) && (
                      <button
                        onClick={() => handleDelete(attachment.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
