const { Router } = require("express");
const { getPublicStoreSettings } = require("../../controllers/settingsController");

const router = Router();

router.get("/", getPublicStoreSettings);

module.exports = router;
