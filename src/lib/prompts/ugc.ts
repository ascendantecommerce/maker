export const MOUTH_CONTROL =
  "Perfect audio-visual alignment, highly expressive and dynamic lip-sync that exactly matches the spoken words. Mouth rests naturally closed only when audio ceases.";

export const AUDIO_CONTROL = "Clear studio voiceover, clean audio track, pure isolated speech.";

export const DELIVERY_CONTROL =
  "Confident, fluent delivery with smooth, continuous speech and natural professional cadence. NO hesitation, NO stumbled words, NO filler words, NO vocal clutter. STICKLY FORBIDDEN: 'um', 'uh', 'er', 'ah', 'meh', 'hmm', or any other non-script sounds. Subject must deliver the SCRIPT exactly as written with perfect professional articulation.";

export const UGC_NEGATIVE_PROMPT =
  "text, captions, overlays, on-screen graphics, subtitles, zoom, camera transitions, visual effects, blurred, low quality, distorted features.";

export function buildUgcNegativePrompt() {
  return UGC_NEGATIVE_PROMPT;
}

export function buildUgcPrompt(
  text?: string,
  videoPrompt?: string,
  scenePrompt?: string,
  productSizing?: string,
) {
  const cleanText = text ? text.trim() + (text.endsWith(".") ? "" : ".") : "";

  return `
SCRIPT: "${cleanText}"
${AUDIO_CONTROL}
DELIVERY: ${DELIVERY_CONTROL}
ACTION: ${productSizing ? `Scale: ${productSizing}. ` : ""} Subject speaks directly to camera with highly accurate articulation. ${videoPrompt || "natural speaking"}. ${MOUTH_CONTROL}
SCENE: ${scenePrompt || "professional environment"}
`.trim();
}
