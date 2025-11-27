import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load config with all required variables', async () => {
    process.env.TWITTER_API_KEY = 'test-api-key';
    process.env.TWITTER_API_SECRET = 'test-api-secret';
    process.env.TWITTER_ACCESS_TOKEN = 'test-access-token';
    process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.TWITTER_BEARER_TOKEN = 'test-bearer-token';
    process.env.NODE_ENV = 'test';

    const { loadConfig } = await import('../../src/config/env.js');
    const config = loadConfig();

    expect(config.twitter.apiKey).toBe('test-api-key');
    expect(config.twitter.apiSecret).toBe('test-api-secret');
    expect(config.twitter.accessToken).toBe('test-access-token');
    expect(config.twitter.accessTokenSecret).toBe('test-access-token-secret');
    expect(config.twitter.bearerToken).toBe('test-bearer-token');
    expect(config.app.environment).toBe('test');
  });

  it('should throw error for missing required variables', async () => {
    delete process.env.TWITTER_API_KEY;
    delete process.env.TWITTER_API_SECRET;
    delete process.env.TWITTER_ACCESS_TOKEN;
    delete process.env.TWITTER_ACCESS_TOKEN_SECRET;
    delete process.env.TWITTER_BEARER_TOKEN;

    const { loadConfig } = await import('../../src/config/env.js');

    expect(() => loadConfig()).toThrow('Missing required environment variable');
  });

  it('should use default values for optional variables', async () => {
    process.env.TWITTER_API_KEY = 'test-api-key';
    process.env.TWITTER_API_SECRET = 'test-api-secret';
    process.env.TWITTER_ACCESS_TOKEN = 'test-access-token';
    process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.TWITTER_BEARER_TOKEN = 'test-bearer-token';
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;

    const { loadConfig } = await import('../../src/config/env.js');
    const config = loadConfig();

    expect(config.app.environment).toBe('development');
    expect(config.app.logLevel).toBe('info');
  });

  it('should allow empty anthropic api key', async () => {
    process.env.TWITTER_API_KEY = 'test-api-key';
    process.env.TWITTER_API_SECRET = 'test-api-secret';
    process.env.TWITTER_ACCESS_TOKEN = 'test-access-token';
    process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test-access-token-secret';
    process.env.TWITTER_BEARER_TOKEN = 'test-bearer-token';
    delete process.env.ANTHROPIC_API_KEY;

    const { loadConfig } = await import('../../src/config/env.js');
    const config = loadConfig();

    expect(config.anthropic.apiKey).toBe('');
  });
});
