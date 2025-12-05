'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import {
  generateAvatarColors,
  generateFallbackColor,
  generateGradientCSS,
  getUserInitials,
  supportsGradients,
  getContrastingTextColor,
  AVATAR_PRESETS,
  type AvatarColorConfig,
} from '@/lib/utils/avatar-colors';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface AvatarProps {
  /** User identifier for color generation */
  userId: string;
  /** Display name for initials */
  name?: string;
  /** Optional image URL (takes precedence over gradient) */
  src?: string | null;
  /** Avatar size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Color generation variant */
  variant?: 'gradient' | 'solid' | 'colorblind';
  /** Custom CSS classes */
  className?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Click handler */
  onClick?: () => void;
  /** Show online status indicator */
  showStatus?: boolean;
  /** Online status */
  isOnline?: boolean;
  /** Custom seed for color generation */
  customSeed?: string;
  /** Disable animations */
  noAnimation?: boolean;
  /** Force square shape instead of circle */
  square?: boolean;
}

// =====================================================
// SIZE CONFIGURATIONS
// =====================================================

const SIZE_CONFIG = {
  xs: {
    container: 'w-6 h-6',
    text: 'text-xs',
    status: 'w-2 h-2 border',
    statusPosition: '-bottom-0 -right-0',
  },
  sm: {
    container: 'w-8 h-8',
    text: 'text-sm',
    status: 'w-2.5 h-2.5 border',
    statusPosition: '-bottom-0.5 -right-0.5',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-base',
    status: 'w-3 h-3 border-2',
    statusPosition: '-bottom-0.5 -right-0.5',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-lg',
    status: 'w-3.5 h-3.5 border-2',
    statusPosition: '-bottom-1 -right-1',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    status: 'w-4 h-4 border-2',
    statusPosition: '-bottom-1 -right-1',
  },
  '2xl': {
    container: 'w-20 h-20',
    text: 'text-2xl',
    status: 'w-5 h-5 border-2',
    statusPosition: '-bottom-1.5 -right-1.5',
  },
} as const;

// =====================================================
// AVATAR COMPONENT
// =====================================================

export default function Avatar({
  userId,
  name = '',
  src,
  size = 'md',
  variant = 'gradient',
  className = '',
  alt,
  onClick,
  showStatus = false,
  isOnline = false,
  customSeed,
  noAnimation = false,
  square = false,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [gradientSupported, setGradientSupported] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check gradient support on mount
  useEffect(() => {
    setGradientSupported(supportsGradients());
    setIsLoaded(true);
  }, []);

  // Generate colors based on configuration
  const colorConfig: AvatarColorConfig = {
    userId,
    size,
    variant,
    customSeed,
  };

  const colors = generateAvatarColors(colorConfig);
  const fallbackColor = generateFallbackColor(userId);
  const initials = getUserInitials(name);

  // Determine background style
  const getBackgroundStyle = (): React.CSSProperties => {
    if (!gradientSupported || variant === 'solid') {
      return { backgroundColor: fallbackColor };
    }

    return {
      background: `linear-gradient(${colors.direction}, ${colors.primary}, ${colors.secondary})`,
    };
  };

  // Get text color for good contrast
  const textColor = getContrastingTextColor(variant === 'solid' ? fallbackColor : colors.primary);

  // Size configuration
  const sizeConfig = SIZE_CONFIG[size];

  // Base classes
  const baseClasses = `
    relative inline-flex items-center justify-center
    ${sizeConfig.container}
    ${square ? 'rounded-lg' : 'rounded-full'}
    overflow-hidden
    font-semibold
    ${sizeConfig.text}
    transition-all duration-200
    ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
    ${className}
  `
    .trim()
    .replace(/\s+/g, ' ');

  // Animation variants
  const animationVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Render content based on available data
  const renderContent = () => {
    // Show image if available and not errored
    if (src && !imageError) {
      return (
        <img
          src={src}
          alt={alt || `${name}'s avatar`}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
      );
    }

    // Show initials with gradient/solid background
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          ...getBackgroundStyle(),
          color: textColor,
        }}
      >
        {initials || <User className="w-1/2 h-1/2" />}
      </div>
    );
  };

  // Render status indicator
  const renderStatusIndicator = () => {
    if (!showStatus) return null;

    return (
      <div
        className={`
          absolute ${sizeConfig.statusPosition}
          ${sizeConfig.status}
          rounded-full
          border-white
          ${isOnline ? 'bg-green-500' : 'bg-gray-400'}
        `}
        aria-label={isOnline ? 'Online' : 'Offline'}
      />
    );
  };

  // Don't render until gradient support is checked (prevents hydration mismatch)
  if (!isLoaded) {
    return (
      <div
        className={`${sizeConfig.container} ${square ? 'rounded-lg' : 'rounded-full'} bg-gray-200 animate-pulse`}
      />
    );
  }

  // Render with or without animation
  if (noAnimation) {
    return (
      <div
        className={baseClasses}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        {renderContent()}
        {renderStatusIndicator()}
      </div>
    );
  }

  return (
    <motion.div
      className={baseClasses}
      variants={animationVariants}
      initial="initial"
      animate="animate"
      whileHover={onClick ? 'hover' : undefined}
      whileTap={onClick ? 'tap' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {renderContent()}
      {renderStatusIndicator()}
    </motion.div>
  );
}

