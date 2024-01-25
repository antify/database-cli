import type { Argv } from 'mri';

const _rDefault = (r: any) => r.default || r;

export const commands = {
  // Migrate down
  status: () => import('./status').then(_rDefault),
  migrate: () => import('./migrate').then(_rDefault),
  'load-fixtures': () => import('./load-fixtures').then(_rDefault),
  'make-fixture': () => import('./make-fixture').then(_rDefault),
  'make-migration': () => import('./make-migration').then(_rDefault),
  'drop-database': () => import('./drop-database').then(_rDefault),
  usage: () => import('./usage').then(_rDefault),
};

export type Command = keyof typeof commands;

export interface DbCommandMeta {
  name: string;
  usage: string;
  description: string;
  [key: string]: any;
}

export type CLIInvokeResult = void | 'error' | 'wait';

export interface DbCommand {
  invoke(args: Argv): Promise<CLIInvokeResult> | CLIInvokeResult;
  meta: DbCommandMeta;
}

export function defineDbCommand(command: DbCommand): DbCommand {
  return command;
}
