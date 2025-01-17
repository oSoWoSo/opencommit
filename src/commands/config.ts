import { command } from 'cleye';
import { join as pathJoin, basename } from 'path';
import { parse as iniParse, stringify as iniStringify } from 'ini';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';
import { COMMANDS } from '../CommandsEnum';
import { getI18nLocal } from '../i18n';

export const KNOWN_PROVIDERS = ['openai', 'llama'];

import * as dotenv from 'dotenv'
dotenv.config()

export enum CONFIG_KEYS {
  OPENAI_API_KEY = 'OPENAI_API_KEY',
  LLAMA_LOCATION = 'LLAMA_LOCATION',
  description = 'description',
  emoji = 'emoji',
  language = 'language',
  provider = 'provider'
}

export enum CONFIG_MODES {
  get = 'get',
  set = 'set'
}

const validateConfig = (
  key: string,
  condition: any,
  validationMessage: string
) => {
  if (!condition) {
    outro(
      `${chalk.red('✖')} Unsupported config key ${key}: ${validationMessage}`
    );

    process.exit(1);
  }
};

export const configValidators = {
  [CONFIG_KEYS.OPENCOMMIT_OPENAI_API_KEY](value: any) {
    validateConfig(CONFIG_KEYS.OPENCOMMIT_OPENAI_API_KEY, value, 'Cannot be empty');
    validateConfig(
      CONFIG_KEYS.OPENCOMMIT_OPENAI_API_KEY,
      value.startsWith('sk-'),
      'Must start with "sk-"'
    );
    validateConfig(
      CONFIG_KEYS.OPENCOMMIT_OPENAI_API_KEY,
      value.length === 51,
      'Must be 51 characters long'
    );

    return value;
  },

  [CONFIG_KEYS.LLAMA_LOCATION](value: any) {
    validateConfig(CONFIG_KEYS.LLAMA_LOCATION, value, 'Cannot be empty');
    validateConfig(
      CONFIG_KEYS.LLAMA_LOCATION,
      existsSync(value),
      'Must be a valid path'
    );
    validateConfig(
      CONFIG_KEYS.LLAMA_LOCATION,
      basename(value) === 'main',
      'Must be a valid path to the "llama.cpp/main" file'
    );

    return value;
  },

  [CONFIG_KEYS.description](value: any) {
    validateConfig(
      CONFIG_KEYS.OPENCOMMIT_DESCRIPTION,
      typeof parsedValue === 'boolean',
      'Must be true or false'
    );

    return parsedValue;
  },

  [CONFIG_KEYS.emoji](value: any) {
    validateConfig(
      CONFIG_KEYS.OPENCOMMIT_EMOJI,
      typeof parsedValue === 'boolean',
      'Must be true or false'
    );

    return value;
  },
  [CONFIG_KEYS.gitpush](value: any) {
    validateConfig(
      CONFIG_KEYS.gitpush,
      typeof value === 'boolean',
      'Must be true or false'
    );
    return value;
  },
  [CONFIG_KEYS.language](value: any) {
    validateConfig(
      CONFIG_KEYS.language,
      getI18nLocal(value),
      `${value} is not supported yet`
    );
    return getI18nLocal(value);
  },

  [CONFIG_KEYS.provider](value: any) {
    validateConfig(
      CONFIG_KEYS.provider,
      KNOWN_PROVIDERS.includes(value),
      `${value} is not supported yet`
    );
    return value;
  }
};

export type ConfigType = {
  [key in CONFIG_KEYS]?: any;
};

const configPath = pathJoin(homedir(), '.opencommit');

export const getConfig = (): ConfigType | null => {
  const configExists = existsSync(configPath);

  const configFile = configExists ? readFileSync(configPath, 'utf8') : '';
  const config = configFile? iniParse(configFile) : {};

  for (const configKey in CONFIG_KEYS) {
    const validValue = configValidators[configKey as CONFIG_KEYS](
      config.hasOwnProperty(configKey) ? config[configKey] : process.env[configKey]
    );

    config[configKey] = validValue;
  }

  return config;
};

export const setConfig = (keyValues: [key: string, value: string][]) => {
  const config = getConfig() || {};

  for (const [configKey, configValue] of keyValues) {
    if (!configValidators.hasOwnProperty(configKey)) {
      throw new Error(`Unsupported config key: ${configKey}`);
    }

    let parsedConfigValue;

    try {
      parsedConfigValue = JSON.parse(configValue);
    } catch (error) {
      parsedConfigValue = configValue;
    }

    const validValue =
      configValidators[configKey as CONFIG_KEYS](parsedConfigValue);
    config[configKey as CONFIG_KEYS] = validValue;
  }

  writeFileSync(configPath, iniStringify(config), 'utf8');

  outro(`${chalk.green('✔')} config successfully set`);
};

export const configCommand = command(
  {
    name: COMMANDS.config,
    parameters: ['<mode>', '<key=values...>']
  },
  async (argv) => {
    intro('opencommit — config');
    try {
      const { mode, keyValues } = argv._;

      if (mode === CONFIG_MODES.get) {
        const config = getConfig() || {};
        for (const key of keyValues) {
          outro(`${key}=${config[key as keyof typeof config]}`);
        }
      } else if (mode === CONFIG_MODES.set) {
        await setConfig(
          keyValues.map((keyValue) => keyValue.split('=') as [string, string])
        );
      } else {
        throw new Error(
          `Unsupported mode: ${mode}. Valid modes are: "set" and "get"`
        );
      }
    } catch (error) {
      outro(`${chalk.red('✖')} ${error}`);
      process.exit(1);
    }
  }
);
