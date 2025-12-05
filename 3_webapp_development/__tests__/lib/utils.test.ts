import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('active');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('merges tailwind conflicting classes correctly', () => {
    // This test verifies tailwind-merge behavior
    const result = cn('p-4', 'p-8');
    // tailwind-merge should keep the last conflicting class
    expect(result).toBe('p-8');
  });
});
