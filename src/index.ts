/**
 * X-buzz - X AI Generator
 *
 * Autonomous development powered by Miyabi framework
 * Generates viral tweets using AI-powered persona analysis
 */

import { loadConfig } from './config/env.js';
import { TwitterClient } from './lib/twitter/index.js';

export function hello(): string {
  return 'Hello from X-buzz!';
}

export async function main(): Promise<void> {
  console.log('🚀 X-buzz - X AI Generator');
  console.log('==========================\n');

  try {
    const config = loadConfig();
    console.log('✅ Configuration loaded');

    const twitterClient = new TwitterClient({
      config: config.twitter,
      authMethod: 'oauth2-app',
    });

    console.log('📡 Verifying Twitter API credentials...');
    const isValid = await twitterClient.verifyCredentials();

    if (isValid) {
      console.log('✅ Twitter API connection successful!');
    } else {
      console.log('❌ Twitter API connection failed. Please check your credentials.');
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
}

// Run main if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
