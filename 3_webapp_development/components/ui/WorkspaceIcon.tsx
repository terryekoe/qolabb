'use client';

// =====================================================
// Workspace Icon Component
// Auto-generated gradient icons for workspaces/classes
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

// =====================================================
// GRADIENT GENERATION
// =====================================================

/**
 * Generate consistent colors from workspace ID
 */
function generateWorkspaceColors(workspaceId: string): {
  primary: string;
  secondary: string;
  direction: string;
} {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < workspaceId.length; i++) {
    const char = workspaceId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Use hash to pick from curated color pairs (academic/professional feel)
  const colorPairs = [
    { primary: '#1e3a5f', secondary: '#2d5a87' }, // Navy Blue
    { primary: '#2c5364', secondary: '#203a43' }, // Teal
    { primary: '#614385', secondary: '#516395' }, // Purple
    { primary: '#134e5e', secondary: '#71b280' }, // Green Teal
    { primary: '#3a1c71', secondary: '#d76d77' }, // Purple Pink
    { primary: '#0f2027', secondary: '#2c5364' }, // Dark Teal
    { primary: '#373b44', secondary: '#4286f4' }, // Gray Blue
    { primary: '#22c1c3', secondary: '#fdbb2d' }, // Cyan Yellow
    { primary: '#654ea3', secondary: '#eaafc8' }, // Purple Pink
    { primary: '#4568dc', secondary: '#b06ab3' }, // Blue Purple
    { primary: '#1a2980', secondary: '#26d0ce' }, // Navy Cyan
    { primary: '#6dd5ed', secondary: '#2193b0' }, // Light Blue
  ];

  const pairIndex = Math.abs(hash) % colorPairs.length;
  const directions = ['135deg', '150deg', '120deg', '160deg'];
  const directionIndex = Math.abs(hash >> 8) % directions.length;

  return {
    ...colorPairs[pairIndex],
    direction: directions[directionIndex],
  };
}

/**
 * Get contrasting text color
 */
function getTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

// =====================================================
// COMPONENT
// =====================================================

export interface WorkspaceIconProps {
  /** Workspace/Class ID for color generation */
  workspaceId: string;
  /** Workspace/Class name for initial */
  name: string;
  /** Optional custom icon URL */
  iconUrl?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Is this the active/selected workspace? */
  isActive?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Show building icon instead of initial */
  showBuildingIcon?: boolean;
}

const SIZE_CONFIG = {
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    icon: 14,
    ring: 'ring-2',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    icon: 18,
    ring: 'ring-2',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-lg',
    icon: 22,
    ring: 'ring-2',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    icon: 28,
    ring: 'ring-3',
  },
} as const;

export default function WorkspaceIcon({
  workspaceId,
  name,
  iconUrl,
  size = 'md',
  isActive = false,
  className = '',
  onClick,
  showBuildingIcon = false,
}: WorkspaceIconProps) {
  const [imageError, setImageError] = React.useState(false);
  const sizeConfig = SIZE_CONFIG[size];
  
  // Generate colors from workspace ID
  const { primary, secondary, direction } = generateWorkspaceColors(workspaceId);
  const textColor = getTextColor(primary);
  
  // Get first letter of workspace name
  const initial = name?.charAt(0).toUpperCase() || 'W';

  const baseClasses = `
    relative inline-flex items-center justify-center
    ${sizeConfig.container}
    rounded-lg
    font-bold
    ${sizeConfig.text}
    overflow-hidden
    transition-all duration-200
    ${onClick ? 'cursor-pointer hover:scale-105' : ''}
    ${isActive ? `${sizeConfig.ring} ring-blue-500` : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // If custom icon URL provided and not errored, show it
  if (iconUrl && !imageError) {
    return (
      <motion.div
        className={baseClasses}
        whileHover={onClick ? { scale: 1.05 } : undefined}
        whileTap={onClick ? { scale: 0.95 } : undefined}
        onClick={onClick}
      >
        <img
          src={iconUrl}
          alt={`${name} icon`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </motion.div>
    );
  }

  // Show gradient icon with initial or building icon
  return (
    <motion.div
      className={baseClasses}
      style={{
        background: `linear-gradient(${direction}, ${primary}, ${secondary})`,
        color: textColor,
      }}
      whileHover={onClick ? { scale: 1.05 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      onClick={onClick}
    >
      {showBuildingIcon ? (
        <Building2 size={sizeConfig.icon} />
      ) : (
        initial
      )}
    </motion.div>
  );
}

// =====================================================
// WORKSPACE ICON GROUP
// =====================================================

interface WorkspaceIconGroupProps {
  workspaces: Array<{
    id: string;
    name: string;
    icon_url?: string | null;
  }>;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  onWorkspaceClick?: (workspaceId: string) => void;
}

export function WorkspaceIconGroup({
  workspaces,
  max = 4,
  size = 'sm',
  onWorkspaceClick,
}: WorkspaceIconGroupProps) {
  const visible = workspaces.slice(0, max);
  const remaining = Math.max(0, workspaces.length - max);
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className="flex -space-x-2">
      {visible.map((workspace, index) => (
        <div
          key={workspace.id}
          className="ring-2 ring-white rounded-lg"
          style={{ zIndex: visible.length - index }}
        >
          <WorkspaceIcon
            workspaceId={workspace.id}
            name={workspace.name}
            iconUrl={workspace.icon_url}
            size={size}
            onClick={onWorkspaceClick ? () => onWorkspaceClick(workspace.id) : undefined}
          />
        </div>
      ))}
      
      {remaining > 0 && (
        <div
          className={`
            ${sizeConfig.container}
            rounded-lg
            bg-gray-100
            ring-2 ring-white
            flex items-center justify-center
            ${sizeConfig.text}
            font-semibold
            text-gray-600
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
