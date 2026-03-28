import { ProfileScreen } from "@/src/features/profile/components/profile-screen";
import { getProfileEditorState } from "@/src/features/profile/server/service";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const state = await getProfileEditorState();
  return (
    <ProfileScreen
      draft={state.draft}
      applied={state.applied}
      revisions={state.revisions}
      scopeNotice={state.scopeNotice}
      liveReadState={state.liveReadState}
    />
  );
}
