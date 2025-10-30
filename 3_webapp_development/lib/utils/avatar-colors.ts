/**
 * Avatar Color Generation System
 * 
 * This module provides deterministic color generation for user avatars with:
 * - Consistent gradient combinations based on user identifiers
 * - Accessibility-compliant contrast ratios
 * - Color-blind friendly options
 * - Fallback solid colors for unsupported environments
 * 
 * @author Qolabb Team
 * @version 1.0.0
 */

// =====================================================
// TYPES AND INTERFACES
// =====================================================

export interface ColorHSL {
  h: number; // Hue (0-360)
  s: number; // Saturation (0-100)
  l: number; // Lightness (0-100)
}

export interface ColorRGB {
  r: number; // Red (0-255)
  g: number; // Green (0-255)
  b: number; // Blue (0-255)
}

export interface GradientColors {
  primary: string;   // Primary color (hex)
  secondary: string; // Secondary color (hex)
  direction: string; // CSS gradient direction
}

export interface AvatarColorConfig {
  userId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'gradient' | 'solid' | 'colorblind';
  customSeed?: string;
}

// =====================================================
// CONSTANTS AND CONFIGURATION
// =====================================================

// Base color palette optimized for accessibility and visual appeal
const COLOR_PALETTE: ColorHSL[] = [
  { h: 210, s: 85, l: 55 }, // Blue
  { h: 340, s: 75, l: 60 }, // Pink
  { h: 160, s: 70, l: 50 }, // Green
  { h: 25, s: 80, l: 55 },  // Orange
  { h: 270, s: 75, l: 60 }, // Purple
  { h: 190, s: 70, l: 55 }, // Cyan
  { h: 45, s: 85, l: 60 },  // Yellow
  { h: 320, s: 70, l: 55 }, // Magenta
  { h: 120, s: 75, l: 50 }, // Lime
  { h: 240, s: 80, l: 60 }, // Indigo
  { h: 15, s: 85, l: 55 },  // Red-Orange
  { h: 180, s: 65, l: 55 }, // Teal
];

// Color-blind friendly palette (Deuteranopia/Protanopia safe)
const COLORBLIND_PALETTE: ColorHSL[] = [
  { h: 210, s: 85, l: 55 }, // Blue
  { h: 45, s: 85, l: 60 },  // Yellow
  { h: 270, s: 75, l: 60 }, // Purple
  { h: 25, s: 80, l: 55 },  // Orange
  { h: 190, s: 70, l: 55 }, // Cyan
  { h: 320, s: 70, l: 55 }, // Magenta
];

// Gradient direction options
const GRADIENT_DIRECTIONS = [
  '135deg',  // Diagonal top-left to bottom-right
  '45deg',   // Diagonal bottom-left to top-right
  '90deg',   // Vertical top to bottom
  '180deg',  // Horizontal left to right
  '225deg',  // Diagonal top-right to bottom-left
  '315deg',  // Diagonal bottom-right to top-left
];

// Minimum contrast ratio for accessibility (WCAG AA)
const MIN_CONTRAST_RATIO = 4.5;

// =====================================================
// CORE UTILITY FUNCTIONS
// =====================================================

/**
 * Simple hash function for deterministic color generation
 * Uses djb2 algorithm for consistent results across platforms
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert HSL to RGB color space
 */
