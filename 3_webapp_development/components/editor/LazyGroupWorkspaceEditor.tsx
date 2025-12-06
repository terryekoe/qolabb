'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

interface GroupWorkspaceEditorProps {
  projectId: string;
  initialContent?: any;
  isReadOnly?: boolean;
}

// Lazy load the GroupWorkspaceEditor to reduce initial bundle size (~500KB TipTap)
const GroupWorkspaceEditor = dynamic(
  () => import('./GroupWorkspaceEditor').then((mod) => ({ default: mod.GroupWorkspaceEditor })),
  {
    loading: () => (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading editor...</p>
        </div>
      </div>
    ),
    ssr: false, // TipTap doesn't work well with SSR
  }
);

export { GroupWorkspaceEditor };
export type { GroupWorkspaceEditorProps };
