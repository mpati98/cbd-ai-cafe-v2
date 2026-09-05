import { z } from "zod";

export const orderCreateSchema = z.object({
  customerName: z.string().max(120).trim().optional(),
  customerNote: z.string().max(300).trim().optional(),
  tableCode: z.string().max(20).trim().optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
      })
    )
    .min(1, "Giỏ hàng đang trống.")
    .max(30),
});

export const orderUpdateSchema = z.object({
  isReceived: z.boolean().optional(),
  isPreparing: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  isDelivered: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  adminNote: z.string().max(500).nullable().optional(),
});

export const tableCreateSchema = z.object({
  label: z.string().min(1, "Cần nhập tên bàn.").max(60),
});

export const tableUpdateSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
  regenerateCode: z.boolean().optional(),
});

export const orderChatRequestSchema = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1000) }))
    .max(40)
    .default([]),
  message: z.string().min(1).max(1000),
  tableLabel: z.string().max(80).nullable().optional(),
  tableCode: z.string().max(40).nullable().optional(),
});

export const quizRequestSchema = z.object({
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(1000) }))
    .max(20)
    .default([]),
  message: z.string().min(1).max(500),
  tableCode: z.string().max(40).nullable().optional(),
});
