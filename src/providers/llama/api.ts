import { intro, outro } from '@clack/prompts';
import { exec } from 'child_process';
import axios from 'axios';
import chalk from 'chalk';

import { CONFIG_MODES, getConfig } from '../../commands/config';

function execSync(command: string): Promise<string | never> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.trim());
    });
  });
}

const config = getConfig();

let launchCommand = config?.LLAMA_LOCATION;

const [command, mode] = process.argv.slice(2);

if (!launchCommand && command !== 'config' && mode !== CONFIG_MODES.set) {
  intro('opencommit');

  outro(
    'OPENAI_API_KEY is not set, please run `oc config set OPENAI_API_KEY=<your token>. Make sure you add payment details, so API works.`'
  );
  outro(
    'For help look into README https://github.com/di-sukharev/opencommit#setup'
  );

  process.exit(1);
}

async function generateCommitMessage(
  messages: Array<string>
): Promise<string | undefined> {
  try {
    return await execSync(`${launchCommand} ${messages.join('\n\n')}}`);
  } catch (error: unknown) {
    outro(`${chalk.red('✖')} ${error}`);
    outro(
      'For help look into README https://github.com/di-sukharev/opencommit#setup'
    );

    process.exit(1);
  }
}

export const getOpenCommitLatestVersion = async (): Promise<
  string | undefined
> => {
  try {
    const { data } = await axios.get(
      'https://unpkg.com/opencommit/package.json'
    );
    return data.version;
  } catch (_) {
    outro('Error while getting the latest version of opencommit');
    return undefined;
  }
};

export const api = {
  generateCommitMessage
};
