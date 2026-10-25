import type { SvgDocument } from "../../domain/SvgDocument.js";
import { CommandArguments } from "../CommandArguments.js";
import { EditCommand } from "./EditCommand.js";

export class GroupCommand extends EditCommand {
  protected override edit(document: SvgDocument, values: readonly string[]): readonly string[] {
    const args = new CommandArguments(values, 3, Infinity, "group <newGid> <id1> <id2>...");
    const group = document.group(args.word(0), values.slice(1));
    return [`g#${group.id} created with ${group.children.length} children`];
  }
}
