import { z } from 'zod';

const email = z.string().trim().email({ message: 'Invalid email format' }).transform(v => v.toLowerCase());

export const EmailSchema = z.object({ email });

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, { message: 'Password is required' }),
});

export const RegisterSchema = z.object({
  email,
  full_name: z.string().trim().min(2, { message: 'Full name must have at least 2 characters' }).max(120),
  password: z.string().min(8, { message: 'Password must have at least 8 characters' })
    .regex(/[A-Z]/, 'Password must contain uppercase')
    .regex(/\d/, 'Password must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain a special character'),
  confirmPassword: z.string().optional(),
  verification_code: z.string().regex(/^\d{4}$/, 'Verification code must contain 4 digits'),
}).refine(data => data.confirmPassword === undefined || data.password === data.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

export const UpdateStatusSchema = z.object({ status: z.enum(['online', 'offline', 'away', 'busy']) });
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type EmailInput = z.infer<typeof EmailSchema>;
