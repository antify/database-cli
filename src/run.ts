import mri from 'mri';
import type { Command, AntDbCommand } from './cli/commands';
import { commands } from './cli/commands';

export async function runCommand(
  command: string,
  argv = process.argv.slice(2)
) {
  const args = mri(argv);
  args.clear = false; // used by dev
  const cmd = (await commands[command as Command]()) as AntDbCommand;
  if (!cmd) {
    throw new Error(`Invalid command ${command}`);
  }
  await cmd.invoke(args);
}