// =====================================================
// AVATAR GROUP COMPONENT
// =====================================================

export interface AvatarGroupProps {
  /** Array of user data for avatars */
  users: Array<{
    userId: string;
    name?: string;
    src?: string | null;
  }>;
  /** Maximum number of avatars to show */
  max?: number;
  /** Avatar size */
  size?: AvatarProps['size'];
  /** Color variant */
  variant?: AvatarProps['variant'];
  /** Custom className */
  className?: string;
  /** Show count of remaining users */
  showCount?: boolean;
  /** Click handler for individual avatars */
  onAvatarClick?: (userId: string) => void;
  /** Click handler for the count indicator */
  onCountClick?: () => void;
}

export function AvatarGroup({
  users,
  max = 4,
  size = 'md',
  variant = 'gradient',
  className = '',
  showCount = true,
  onAvatarClick,
  onCountClick,
}: AvatarGroupProps) {
  const visibleUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className={`flex -space-x-2 ${className}`}>
      {visibleUsers.map((user, index) => (
        <div
          key={user.userId}
          className="ring-2 ring-white rounded-full"
          style={{ zIndex: visibleUsers.length - index }}
        >
          <Avatar
            userId={user.userId}
            name={user.name}
            src={user.src}
            size={size}
            variant={variant}
            onClick={onAvatarClick ? () => onAvatarClick(user.userId) : undefined}
          />
        </div>
      ))}

      {showCount && remainingCount > 0 && (
        <div
          className={`
            ${sizeConfig.container}
            rounded-full
            bg-gray-100
            border-2 border-white
            flex items-center justify-center
            ${sizeConfig.text}
            font-semibold
            text-gray-600
            ${onCountClick ? 'cursor-pointer hover:bg-gray-200' : ''}
          `}
          onClick={onCountClick}
          role={onCountClick ? 'button' : undefined}
          tabIndex={onCountClick ? 0 : undefined}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// =====================================================
// PRESET AVATAR COMPONENTS
// =====================================================

export function GradientAvatar(props: Omit<AvatarProps, 'variant'>) {
  return <Avatar {...props} variant="gradient" />;
}

export function SolidAvatar(props: Omit<AvatarProps, 'variant'>) {
  return <Avatar {...props} variant="solid" />;
}

export function AccessibleAvatar(props: Omit<AvatarProps, 'variant'>) {
  return <Avatar {...props} variant="colorblind" />;
}

// =====================================================
// EXPORTS
// =====================================================

export { AVATAR_PRESETS } from '@/lib/utils/avatar-colors';
