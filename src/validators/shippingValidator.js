const { z } = require("zod");
const { paginationQuerySchema } = require("./common");

const createShippingSchema = z.object({
  name: z.string().min(1),
  rate: z.coerce.number().min(0),
  // null clears the threshold; z.coerce alone would turn null into 0 (always free)
  freeAbove: z.union([z.null(), z.coerce.number().min(0)]).optional(),
  regions: z.array(z.string().max(120)).max(200).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const quoteShippingSchema = z.object({
  subtotal: z.coerce.number().min(0),
  region: z.string().max(120).optional(),
});

const updateShippingSchema = createShippingSchema.partial();

const adminShippingQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["active", "inactive"]).optional(),
});

module.exports = {
  createShippingSchema,
  updateShippingSchema,
  quoteShippingSchema,
  adminShippingQuerySchema,
};
