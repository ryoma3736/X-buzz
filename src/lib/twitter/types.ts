export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  createdAt: Date;
  metrics: TweetMetrics;
  media?: MediaAttachment[];
  referencedTweets?: ReferencedTweet[];
}

export interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  quotes: number;
  bookmarks: number;
}

export interface MediaAttachment {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}

export interface ReferencedTweet {
  type: 'replied_to' | 'quoted' | 'retweeted';
  id: string;
}

export interface TwitterUser {
  id: string;
  username: string;
  displayName: string;
  description: string;
  profileImageUrl: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  verified: boolean;
  createdAt: Date;
}

export interface RateLimitInfo {
  endpoint: string;
  limit: number;
  remaining: number;
  reset: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    nextToken?: string;
    previousToken?: string;
    resultCount: number;
  };
}

export type AuthMethod = 'oauth2-user' | 'oauth2-app' | 'oauth1';
