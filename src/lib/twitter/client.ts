import { TwitterApi, TwitterApiReadOnly, TweetV2, UserV2 } from 'twitter-api-v2';
import type { TwitterConfig } from '../../config/env.js';
import type { Tweet, TweetMetrics, TwitterUser, RateLimitInfo, PaginatedResponse, AuthMethod } from './types.js';

export interface TwitterClientOptions {
  config: TwitterConfig;
  authMethod?: AuthMethod;
}

export class TwitterClient {
  private client: TwitterApi;
  private readOnlyClient: TwitterApiReadOnly;
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private authMethod: AuthMethod;

  constructor(options: TwitterClientOptions) {
    const { config, authMethod = 'oauth2-app' } = options;
    this.authMethod = authMethod;

    if (authMethod === 'oauth2-app') {
      this.client = new TwitterApi(config.bearerToken);
    } else if (authMethod === 'oauth1') {
      this.client = new TwitterApi({
        appKey: config.apiKey,
        appSecret: config.apiSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessTokenSecret,
      });
    } else {
      this.client = new TwitterApi(config.bearerToken);
    }

    this.readOnlyClient = this.client.readOnly;
  }

  async verifyCredentials(): Promise<boolean> {
    try {
      if (this.authMethod === 'oauth1') {
        const me = await this.client.v2.me();
        return !!me.data;
      } else {
        const test = await this.readOnlyClient.v2.tweets(['1']);
        return true;
      }
    } catch (error) {
      console.error('Credential verification failed:', error);
      return false;
    }
  }

  async getUser(username: string): Promise<TwitterUser | null> {
    try {
      const response = await this.readOnlyClient.v2.userByUsername(username, {
        'user.fields': [
          'id',
          'name',
          'username',
          'description',
          'profile_image_url',
          'public_metrics',
          'verified',
          'created_at',
        ],
      });

      if (!response.data) return null;

      return this.mapUser(response.data);
    } catch (error) {
      this.handleError(error, 'getUser');
      return null;
    }
  }

  async getUserById(userId: string): Promise<TwitterUser | null> {
    try {
      const response = await this.readOnlyClient.v2.user(userId, {
        'user.fields': [
          'id',
          'name',
          'username',
          'description',
          'profile_image_url',
          'public_metrics',
          'verified',
          'created_at',
        ],
      });

      if (!response.data) return null;

      return this.mapUser(response.data);
    } catch (error) {
      this.handleError(error, 'getUserById');
      return null;
    }
  }

