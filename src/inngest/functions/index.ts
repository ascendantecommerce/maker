import { linkToVideo } from "./link-to-video";
import { narrativeVideoOrchestrator } from "./narrative";
import { productVideoOrchestrator } from "./product";
import { generateUGCVideo } from "./generate-ugc-video";
import { schemaLipsync } from "./lipsync-resolver";
import { ugcVideoOrchestrator } from "./ugc";
import { fakeUgcVideoOrchestrator } from "./fake-ugc/orchestrator";
import { characterDrivenAdOrchestrator } from "./character-driven-ad/orchestrator";

export const functions = [
  narrativeVideoOrchestrator,
  productVideoOrchestrator,
  linkToVideo,
  generateUGCVideo,
  schemaLipsync,
  ugcVideoOrchestrator,
  fakeUgcVideoOrchestrator,
  characterDrivenAdOrchestrator,
];
