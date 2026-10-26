const {
  getSettingsByGroup,
  getPublicWhatsAppNumber,
  upsertSettings,
} = require("../services/settingsService");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await getSettingsByGroup(
    req.query.group,
  );
  sendSuccess(res, settings);
});

const patchAdminSettings = asyncHandler(async (req, res) => {
  const results = await upsertSettings(req.body);
  sendSuccess(res, results);
});

const getPublicStoreSettings = asyncHandler(async (_req, res) => {
  const whatsappNumber = await getPublicWhatsAppNumber();
  sendSuccess(res, { whatsappNumber });
});

module.exports = { getAdminSettings, patchAdminSettings, getPublicStoreSettings };
