import { NonRetriableError } from "inngest";
import { v4 as uuidv4 } from "uuid";

import { getInngestApp } from "../../index";
import * as viralSteps from "./steps/index";

const inngest = getInngestApp();

// ============================================================================
// VIRAL VIDEO EDIT ORCHESTRATOR
// ============================================================================
// Workflow:
//   1. Upload original video to R2
//   2. Transcribe video audio via Deepgram → extract time-aligned paragraphs
//   3. Detect persuasive hooks from paragraphs via Gemini
// ============================================================================

export const viralVideoEditOrchestrator = inngest.createFunction(
  { id: "viral-video-edit-orchestrator", concurrency: 5 },
  { event: "viral-videos/edit-analysis" },

  async ({ event, step }) => {
    const { url, name } = event.data as { url: string; name?: string };

    if (!url) {
      throw new NonRetriableError("Event data must include a `url` field.");
    }

    const videoId = `viral_${uuidv4().substring(0, 8)}`;

    // ========================================================================
    // STAGE 1: UPLOAD TO R2
    // ========================================================================
    const { r2Url } = await step.run("upload-to-r2", () =>
      viralSteps.uploadOriginalVideoToR2({ url, videoId }),
    );

    // ========================================================================
    // STAGE 2: TRANSCRIBE VIDEO (Deepgram → paragraphs)
    // ========================================================================
    const { paragraphs, fullText, duration } = await step.run(
      "transcribe-video",
      () => viralSteps.transcribeVideo({ url: r2Url }),
    );

    // ========================================================================
    // STAGE 3: EXTRACT HOOKS (Gemini)
    // ========================================================================
    const { hooks } = await step.run("extract-hooks", () =>
      viralSteps.extractHooksWithGemini({ paragraphs }),
    );

    // ========================================================================
    // RESULT
    // ========================================================================
    return {
      success: true,
      videoId,
      name: name ?? "video.mp4",
      r2Url,
      transcript: {
        duration,
        fullText,
        paragraphs,
      },
      hooks,
    };
  },
);
