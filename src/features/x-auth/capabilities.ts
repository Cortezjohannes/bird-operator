import type { XCapability, XAuthMethod } from "@/src/features/x-auth/types";

export const capabilityOrder: XCapability[] = [
  "read_user",
  "read_timeline",
  "read_mentions",
  "post_tweet",
  "reply_tweet",
  "quote_tweet",
  "like_tweet",
  "repost_tweet",
  "bookmark_tweet",
  "follow_user",
  "unfollow_user",
  "update_profile_text",
  "update_profile_media",
  "analytics_read",
];

export const capabilityLabels: Record<XCapability, string> = {
  read_user: "Read user profile",
  read_timeline: "Read timeline",
  read_mentions: "Read mentions",
  post_tweet: "Post tweet",
  reply_tweet: "Reply to tweet",
  quote_tweet: "Quote tweet",
  like_tweet: "Like tweet",
  repost_tweet: "Repost tweet",
  bookmark_tweet: "Bookmark tweet",
  follow_user: "Follow user",
  unfollow_user: "Unfollow user",
  update_profile_text: "Update profile text",
  update_profile_media: "Update profile media",
  analytics_read: "Read analytics",
};

export const capabilityAuthPreference: Record<XCapability, XAuthMethod[]> = {
  read_user: ["oauth2_user", "bearer", "oauth1"],
  read_timeline: ["oauth2_user", "oauth1"],
  read_mentions: ["oauth2_user", "oauth1"],
  post_tweet: ["oauth2_user", "oauth1"],
  reply_tweet: ["oauth2_user", "oauth1"],
  quote_tweet: ["oauth2_user", "oauth1"],
  like_tweet: ["oauth2_user", "oauth1"],
  repost_tweet: ["oauth2_user", "oauth1"],
  bookmark_tweet: ["oauth2_user", "oauth1"],
  follow_user: ["oauth2_user", "oauth1"],
  unfollow_user: ["oauth2_user", "oauth1"],
  update_profile_text: ["oauth1"],
  update_profile_media: ["oauth1"],
  analytics_read: ["oauth2_user", "bearer", "oauth1"],
};
