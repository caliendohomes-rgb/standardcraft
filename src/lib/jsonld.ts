// Serialize an object for embedding in a <script type="application/ld+json">.
// Escapes the characters that could otherwise break out of the script element
// or be misparsed by the HTML tokenizer (`<`, `>`, `&`, and U+2028/U+2029).
// Defense-in-depth: today the input is repo-controlled, but this keeps the sink
// safe if any user-supplied field is ever added to structured data.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
