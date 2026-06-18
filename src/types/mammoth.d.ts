// mammoth's browser build ships without type declarations.
declare module "mammoth/mammoth.browser.js";
declare module "mammoth/mammoth.browser";
// pdf-parse inner module (avoids the package's debug entrypoint).
declare module "pdf-parse/lib/pdf-parse.js";
