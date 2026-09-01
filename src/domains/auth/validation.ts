import { z } from "zod";

export const PASSWORD_REQUIREMENTS =
  "Use 12-128 characters with uppercase, lowercase, and a number.";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((email) => email.toLowerCase());

export const passwordSchema = z
  .string()
  .min(12, PASSWORD_REQUIREMENTS)
  .max(128, PASSWORD_REQUIREMENTS)
  .regex(/[a-z]/, PASSWORD_REQUIREMENTS)
  .regex(/[A-Z]/, PASSWORD_REQUIREMENTS)
  .regex(/[0-9]/, PASSWORD_REQUIREMENTS);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  password: passwordSchema,
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
