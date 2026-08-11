import { z } from 'zod'

export const registrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(255),
  mobile: z
    .string()
    .trim()
    .regex(/^(\+?61|0)4\d{8}$|^\+?\d{8,15}$/, 'Please enter a valid mobile number'),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the auction terms' }),
  }),
  acceptedPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge the privacy notice' }),
  }),
  marketingConsent: z.boolean().default(false),
})
export type RegistrationInput = z.infer<typeof registrationSchema>

export const placeBidSchema = z.object({
  itemId: z.string().uuid(),
  amountCents: z.number().int().positive(),
})
export type PlaceBidInput = z.infer<typeof placeBidSchema>

export const emailCodeRequestSchema = z.object({
  email: z.string().trim().email().max(255),
})
