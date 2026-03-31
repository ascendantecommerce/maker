import { serve } from "inngest/next";
import { getInngestApp } from "@/inngest";
import { narrativeVideoOrchestrator } from "@/inngest/functions/narrative";
import { productVideoOrchestrator } from "@/inngest/functions/product";
import { linkToVideo } from "@/inngest/functions/link-to-video";
import { generateUGCVideo } from "@/inngest/functions/generate-ugc-video";
import { schemaLipsync } from "@/inngest/functions/lipsync-resolver";
import { ugcVideoOrchestrator } from "@/inngest/functions/ugc";
import { fakeUgcVideoOrchestrator } from "@/inngest/functions/fake-ugc/orchestrator";
import { characterDrivenAdOrchestrator } from "@/inngest/functions/character-driven-ad/orchestrator";
const inngest = getInngestApp();

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    narrativeVideoOrchestrator,
    productVideoOrchestrator,
    linkToVideo,
    generateUGCVideo,
    schemaLipsync,
    ugcVideoOrchestrator,
    fakeUgcVideoOrchestrator,
    characterDrivenAdOrchestrator,
  ],
});
