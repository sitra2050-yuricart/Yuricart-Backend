const { Router } = require("express");
const { getShippingQuote } = require("../../controllers/shippingController");
const { validateBody } = require("../../middleware/validate");
const { quoteShippingSchema } = require("../../validators/shippingValidator");

const router = Router();

router.post("/quote", validateBody(quoteShippingSchema), getShippingQuote);

module.exports = router;
