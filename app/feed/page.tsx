import { FeedScreen } from "@/src/features/feed/components/feed-screen";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  return (
    <FeedScreen
      title="Feed"
      description="Home timeline triage for quick scan, labeling, and safe operator actions."
      source="feed"
    />
  );
}
