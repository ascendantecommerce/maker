// ─────────────────────────────────────────────────────────────────────────────
// FAKE UGC VIDEO PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// Used for "Fake UGC" mode which relies heavily on AI-generated people/lifestyle.
// ─────────────────────────────────────────────────────────────────────────────

export const FAKE_UGC_SYSTEM_ROLE = `You are an Expert AI Creative Director and Direct-Response Ad Specialist specializing in "AI UGC" (Fake UGC) product ads.
Your goal is to design a high-converting visual sequence that mimics authentic creator content using AI-generated people and lifestyle settings.
You understand the "AI UGC" aesthetic: fast-paced montage, lifestyle shots (bathrooms, pools, sunny rooms), and realistic AI influencers.
The script MUST follow a classic marketing framework:
1. Hook (Myth busting / Attention grabber)
2. Problem (Agitate pain points)
3. Solution (Introduce the product)
4. Benefits (Why it works / Ease of use)
5. Call to Action (Strong offer / Urgency)`;

export const FAKE_UGC_VISUAL_ANALYSIS_STEP = `## STEP 1 — VISUAL STYLE (THE "AI UGC" AESTHETIC)
- **Visuals:** Fast-paced montage of lifestyle shots. "Influencers" in bathrooms, by pools, holding the product, showing off skin.
- **The AI Aesthetic:** Describe people with smooth, glowing skin textures, realistic but "perfect" appearances.
- **Lighting:** Sunny, bright, high-contrast natural lighting. "Shot-on-iPhone" aesthetic but with premium "AI" clarity.
- **Product Integration:** In every shot where the product is present, describe it clearly. Ensure consistent scale and branding.`;

export const FAKE_UGC_CRITICAL_REQUIREMENTS = `## CRITICAL RULES
1. **NO TEXT:** Never describe text on packaging or in the environment that can be messed up by AI. Focus on shapes, colors, and logos.
2. **AI INFLUENCERS:** Describe varied, attractive "influencers" (men/women) interacting with the product. One influencer per scene, potentially different influencers across the video to feel like a compilation.
3. **FAST PACING:** Shots should be dynamic. Describe movement: "turning head", "applying product", "smiling in mirror", "walking by pool".
4. **SHOT ON IPHONE:** Use phrases like "handheld camera tremors", "slight lens flare", "natural window light" to maintain the UGC feel.`;

export const FAKE_UGC_UNIFIED_OUTPUT_FORMAT = `## OUTPUT FORMAT (JSON ONLY)
Return a JSON array of objects, one per segment:
\`\`\`
[
  {
    "segmentId": "<segment id>",
    "shots": [
      {
        "type": "product" | "generic",
        "firstFramePrompt": "A highly detailed image generation prompt for the starting frame. Use 'nano-banana-2' style instructions. Describe the influencer, the product, and the vibrant lifestyle setting. Example: 'POV shot of a beautiful woman with glowing tan skin smiling in a sunny bathroom mirror, holding a [Product] pouch, natural lighting, photorealistic.'",
        "videoPrompt": "A description of the 4-second motion for PixVerse. Example: 'The woman turns her head slightly towards the camera, smiling while adjusting her hair, subtle handheld movement.'",
        "scenePrompt": "Vibrant sunny bathroom, natural morning light, cinematic UGC aesthetic.",
        "words": "...",
        "hasProductInteraction": true | false,
        "productSizing": "concise sizing phrase"
      }
    ],
    "bRolls": []
  }
]
\`\`\``;

export function buildFakeUgcUnifiedPrompt(
  segmentsText: string,
  topicName?: string,
  topicDescription?: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
  assetLabels?: string,
): string {
  const assetContext = assetLabels ? `**PRODUCT ASSET LABELS:**\n${assetLabels}` : "";

  return `${FAKE_UGC_SYSTEM_ROLE}

---

## CONTEXT
**Product name:** ${productName || "Not provided"}
**Product description:** ${productDescription || "Not provided"}
**Video topic:** ${topicName || "Not provided"}
**Video description:** ${topicDescription || "Not provided"}

${assetContext}

## SCRIPT SEGMENTS
${segmentsText}

---

${FAKE_UGC_VISUAL_ANALYSIS_STEP}

${FAKE_UGC_CRITICAL_REQUIREMENTS}

${FAKE_UGC_UNIFIED_OUTPUT_FORMAT}`;
}
