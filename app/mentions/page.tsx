import { FeedScreen } from "@/src/features/feed/components/feed-screen";

export const dynamic = "force-dynamic";

export default function MentionsPage() {
  return (
    <FeedScreen
      title="Mentions"
      description="Incoming mentions with unread emphasis so the operator can respond to the room deliberately."
      source="mentions"
    />
  );
}
