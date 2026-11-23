/**
 * Runs every test/*.test.js file with Node's built-in test runner.
 * Used by `npm test` so the script points at a real file (the malware scan
 * only allows npm scripts that run existing .js files).
 */
const fs = require("node:fs");
const path = require("node:path");
const { run } = require("node:test");
const { spec } = require("node:test/reporters");

const dir = path.join(__dirname, "..", "test");
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => path.join(dir, name));

run({ files })
  .on("test:fail", () => {
    process.exitCode = 1;
  })
  .compose(spec)
  .pipe(process.stdout);
