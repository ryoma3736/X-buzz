import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitterClient } from '../../../src/lib/twitter/client.js';
import type { TwitterConfig } from '../../../src/config/env.js';

vi.mock('twitter-api-v2', () => {
  const mockMe = vi.fn().mockResolvedValue({ data: { id: '123', username: 'testuser' } });
  const mockUserByUsername = vi.fn().mockResolvedValue({
    data: {
      id: '123',
      username: 'testuser',
      name: 'Test User',
      description: 'Test description',
      profile_image_url: 'https://example.com/image.jpg',
      public_metrics: {
        followers_count: 1000,
        following_count: 500,
        tweet_count: 100,
      },
      verified: false,
      created_at: '2020-01-01T00:00:00.000Z',
    },
  });
  const mockUserTimeline = vi.fn().mockResolvedValue({
    data: {
      data: [
        {
          id: 'tweet1',
          text: 'Test tweet',
          author_id: '123',
          created_at: '2024-01-01T00:00:00.000Z',
          public_metrics: {
            like_count: 100,
            retweet_count: 50,
            reply_count: 10,
            impression_count: 5000,
            quote_count: 5,
            bookmark_count: 20,
          },
        },
      ],
    },
    meta: {
      result_count: 1,
      next_token: 'next123',
    },
    includes: {
      media: [],
    },
  });
  const mockSingleTweet = vi.fn().mockResolvedValue({
    data: {
      id: 'tweet1',
      text: 'Test tweet',
      author_id: '123',
      created_at: '2024-01-01T00:00:00.000Z',
      public_metrics: {
        like_count: 100,
        retweet_count: 50,
        reply_count: 10,
        impression_count: 5000,
      },
    },
    includes: {
      media: [],
    },
  });
  const mockSearch = vi.fn().mockResolvedValue({
    data: {
      data: [
        {
          id: 'tweet2',
          text: 'Search result tweet',
          author_id: '456',
          created_at: '2024-01-02T00:00:00.000Z',
          public_metrics: {
            like_count: 200,
            retweet_count: 100,
          },
        },
      ],
    },
    meta: {
      result_count: 1,
    },
    includes: {
      media: [],
    },
  });
  const mockTweets = vi.fn().mockResolvedValue({ data: [] });

  return {
    TwitterApi: vi.fn().mockImplementation(() => ({
      v2: {
        me: mockMe,
        userByUsername: mockUserByUsername,
        user: mockUserByUsername,
        userTimeline: mockUserTimeline,
        singleTweet: mockSingleTweet,
        search: mockSearch,
        tweets: mockTweets,
      },
      readOnly: {
        v2: {
          userByUsername: mockUserByUsername,
          user: mockUserByUsername,
          userTimeline: mockUserTimeline,
          singleTweet: mockSingleTweet,
          search: mockSearch,
          tweets: mockTweets,
        },
      },
    })),
  };
});

describe('TwitterClient', () => {
  const mockConfig: TwitterConfig = {
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
    accessToken: 'test-access-token',
    accessTokenSecret: 'test-access-token-secret',
    bearerToken: 'test-bearer-token',
  };

  let client: TwitterClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TwitterClient({ config: mockConfig, authMethod: 'oauth2-app' });
  });

  describe('constructor', () => {
    it('should create client with oauth2-app auth method', () => {
      const appClient = new TwitterClient({ config: mockConfig, authMethod: 'oauth2-app' });
      expect(appClient).toBeDefined();
    });

    it('should create client with oauth1 auth method', () => {
      const oauth1Client = new TwitterClient({ config: mockConfig, authMethod: 'oauth1' });
      expect(oauth1Client).toBeDefined();
    });

    it('should default to oauth2-app auth method', () => {
      const defaultClient = new TwitterClient({ config: mockConfig });
      expect(defaultClient).toBeDefined();
    });
  });

  describe('verifyCredentials', () => {
    it('should return true when credentials are valid', async () => {
      const result = await client.verifyCredentials();
      expect(result).toBe(true);
    });
  });

  describe('getUser', () => {
    it('should return user data for valid username', async () => {
      const user = await client.getUser('testuser');

      expect(user).not.toBeNull();
      expect(user?.username).toBe('testuser');
      expect(user?.displayName).toBe('Test User');
      expect(user?.followersCount).toBe(1000);
    });
  });

  describe('getUserTweets', () => {
    it('should return paginated tweets for user', async () => {
      const result = await client.getUserTweets('123');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('tweet1');
      expect(result.data[0].text).toBe('Test tweet');
      expect(result.data[0].metrics.likes).toBe(100);
      expect(result.meta.nextToken).toBe('next123');
    });

    it('should accept pagination options', async () => {
      const result = await client.getUserTweets('123', {
        maxResults: 50,
        paginationToken: 'token123',
      });

      expect(result.data).toBeDefined();
    });
  });

  describe('getTweet', () => {
    it('should return tweet data for valid id', async () => {
      const tweet = await client.getTweet('tweet1');

      expect(tweet).not.toBeNull();
      expect(tweet?.id).toBe('tweet1');
      expect(tweet?.text).toBe('Test tweet');
    });
  });

  describe('searchTweets', () => {
    it('should return search results', async () => {
      const result = await client.searchTweets('test query');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].text).toBe('Search result tweet');
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return undefined when no rate limit info exists', () => {
      const info = client.getRateLimitInfo('unknown');
      expect(info).toBeUndefined();
    });
  });

  describe('getAllRateLimits', () => {
    it('should return empty array when no rate limits recorded', () => {
      const limits = client.getAllRateLimits();
      expect(limits).toEqual([]);
    });
  });
});
