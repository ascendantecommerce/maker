import HomeView from "@/components/home/home-view";
import { showAiCopilot, showLinkToVideo } from "@/flags";

export default async function Page() {
  const [isAiCopilotEnabled, isLinkToVideoEnabled] = await Promise.all([
    showAiCopilot(),
    showLinkToVideo(),
  ]);

  return (
    <HomeView isAiCopilotEnabled={isAiCopilotEnabled} isLinkToVideoEnabled={isLinkToVideoEnabled} />
  );
}
