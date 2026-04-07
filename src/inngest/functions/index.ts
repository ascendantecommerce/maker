import { linkToVideo } from "./link-to-video";
import { narrativeVideoOrchestrator } from "./narrative";
import { productVideoOrchestrator } from "./product";
import { generateUGCVideo } from "./generate-ugc-video";
import { schemaLipsync } from "./lipsync-resolver";
import { ugcVideoOrchestrator } from "./ugc";
import { fakeUgcVideoOrchestrator } from "./fake-ugc/orchestrator";
import { characterDrivenAdOrchestrator } from "./character-driven-ad/orchestrator";
import { generateCharacterAdScript } from "./character-driven-ad/script-generator";
import { generateNarrativeScript } from "./narrative/script-generator";
import { generateProductAdScript } from "./product/script-generator";
import { generateUGCScript } from "./ugc/script-generator";
import { generateFakeUGCScript } from "./fake-ugc/script-generator";

export const functions = [
  narrativeVideoOrchestrator,
  productVideoOrchestrator,
  linkToVideo,
  generateUGCVideo,
  schemaLipsync,
  ugcVideoOrchestrator,
  fakeUgcVideoOrchestrator,
  characterDrivenAdOrchestrator,
  generateCharacterAdScript,
  generateNarrativeScript,
  generateProductAdScript,
  generateUGCScript,
  generateFakeUGCScript,
];
