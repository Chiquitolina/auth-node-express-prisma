import { z } from "zod";

export const RegisterSchema = z
  .object({
    email: z.string().email({ message: "Invalid email format" }),
    full_name: z
      .string()
      .min(2, { message: "Full Name must have at least 2 characters" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters long" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Marca el error en el campo `confirmPassword`
  });

// Esquema para el inicio de sesión
export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});

// Esquema para actualizar el estado del usuario
export const UpdateStatusSchema = z.object({
  status: z.enum(["online", "offline", "away", "busy"], {
    message: "Invalid status",
  }),
});

export const EmailSchema = z.object({
  email: z.string().email({ message: "Invalid email format" }),
});

// Tipos generados automáticamente
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type EmailInput = z.infer<typeof EmailSchema>;
