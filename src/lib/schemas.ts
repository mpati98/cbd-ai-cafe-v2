import { z } from "zod";

export const heroSlideCreateSchema = z.object({
  order: z.number().int().default(0),
  eyebrow: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  imageId: z.string().nullable().optional(),
});
export const heroSlideUpdateSchema = heroSlideCreateSchema.partial();

export const menuItemCreateSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  priceVnd: z.number().int().nonnegative(),
  isBestSeller: z.boolean().default(false),
  order: z.number().int().default(0),
  imageId: z.string().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});
export const menuItemUpdateSchema = menuItemCreateSchema.partial();

export const roadmapItemCreateSchema = z.object({
  period: z.string().min(1).max(60),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(500),
  order: z.number().int().default(0),
});
export const roadmapItemUpdateSchema = roadmapItemCreateSchema.partial();

export const branchStatusEnum = z.enum(["PLANNING", "SCOUTING", "LEASING", "FIT_OUT", "OPEN"]);

export const branchCreateSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  status: branchStatusEnum.default("PLANNING"),
  etaLabel: z.string().min(1).max(60),
  description: z.string().min(1).max(500),
  order: z.number().int().default(0),
});
export const branchUpdateSchema = branchCreateSchema.partial();

export const idParamSchema = z.object({ id: z.string().min(1) });

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

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

const PERMISSION_KEY_SCHEMA = z.enum(["hero", "menu", "roadmap", "branches", "media", "orders", "tables", "knowledge"]);

export const userCreateSchema = z.object({
  email: z.string().email("Email không hợp lệ.").toLowerCase(),
  name: z.string().min(1, "Cần nhập tên.").max(120),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự."),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
  permissions: z.array(PERMISSION_KEY_SCHEMA).max(10).default([]),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự.").optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  permissions: z.array(PERMISSION_KEY_SCHEMA).max(10).optional(),
});

export const knowledgeTopicCreateSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
  categoryId: z.string().min(1),
  keywords: z.array(z.string().max(30)).max(20).default([]),
});
export const knowledgeTopicUpdateSchema = knowledgeTopicCreateSchema.partial();

export const knowledgeUploadConfirmSchema = z.object({
  topics: z.array(knowledgeTopicCreateSchema).max(50).default([]),
});

export const tableCreateSchema = z.object({
  label: z.string().min(1, "Cần nhập tên bàn.").max(60),
});

export const tableUpdateSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
  regenerateCode: z.boolean().optional(),
});
