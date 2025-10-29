import { z } from 'zod';

// User schemas
export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  role: z.enum(['student', 'instructor', 'both']).default('student'),
  institution: z.string().max(200, 'Institution name too long').optional(),
  avatar_url: z.string().url('Invalid URL').optional(),
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
});

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Workspace schemas
export const workspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
});

export const inviteCodeSchema = z.object({
  invite_code: z.string().length(6, 'Invite code must be 6 characters').regex(/^[A-Z0-9]+$/, 'Invalid invite code format'),
});

// Team schemas
export const teamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  avatar_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').default('#334e68'),
});

// Project schemas
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  due_date: z.string().datetime().optional(),
  status: z.enum(['pending', 'active', 'completed', 'archived']).default('pending'),
});

// Task schemas
export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().datetime().optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  status: z.enum(['todo', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().datetime().optional(),
  assigned_to: z.string().uuid('Invalid user ID').optional(),
});

// Contribution schemas
export const contributionSchema = z.object({
  title: z.string().min(1, 'Contribution title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  contribution_type: z.enum(['code', 'documentation', 'research', 'design', 'meeting', 'other']),
  hours_spent: z.number().min(0, 'Hours must be positive').max(24, 'Hours per day cannot exceed 24').optional(),
  task_id: z.string().uuid('Invalid task ID').optional(),
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(firstError.message);
    }
    throw error;
  }
}

export function safeValidateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: 'Validation failed' };
  }
}