function hslToRgb(h: number, s: number, l: number): ColorRGB {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= h && h < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= h && h < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * Convert RGB to hex color string
 */
function rgbToHex(rgb: ColorRGB): string {
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Convert HSL to hex color string
 */
function hslToHex(hsl: ColorHSL): string {
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(rgb);
}

/**
 * Calculate relative luminance for contrast calculations
 */
function getRelativeLuminance(rgb: ColorRGB): number {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1: ColorRGB, color2: ColorRGB): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Adjust color lightness to meet contrast requirements
 */
function adjustForContrast(hsl: ColorHSL, targetContrast: number = MIN_CONTRAST_RATIO): ColorHSL {
  const white = { r: 255, g: 255, b: 255 };
  let adjustedHsl = { ...hsl };
  
  // Try different lightness values to meet contrast requirement
  for (let l = 20; l <= 80; l += 5) {
    adjustedHsl.l = l;
    const rgb = hslToRgb(adjustedHsl.h, adjustedHsl.s, adjustedHsl.l);
    const contrast = getContrastRatio(rgb, white);
    
    if (contrast >= targetContrast) {
      return adjustedHsl;
    }
  }
  
  // If no suitable lightness found, return a safe default
  return { ...hsl, l: 45 };
}

// =====================================================
// MAIN COLOR GENERATION FUNCTIONS
// =====================================================

/**
 * Generate deterministic color pair for gradients
 */
function generateColorPair(seed: string, useColorblindPalette: boolean = false): [ColorHSL, ColorHSL] {
  const palette = useColorblindPalette ? COLORBLIND_PALETTE : COLOR_PALETTE;
  const hash = hashString(seed);
  
  // Select primary color
  const primaryIndex = hash % palette.length;
  const primaryColor = { ...palette[primaryIndex] };
  
  // Select secondary color (ensure it's different from primary)
  const secondaryIndex = (hash + 7) % palette.length;
  let secondaryColor = { ...palette[secondaryIndex] };
  
  // If same color selected, shift to next color
  if (primaryIndex === secondaryIndex) {
    const nextIndex = (secondaryIndex + 1) % palette.length;
    secondaryColor = { ...palette[nextIndex] };
  }
  
  // Add some variation to make colors more unique
  const variation = (hash % 40) - 20; // -20 to +20 variation
  primaryColor.h = (primaryColor.h + variation + 360) % 360;
  secondaryColor.h = (secondaryColor.h - variation + 360) % 360;
  
  // Ensure good contrast
  const adjustedPrimary = adjustForContrast(primaryColor);
  const adjustedSecondary = adjustForContrast(secondaryColor);
  
  return [adjustedPrimary, adjustedSecondary];
}

/**
 * Generate gradient direction based on user seed
 */
function generateGradientDirection(seed: string): string {
  const hash = hashString(seed + 'direction');
  return GRADIENT_DIRECTIONS[hash % GRADIENT_DIRECTIONS.length];
}

/**
 * Main function to generate avatar colors
 */
export function generateAvatarColors(config: AvatarColorConfig): GradientColors {
  const { userId, variant = 'gradient', customSeed } = config;
  const seed = customSeed || userId;
  const useColorblindPalette = variant === 'colorblind';
  
  // Generate color pair
  const [primaryHsl, secondaryHsl] = generateColorPair(seed, useColorblindPalette);
  
  // Convert to hex
  const primary = hslToHex(primaryHsl);
  const secondary = hslToHex(secondaryHsl);
  
  // Generate direction
  const direction = generateGradientDirection(seed);
  
  return {
    primary,
    secondary,
    direction
  };
}

/**
 * Generate solid fallback color for unsupported environments
 */
export function generateFallbackColor(userId: string): string {
  const hash = hashString(userId);
  const colorIndex = hash % COLOR_PALETTE.length;
  const baseColor = COLOR_PALETTE[colorIndex];
  
  // Ensure good contrast for text
  const adjustedColor = adjustForContrast(baseColor);
  return hslToHex(adjustedColor);
}

/**
 * Generate CSS gradient string
 */
export function generateGradientCSS(config: AvatarColorConfig): string {
  const colors = generateAvatarColors(config);
  
  if (config.variant === 'solid') {
    return colors.primary;
  }
  
  return `linear-gradient(${colors.direction}, ${colors.primary}, ${colors.secondary})`;
}

/**
 * Get user initials for avatar text
 */
export function getUserInitials(name: string): string {
  if (!name || name.trim() === '') return 'U';
  
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Validate if browser supports CSS gradients
 */
export function supportsGradients(): boolean {
  if (typeof window === 'undefined') return true; // SSR fallback
  
  const testElement = document.createElement('div');
  testElement.style.background = 'linear-gradient(to right, #000, #fff)';
  return testElement.style.background.includes('gradient');
}

// =====================================================
// ACCESSIBILITY UTILITIES
// =====================================================

/**
 * Check if color combination is accessible
 */
export function isAccessible(primary: string, secondary: string): boolean {
  // Convert hex to RGB
  const hexToRgb = (hex: string): ColorRGB => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };
  
  const primaryRgb = hexToRgb(primary);
  const secondaryRgb = hexToRgb(secondary);
  const contrast = getContrastRatio(primaryRgb, secondaryRgb);
  
  return contrast >= MIN_CONTRAST_RATIO;
}

/**
 * Get text color that contrasts well with background
 */
export function getContrastingTextColor(backgroundColor: string): string {
  const rgb = (() => {
    const r = parseInt(backgroundColor.slice(1, 3), 16);
    const g = parseInt(backgroundColor.slice(3, 5), 16);
    const b = parseInt(backgroundColor.slice(5, 7), 16);
    return { r, g, b };
  })();
  
  const luminance = getRelativeLuminance(rgb);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// =====================================================
// PRESET CONFIGURATIONS
// =====================================================

export const AVATAR_PRESETS = {
  default: { variant: 'gradient' as const },
  accessible: { variant: 'colorblind' as const },
  simple: { variant: 'solid' as const },
} as const;

// =====================================================
// EXPORTS
// =====================================================

export default {
  generateAvatarColors,
  generateFallbackColor,
  generateGradientCSS,
  getUserInitials,
  supportsGradients,
  isAccessible,
  getContrastingTextColor,
  AVATAR_PRESETS
};