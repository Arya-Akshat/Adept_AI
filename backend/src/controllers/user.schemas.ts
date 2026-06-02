import { z } from "zod";

export const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  schoolName: z.string().min(2, "School name must be at least 2 characters"),
  city: z.string().min(1, "City is required"),
  primarySubject: z.string().min(1, "Primary subject is required"),
  classesTeaching: z.array(z.string()).min(1, "At least one class must be selected"),
  schoolBoard: z.string().optional().default(""),
  approximateStudents: z.number().nullable().optional().default(null),
  referralSource: z.string().optional().default(""),
  avatarBase64: z.string().optional().default(""),
});
