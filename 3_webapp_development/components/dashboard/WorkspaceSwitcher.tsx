'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, Plus, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { useRouter } from 'next/navigation';

interface WorkspaceSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const router = useRouter();

  const handleSwitch = (workspaceId: string) => {
    switchWorkspace(workspaceId);
    onClose();
  };

  const handleCreateNew = () => {
    router.push('/workspace');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed top-20 left-1/2 z-[60] w-full max-w-md px-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Switch Class</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Workspace List */}
              <div className="max-h-96 overflow-y-auto p-2">
                {workspaces.map((wm: any) => {
                  const workspace = wm.workspace;
                  const isActive = currentWorkspace?.id === workspace.id;

                  return (
                    <motion.button
                      key={workspace.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSwitch(workspace.id)}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      {workspace.icon_url ? (
                        <img
                          src={workspace.icon_url}
                          alt={workspace.name}
                          className={`w-10 h-10 rounded-lg object-cover flex-shrink-0 ${
                            isActive ? 'ring-2 ring-blue-600' : ''
                          }`}
                          onError={(e) => {
                            // Fallback to Building2 icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.workspace-icon-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive
                            ? 'bg-blue-600'
                            : 'bg-gradient-to-br from-blue-400 to-qolabb-beige-400'
                        } ${workspace.icon_url ? 'hidden workspace-icon-fallback' : ''}`}
                      >
                        <Building2 className="text-white" size={20} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-gray-900 truncate">{workspace.name}</p>
                        {workspace.description && (
                          <p className="text-sm text-gray-500 truncate">{workspace.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {wm.role === 'owner' ? 'Owner' : wm.role === 'admin' ? 'Admin' : 'Member'}
                        </p>
                      </div>
                      {isActive && (
                        <Check className="text-blue-600 flex-shrink-0" size={20} />
                      )}
                    </motion.button>
                  );
                })}

                {workspaces.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="mx-auto mb-2" size={40} />
                    <p>No classes yet</p>
                  </div>
                )}
              </div>

              {/* Create New Button */}
              <div className="p-3 border-t border-gray-200 bg-gray-50">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreateNew}
                  className="w-full flex items-center justify-center space-x-2 p-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                >
                  <Plus size={20} />
                  <span>Create or Join Class</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