  async getUserTweets(
    userId: string,
    options: {
      maxResults?: number;
      paginationToken?: string;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<PaginatedResponse<Tweet>> {
    try {
      const { maxResults = 100, paginationToken, startTime, endTime } = options;

      const response = await this.readOnlyClient.v2.userTimeline(userId, {
        max_results: maxResults,
        pagination_token: paginationToken,
        start_time: startTime?.toISOString(),
        end_time: endTime?.toISOString(),
        'tweet.fields': [
          'id',
          'text',
          'author_id',
          'created_at',
          'public_metrics',
          'attachments',
          'referenced_tweets',
        ],
        'media.fields': ['type', 'url', 'preview_image_url', 'width', 'height', 'duration_ms'],
        expansions: ['attachments.media_keys', 'referenced_tweets.id'],
      });

      const tweets = response.data?.data || [];
      const mediaMap = new Map(
        response.includes?.media?.map((m) => [m.media_key, m]) || []
      );

      return {
        data: tweets.map((tweet) => this.mapTweet(tweet, mediaMap)),
        meta: {
          nextToken: response.meta?.next_token,
          previousToken: response.meta?.previous_token,
          resultCount: response.meta?.result_count || 0,
        },
      };
    } catch (error) {
      this.handleError(error, 'getUserTweets');
      return { data: [], meta: { resultCount: 0 } };
    }
  }

  async getTweet(tweetId: string): Promise<Tweet | null> {
    try {
      const response = await this.readOnlyClient.v2.singleTweet(tweetId, {
        'tweet.fields': [
          'id',
          'text',
          'author_id',
          'created_at',
          'public_metrics',
          'attachments',
          'referenced_tweets',
        ],
        'media.fields': ['type', 'url', 'preview_image_url', 'width', 'height', 'duration_ms'],
        expansions: ['attachments.media_keys', 'referenced_tweets.id'],
      });

      if (!response.data) return null;

      const mediaMap = new Map(
        response.includes?.media?.map((m) => [m.media_key, m]) || []
      );

      return this.mapTweet(response.data, mediaMap);
    } catch (error) {
      this.handleError(error, 'getTweet');
      return null;
    }
  }

  async searchTweets(
    query: string,
    options: {
      maxResults?: number;
      paginationToken?: string;
    } = {}
  ): Promise<PaginatedResponse<Tweet>> {
    try {
      const { maxResults = 100, paginationToken } = options;

      const response = await this.readOnlyClient.v2.search(query, {
        max_results: maxResults,
        next_token: paginationToken,
        'tweet.fields': [
          'id',
          'text',
          'author_id',
          'created_at',
          'public_metrics',
          'attachments',
          'referenced_tweets',
        ],
        'media.fields': ['type', 'url', 'preview_image_url', 'width', 'height', 'duration_ms'],
        expansions: ['attachments.media_keys', 'referenced_tweets.id'],
      });

      const tweets = response.data?.data || [];
      const mediaMap = new Map(
        response.includes?.media?.map((m) => [m.media_key, m]) || []
      );

      return {
        data: tweets.map((tweet) => this.mapTweet(tweet, mediaMap)),
        meta: {
          nextToken: response.meta?.next_token,
          resultCount: response.meta?.result_count || 0,
        },
      };
    } catch (error) {
      this.handleError(error, 'searchTweets');
      return { data: [], meta: { resultCount: 0 } };
    }
  }

  getRateLimitInfo(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimits.get(endpoint);
  }

  getAllRateLimits(): RateLimitInfo[] {
    return Array.from(this.rateLimits.values());
  }

  private mapTweet(tweet: TweetV2, mediaMap: Map<string, unknown>): Tweet {
    const metrics = tweet.public_metrics as {
      like_count?: number;
      retweet_count?: number;
      reply_count?: number;
      impression_count?: number;
      quote_count?: number;
      bookmark_count?: number;
    } | undefined;

    return {
      id: tweet.id,
      text: tweet.text,
      authorId: tweet.author_id || '',
      createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      metrics: {
        likes: metrics?.like_count || 0,
        retweets: metrics?.retweet_count || 0,
        replies: metrics?.reply_count || 0,
        impressions: metrics?.impression_count || 0,
        quotes: metrics?.quote_count || 0,
        bookmarks: metrics?.bookmark_count || 0,
      },
      referencedTweets: tweet.referenced_tweets?.map((ref) => ({
        type: ref.type as 'replied_to' | 'quoted' | 'retweeted',
        id: ref.id,
      })),
    };
  }

  private mapUser(user: UserV2): TwitterUser {
    const metrics = user.public_metrics || {};

    return {
      id: user.id,
      username: user.username,
      displayName: user.name,
      description: user.description || '',
      profileImageUrl: user.profile_image_url || '',
      followersCount: metrics.followers_count || 0,
      followingCount: metrics.following_count || 0,
      tweetCount: metrics.tweet_count || 0,
      verified: user.verified || false,
      createdAt: user.created_at ? new Date(user.created_at) : new Date(),
    };
  }

  private handleError(error: unknown, context: string): void {
    if (error instanceof Error) {
      console.error(`[TwitterClient.${context}] Error:`, error.message);

      if ('rateLimit' in error) {
        const rateLimitError = error as { rateLimit?: { limit: number; remaining: number; reset: number } };
        if (rateLimitError.rateLimit) {
          this.rateLimits.set(context, {
            endpoint: context,
            limit: rateLimitError.rateLimit.limit,
            remaining: rateLimitError.rateLimit.remaining,
            reset: new Date(rateLimitError.rateLimit.reset * 1000),
          });
        }
      }
    } else {
      console.error(`[TwitterClient.${context}] Unknown error:`, error);
    }
  }
}
