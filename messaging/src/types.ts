import { z } from "zod";

/** Body for POST /send */
export const sendRequestSchema = z
  .object({
    to: z.string().min(1).optional(),
    chat_id: z.string().min(1).optional(),
    text: z.string().min(1),
  })
  .refine((v) => Boolean(v.to) || Boolean(v.chat_id), {
    message: "one of `to` or `chat_id` is required",
  });
export type SendRequest = z.infer<typeof sendRequestSchema>;

/** Body for POST /group */
export const groupRequestSchema = z.object({
  name: z.string().min(1),
  participants: z.array(z.string().min(1)).min(1),
  text: z.string().min(1),
});
export type GroupRequest = z.infer<typeof groupRequestSchema>;

/** Body FirstMinute's backend expects at POST /api/photon/inbound (see docs/SPEC.md). */
export interface InboundMessage {
  sender: string;
  text: string;
  chat_id?: string;
  attachment_url?: string;
  simulated?: boolean;
}
