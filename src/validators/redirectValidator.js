const { z } = require("zod");

const resolveQuerySchema = z.object({
  path: z.string().min(1).max(300),
});

const createRedirectSchema = z.object({
  from: z.string().min(1).max(300),
  to: z.string().min(1).max(300),
  statusCode: z.coerce.number().refine((v) => v === 301 || v === 302).optional(),
});

const updateRedirectSchema = z.object({
  to: z.string().min(1).max(300).optional(),
  statusCode: z.coerce.number().refine((v) => v === 301 || v === 302).optional(),
  active: z.boolean().optional(),
});

module.exports = { resolveQuerySchema, createRedirectSchema, updateRedirectSchema };
