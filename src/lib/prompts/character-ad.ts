// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER AD PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// Specialized prompt segments for character-driven ad generation.
// ─────────────────────────────────────────────────────────────────────────────

export const CHARACTER_AD_NEGATIVE_PROMPT =
  "text, captions, overlays, split screen, on-screen graphics, subtitles, typography, blurry, low quality, distorted features, noisy, amorphous, disorganized shapes, shifting patterns, flickering.";

/**
 * Builds the standard negative prompt for character-driven ads.
 */
export function buildCharacterAdNegativePrompt() {
  return CHARACTER_AD_NEGATIVE_PROMPT;
}
