'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  FileText,
  FolderKanban,
  Users,
  User,
  Clock,
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useWorkspace } from '@/lib/workspace/WorkspaceContext';
import { globalSearch, SearchResult } from '@/lib/db/queries';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<{
    tasks: SearchResult[];
    projects: SearchResult[];
    teams: SearchResult[];
    members: SearchResult[];
  }>({
    tasks: [],
    projects: [],
    teams: [],
    members: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Get all results in a flat array for navigation
  const allResults = React.useMemo(() => {
    const items: Array<SearchResult & { category: string }> = [];
    if (results.tasks.length > 0) {
      results.tasks.forEach((task) => items.push({ ...task, category: 'Tasks' }));
    }
    if (results.projects.length > 0) {
      results.projects.forEach((project) => items.push({ ...project, category: 'Projects' }));
    }
    if (results.teams.length > 0) {
      results.teams.forEach((team) => items.push({ ...team, category: 'Teams' }));
    }
    if (results.members.length > 0) {
      results.members.forEach((member) => items.push({ ...member, category: 'Members' }));
    }
    return items;
  }, [results]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults({ tasks: [], projects: [], teams: [], members: [] });
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!currentWorkspace || !isOpen) return;

    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setResults({ tasks: [], projects: [], teams: [], members: [] });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await globalSearch(currentWorkspace.id, searchQuery, 5);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults({ tasks: [], projects: [], teams: [], members: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentWorkspace, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allResults[selectedIndex]) {
            handleResultClick(allResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allResults, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current && allResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex, allResults]);

  const handleResultClick = useCallback(
    (result: SearchResult & { category?: string }) => {
      if (result.url) {
        router.push(result.url);
        onClose();
      }
    },
    [router, onClose]
  );

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task':
        return <FileText size={18} className="text-blue-500" />;
      case 'project':
        return <FolderKanban size={18} className="text-purple-500" />;
      case 'team':
        return <Users size={18} className="text-green-500" />;
      case 'member':
        return <User size={18} className="text-orange-500" />;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 size={14} className="text-green-500" />;
      case 'in_progress':
        return <Clock size={14} className="text-blue-500" />;
      case 'todo':
        return <Circle size={14} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const totalResults = allResults.length;

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
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search
                    size={20}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tasks, projects, teams, members..."
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-xs text-gray-500 mt-2 ml-1">
                    {loading ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Searching...
                      </span>
                    ) : (
                      <>
                        {totalResults > 0 ? (
                          <span>
                            {totalResults} result{totalResults !== 1 ? 's' : ''} found
                          </span>
                        ) : searchQuery.length >= 2 ? (
                          <span>No results found</span>
                        ) : (
                          <span>Type at least 2 characters to search</span>
                        )}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Results */}
              {searchQuery.length >= 2 && (
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 size={24} className="animate-spin text-gray-400" />
                    </div>
                  ) : totalResults === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Search size={48} className="mb-4 text-gray-300" />
                      <p className="text-sm font-medium">No results found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  ) : (
                    <div ref={resultsRef} className="divide-y divide-gray-100">
                      {/* Tasks */}
                      {results.tasks.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Tasks ({results.tasks.length})
                            </h3>
                          </div>
                          {results.tasks.map((task, idx) => {
                            const flatIndex = allResults.findIndex(
                              (r) => r.id === task.id && r.type === 'task'
                            );
                            return (
                              <button
                                key={task.id}
                                onClick={() => handleResultClick(task)}
                                className={cn(
                                  'w-full px-4 py-3 flex items-start space-x-3 hover:bg-gray-50 transition-colors text-left',
                                  flatIndex === selectedIndex && 'bg-blue-50'
                                )}
                              >
                                <div className="flex-shrink-0 mt-0.5">{getResultIcon('task')}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {task.title}
                                    </p>
                                    {getStatusIcon(task.metadata?.status)}
                                  </div>
                                  {task.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      {task.description}
                                    </p>
                                  )}
                                  {task.metadata?.projectName && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Project: {task.metadata.projectName}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight
                                  size={16}
                                  className="text-gray-400 flex-shrink-0 mt-1"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Projects */}
                      {results.projects.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Projects ({results.projects.length})
                            </h3>
                          </div>
                          {results.projects.map((project, idx) => {
                            const flatIndex = allResults.findIndex(
                              (r) => r.id === project.id && r.type === 'project'
                            );
                            return (
                              <button
                                key={project.id}
                                onClick={() => handleResultClick(project)}
                                className={cn(
                                  'w-full px-4 py-3 flex items-start space-x-3 hover:bg-gray-50 transition-colors text-left',
                                  flatIndex === selectedIndex && 'bg-blue-50'
                                )}
                              >
                                <div className="flex-shrink-0 mt-0.5">
                                  {getResultIcon('project')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                      {project.title}
                                    </p>
                                    {getStatusIcon(project.metadata?.status)}
                                  </div>
                                  {project.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      {project.description}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight
                                  size={16}
                                  className="text-gray-400 flex-shrink-0 mt-1"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Teams */}
                      {results.teams.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Teams ({results.teams.length})
                            </h3>
                          </div>
                          {results.teams.map((team) => {
                            const flatIndex = allResults.findIndex(
                              (r) => r.id === team.id && r.type === 'team'
                            );
                            return (
                              <button
                                key={team.id}
                                onClick={() => handleResultClick(team)}
                                className={cn(
                                  'w-full px-4 py-3 flex items-start space-x-3 hover:bg-gray-50 transition-colors text-left',
                                  flatIndex === selectedIndex && 'bg-blue-50'
                                )}
                              >
                                <div className="flex-shrink-0 mt-0.5">{getResultIcon('team')}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {team.title}
                                  </p>
                                  {team.description && (
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      {team.description}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight
                                  size={16}
                                  className="text-gray-400 flex-shrink-0 mt-1"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Members */}
                      {results.members.length > 0 && (
                        <div>
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                              Members ({results.members.length})
                            </h3>
                          </div>
                          {results.members.map((member) => {
                            const flatIndex = allResults.findIndex(
                              (r) => r.id === member.id && r.type === 'member'
                            );
                            return (
                              <button
                                key={member.id}
                                onClick={() => handleResultClick(member)}
                                className={cn(
                                  'w-full px-4 py-3 flex items-start space-x-3 hover:bg-gray-50 transition-colors text-left',
                                  flatIndex === selectedIndex && 'bg-blue-50'
                                )}
                              >
                                <div className="flex-shrink-0">
                                  <Avatar
                                    src={member.metadata?.avatarUrl}
                                    name={member.title}
                                    userId={member.id}
                                    size="sm"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {member.title}
                                  </p>
                                  {member.description && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {member.description}
                                    </p>
                                  )}
                                  {member.metadata?.role && (
                                    <p className="text-xs text-gray-400 mt-1 capitalize">
                                      {member.metadata.role}
                                    </p>
                                  )}
                                </div>
                                <ArrowRight
                                  size={16}
                                  className="text-gray-400 flex-shrink-0 mt-1"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              {searchQuery.length >= 2 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                        ↑↓
                      </kbd>
                      Navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                        Enter
                      </kbd>
                      Select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                        Esc
                      </kbd>
                      Close
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs">
                      ⌘K
                    </kbd>
                    Search
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
