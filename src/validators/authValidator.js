const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

const customerRegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(32).max(128),
});

const adminCustomerQuerySchema = paginationQuerySchema.extend({
  q: z.string().optional(),
  status: z.enum(["active", "blocked"]).optional(),
});

const updateCustomerStatusSchema = z.object({
  status: z.enum(["active", "blocked"]),
});

module.exports = {
  customerRegisterSchema,
  customerLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  adminCustomerQuerySchema,
  updateCustomerStatusSchema,
};
