// =====================================================
// Form Validation Schemas
// Centralized Zod schemas for all forms
// =====================================================

import { z } from 'zod';

// =====================================================
// AUTH SCHEMAS
// =====================================================

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'instructor']).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// =====================================================
// WORKSPACE/CLASS SCHEMAS
// =====================================================

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Class name must be at least 2 characters')
    .max(100, 'Class name cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  join_code: z
    .string()
    .min(4, 'Join code must be at least 4 characters')
    .max(20, 'Join code cannot exceed 20 characters')
    .regex(/^[a-zA-Z0-9-_]+$/, 'Join code can only contain letters, numbers, hyphens, and underscores')
    .optional(),
});

export const joinWorkspaceSchema = z.object({
  joinCode: z.string().min(1, 'Please enter a join code'),
});

// =====================================================
// PROJECT/ASSIGNMENT SCHEMAS
// =====================================================

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Assignment name is required')
    .max(200, 'Assignment name cannot exceed 200 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  due_date: z.string().optional(),
  team_id: z.string().uuid('Please select a valid group').optional(),
});

// =====================================================
// TEAM/GROUP SCHEMAS
// =====================================================

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Group name must be at least 2 characters')
    .max(50, 'Group name cannot exceed 50 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  avatar_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
  max_members: z.number().min(2).max(20).optional(),
  is_discoverable: z.boolean().optional(),
});

// =====================================================
// TASK SCHEMAS
// =====================================================

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Task title cannot exceed 200 characters'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
  assignee_ids: z.array(z.string().uuid()).optional(),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
});

// =====================================================
// PROFILE SCHEMAS
// =====================================================

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  institution: z.string().max(200).optional(),
  bio: z.string().max(500, 'Bio cannot exceed 500 characters').optional(),
});

// =====================================================
// EVALUATION SCHEMAS
// =====================================================

export const createEvaluationPeriodSchema = z.object({
  name: z.string().min(1, 'Evaluation name is required').max(100),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  team_id: z.string().uuid('Please select a valid group'),
});

export const peerEvaluationSchema = z.object({
  rating: z.number().min(1, 'Rating is required').max(5),
  feedback: z.string().min(10, 'Please provide at least 10 characters of feedback').max(1000),
});

// =====================================================
// SUBMISSION SCHEMAS
// =====================================================

export const projectSubmissionSchema = z.object({
  content: z.string().max(5000, 'Content cannot exceed 5000 characters').optional(),
  resources: z.array(z.object({
    name: z.string(),
    url: z.string().url('Invalid URL'),
    type: z.enum(['file', 'link']),
  })).optional(),
});

// =====================================================
// TYPE EXPORTS
// =====================================================

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;
export type JoinWorkspaceFormData = z.infer<typeof joinWorkspaceSchema>;
export type CreateProjectFormData = z.infer<typeof createProjectSchema>;
export type CreateTeamFormData = z.infer<typeof createTeamSchema>;
export type CreateTaskFormData = z.infer<typeof createTaskSchema>;
export type UpdateTaskFormData = z.infer<typeof updateTaskSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type CreateEvaluationPeriodFormData = z.infer<typeof createEvaluationPeriodSchema>;
export type PeerEvaluationFormData = z.infer<typeof peerEvaluationSchema>;
export type ProjectSubmissionFormData = z.infer<typeof projectSubmissionSchema>;

// =====================================================
// VALIDATION HELPER
// =====================================================

/**
 * Validate form data against a schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  // Convert Zod issues to simple field -> message mapping
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const field = issue.path.join('.');
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  });
  
  return { success: false, errors };
}

/**
 * Get first error message for a field
 */
export function getFieldError(
  errors: Record<string, string> | undefined,
  field: string
): string | undefined {
  return errors?.[field];
}
