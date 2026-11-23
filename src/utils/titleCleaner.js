/**
 * Conservative product title cleanup (PDF: titles start with emoji and mix
 * "|", dashes and other separators). It only removes decoration and unifies
 * separators; it never reorders or rewrites words, so a human can review the
 * dry-run output before anything is saved.
 */
const EMOJI_AND_SYMBOLS =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{20E3}]/gu;

function cleanProductTitle(title) {
  if (typeof title !== "string") return title;

  let out = title.replace(EMOJI_AND_SYMBOLS, " ");

  // " | ", " – ", " — " and " – " style separators become " - ".
  out = out.replace(/\s*[|–—]\s*/g, " - ");

  // Collapse repeats and stray separators at the edges.
  out = out
    .replace(/\s*-\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:,.]+|[\s\-:,.]+$/g, "")
    .trim();

  return out || title.trim();
}

module.exports = { cleanProductTitle };
