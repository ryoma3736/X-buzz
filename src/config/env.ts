import { config } from 'dotenv';

config();

export interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken: string;
}

export interface AppConfig {
  twitter: TwitterConfig;
  anthropic: {
    apiKey: string;
  };
  app: {
    environment: 'development' | 'production' | 'test';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? '';
}

export function loadConfig(): AppConfig {
  return {
    twitter: {
      apiKey: getEnvVar('TWITTER_API_KEY'),
      apiSecret: getEnvVar('TWITTER_API_SECRET'),
      accessToken: getEnvVar('TWITTER_ACCESS_TOKEN'),
      accessTokenSecret: getEnvVar('TWITTER_ACCESS_TOKEN_SECRET'),
      bearerToken: getEnvVar('TWITTER_BEARER_TOKEN'),
    },
    anthropic: {
      apiKey: getEnvVar('ANTHROPIC_API_KEY', false),
    },
    app: {
      environment: (process.env.NODE_ENV as AppConfig['app']['environment']) || 'development',
      logLevel: (process.env.LOG_LEVEL as AppConfig['app']['logLevel']) || 'info',
    },
  };
}

export const config$ = loadConfig;
