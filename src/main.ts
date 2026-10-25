import { HelpCommand } from "./application/commands/HelpCommand.js";
import { CommandRegistry } from "./cli/CommandRegistry.js";
import { Repl } from "./cli/Repl.js";
import { HelpText } from "./presentation/HelpText.js";

const registry = new CommandRegistry();
registry.register("help", new HelpCommand(new HelpText().lines()));

await new Repl(registry).run();
