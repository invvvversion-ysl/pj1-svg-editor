import type { SvgDocument } from "../../domain/SvgDocument.js";
import type { LoadedDocument } from "./LoadedDocument.js";

export interface DocumentRepository {
  load(path: string): Promise<LoadedDocument>;
  save(path: string, document: SvgDocument): Promise<void>;
}
