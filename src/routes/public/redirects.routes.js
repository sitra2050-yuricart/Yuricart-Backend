const { Router } = require("express");
const { resolve } = require("../../controllers/redirectController");
const { validateQuery } = require("../../middleware/validate");
const { resolveQuerySchema } = require("../../validators/redirectValidator");

const router = Router();

router.get("/resolve", validateQuery(resolveQuerySchema), resolve);

module.exports = router;
