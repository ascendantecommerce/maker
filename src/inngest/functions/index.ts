import { linkToVideo } from "./link-to-video";
import { narrativeVideoOrchestrator } from "./narrative";
import { productVideoOrchestrator } from "./product-video-ads";
import { productImageOrchestrator } from "./product-image-ads";
import { generateUGCVideo } from "./generate-ugc-video";
import { schemaLipsync } from "./lipsync-resolver";
import { ugcVideoOrchestrator } from "./ugc";
import { fakeUgcVideoOrchestrator } from "./fake-ugc/orchestrator";
import { characterDrivenAdOrchestrator } from "./character-driven-ad/orchestrator";
import { generateCharacterAdScript } from "./character-driven-ad/script-generator";
import { generateNarrativeScript } from "./narrative/script-generator";
import { generateProductAdScript } from "./product-video-ads/script-generator";
import { generateProductImageAdScript } from "./product-image-ads/script-generator";
import { generateUGCScript } from "./ugc/script-generator";
import { generateFakeUGCScript } from "./fake-ugc/script-generator";
import { viralVideosOrchestrator } from "./viral-videos/orchestrator";
import { viralVideoEditOrchestrator } from "./viral-videos/edit-orchestrator";


export const functions = [
  narrativeVideoOrchestrator,
  productVideoOrchestrator,
  productImageOrchestrator,
  linkToVideo,
  generateUGCVideo,
  schemaLipsync,
  ugcVideoOrchestrator,
  fakeUgcVideoOrchestrator,
  characterDrivenAdOrchestrator,
  generateCharacterAdScript,
  generateNarrativeScript,
  generateProductAdScript,
  generateProductImageAdScript,
  generateUGCScript,
  generateFakeUGCScript,
  viralVideosOrchestrator,
  viralVideoEditOrchestrator,
];

