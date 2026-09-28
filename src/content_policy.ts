import { z } from "zod";

export const nonprofitContentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("donor_receipt"),
    donorName: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().length(3),
    campaign: z.string().min(1),
  }),
  z.object({
    kind: z.literal("volunteer_reminder"),
    volunteerName: z.string().min(1),
    shiftStartsAt: z.string().datetime(),
    location: z.string().min(1),
  }),
  z.object({
    kind: z.literal("campaign_report"),
    campaign: z.string().min(1),
    donations: z.number().nonnegative(),
    volunteerHours: z.number().nonnegative(),
    beneficiariesReached: z.number().int().nonnegative(),
  }),
]);

export type NonprofitContent = z.infer<typeof nonprofitContentSchema>;

export type ContentPlan = {
  audience: "donor" | "volunteer" | "board";
  systemInstruction: string;
  facts: Record<string, string | number>;
};

export function planContent(input: NonprofitContent): ContentPlan {
  switch (input.kind) {
    case "donor_receipt":
      return {
        audience: "donor",
        systemInstruction: "Write a warm, concise donation receipt. State every supplied fact exactly and do not invent tax advice.",
        facts: {
          donorName: input.donorName,
          amount: input.amount,
          currency: input.currency.toUpperCase(),
          campaign: input.campaign,
        },
      };
    case "volunteer_reminder":
      return {
        audience: "volunteer",
        systemInstruction: "Write a friendly shift reminder with the supplied start time and location. End with a request to confirm attendance.",
        facts: {
          volunteerName: input.volunteerName,
          shiftStartsAt: input.shiftStartsAt,
          location: input.location,
        },
      };
    case "campaign_report":
      return {
        audience: "board",
        systemInstruction: "Write a factual campaign update for a nonprofit board. Use the supplied metrics and include three short next actions.",
        facts: {
          campaign: input.campaign,
          donations: input.donations,
          volunteerHours: input.volunteerHours,
          beneficiariesReached: input.beneficiariesReached,
        },
      };
  }
}
