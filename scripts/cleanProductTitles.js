/**
 * Review and clean product titles (emoji, mixed separators).
 *
 *   node scripts/cleanProductTitles.js           dry run: prints proposed changes
 *   node scripts/cleanProductTitles.js --apply   saves them
 *
 * Slugs are NOT changed, so no links break. Always read the dry run first.
 */
const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { Product } = require("../src/models/Product");
const { cleanProductTitle } = require("../src/utils/titleCleaner");

async function main() {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(env.MONGODB_URI);

  const products = await Product.find().select("title slug").lean();
  const changes = products
    .map((p) => ({ id: p._id, slug: p.slug, before: p.title, after: cleanProductTitle(p.title) }))
    .filter((c) => c.after !== c.before);

  console.log(`${changes.length} of ${products.length} titles would change.\n`);
  for (const c of changes) {
    console.log(`- ${c.before}\n+ ${c.after}\n  (${c.slug})\n`);
  }

  if (apply && changes.length) {
    for (const c of changes) {
      await Product.updateOne({ _id: c.id }, { $set: { title: c.after } });
    }
    console.log(`Saved ${changes.length} titles.`);
  } else if (changes.length) {
    console.log("Dry run only. Re-run with --apply to save.");
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
