import type { SvgDocument } from "../../domain/SvgDocument.js";

export interface DocumentPresenter {
  tree(document: SvgDocument, id?: string): readonly string[];
  show(document: SvgDocument, id: string): readonly string[];
}
