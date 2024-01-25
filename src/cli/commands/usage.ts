import { cyan } from 'colorette';
import { showHelp } from '../utils/help';
import { commands, defineAntDbCommand } from './index';

export default defineAntDbCommand({
  meta: {
    name: 'help',
    usage: 'db help',
    description: 'Show help',
  },
  invoke(_args) {
    const sections: string[] = [];

    sections.push(
      `Usage: ${cyan(`npx db ${Object.keys(commands).join('|')} [args]`)}`
    );

    console.log(sections.join('\n\n') + '\n');

    // Reuse the same wording as in `-h` commands
    showHelp({});
  },
});
