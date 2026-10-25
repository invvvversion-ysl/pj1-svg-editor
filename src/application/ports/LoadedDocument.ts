import type { SvgDocument } from "../../domain/SvgDocument.js";

export interface LoadedDocument {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}
