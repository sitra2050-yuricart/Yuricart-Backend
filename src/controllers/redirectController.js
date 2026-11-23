const {
  createRedirect,
  deleteRedirect,
  listRedirects,
  resolveRedirect,
  updateRedirect,
} = require("../services/redirectService");
const { NotFoundError } = require("../utils/ApiError");
const { asyncHandler } = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");

const resolve = asyncHandler(async (req, res) => {
  const result = await resolveRedirect(req.query.path);
  if (!result) throw new NotFoundError("No redirect for that path");
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  sendSuccess(res, result);
});

const list = asyncHandler(async (_req, res) => {
  sendSuccess(res, await listRedirects());
});

const create = asyncHandler(async (req, res) => {
  sendSuccess(res, await createRedirect(req.body), 201);
});

const update = asyncHandler(async (req, res) => {
  sendSuccess(res, await updateRedirect(req.params.id, req.body));
});

const remove = asyncHandler(async (req, res) => {
  await deleteRedirect(req.params.id);
  sendSuccess(res, { message: "Redirect deleted" });
});

module.exports = { resolve, list, create, update, remove };
