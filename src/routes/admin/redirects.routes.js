const { Router } = require("express");
const { create, list, remove, update } = require("../../controllers/redirectController");
const { authenticate, requireAdmin } = require("../../middleware/auth");
const { validateBody, validateParams } = require("../../middleware/validate");
const { idParamSchema } = require("../../validators/common");
const {
  createRedirectSchema,
  updateRedirectSchema,
} = require("../../validators/redirectValidator");

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", list);
router.post("/", validateBody(createRedirectSchema), create);
router.patch("/:id", validateParams(idParamSchema), validateBody(updateRedirectSchema), update);
router.delete("/:id", validateParams(idParamSchema), remove);

module.exports = router;
