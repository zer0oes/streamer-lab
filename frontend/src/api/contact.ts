import { apiPost } from "./client";

export interface ContactInput {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  subject: string;
  message: string;
}

export function sendContactMessage(input: ContactInput): Promise<{ id: string; createdAt: number }> {
  return apiPost("/api/contact", input);
}
