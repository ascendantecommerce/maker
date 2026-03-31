// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT VIDEO PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// All prompt pieces used by `generateProductVideoPrompts` in the GeminiService.
// Outputs three prompt fields per shot: firstFramePrompt, videoPrompt, scenePrompt.
// Edit here to tune pacing rules, shot guidelines, B-Roll categories, etc.
// ─────────────────────────────────────────────────────────────────────────────

// ─── PACING INSTRUCTIONS ─────────────────────────────────────────────────────
// Note: these use slightly wider word-ranges than the image variant (7–9 vs 3–5)
// because video prompts cover more words per shot.

export const VIDEO_RETENTION_PACING_RULES = `**RETENTION-BASED PACING (THE 2-SECOND RULE)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored". 
Follow these four logic triggers for visual cuts:
1. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger an immediate cut whenever a new high-value subject or noun is mentioned (e.g., "Tap water", "Ice machines", "Gummies").
2. **THE 2-SECOND RETENTION RULE**: Maximum duration for a single shot is ~2 seconds (~4 to 6 words). If a phrase is long and lacks specific nouns, FORCE a cut to a related lifestyle or metaphor shot to keep the eyes engaged.
3. **PUNCTUATION SYNC**: Trigger potential cut points on commas, periods, or natural breath pauses in the script.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: High frequency (cut every 2-3 words). Use "gross" imagery and dark colors.
   - **SOLUTION PHASE**: Medium frequency (cut every 5-7 words). Use bright lighting and clean tech visuals.
5. **PHRASE INTEGRITY (COHERENT BUNCHING)**: To control the visual rhythm, the \`words\` property MUST be a coherent phrase or complete clause. NEVER select arbitrary or grammatically fragmented substrings (e.g., do NOT split "even brushing your teeth abroad" into "even brushing your teeth" and "abroad"). Keep prepositions and related adverbs with their nouns.`;

/** Returns the correct pacing instruction for `generateProductVideoPrompts`. */
export function getProductVideoPacingInstruction(pacing?: string): string {
  return VIDEO_RETENTION_PACING_RULES;
}

// ─── SCHEMA-DRIVEN CONTEXT (when video segments are provided) ─────────────────

/**
 * Builds the full schema context block for `generateProductVideoPrompts`.
 * Includes segment list, topic context, critical instructions, and per-shot prompt spec.
 */
export function buildProductVideoSchemaContext(
  segmentsText: string,
  pacingInstruction: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${styleContext}

**VIDEO SCHEMA CONTEXT:**
The product will be featured in a video with the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${productName || "Not provided"}
- Video Description: ${productDescription || "Not provided"}

**CRITICAL TAILORED INSTRUCTION (SEGMENT ANALYSIS):**
For EACH segment listed above, you MUST perform a word-by-word analysis.
Your goal is to provide a nested sequence of visual shots that cover the ENTIRE narration text.

1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **CONTEXTUAL VISUAL INFERENCE (CVI)**: Do NOT visualize the text literally. Visualize the *implication*, *feeling*, or *mechanism*.
3. **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: Use high-energy, "shocking" metaphors or gritty lifestyle shots to grab attention (e.g., swarming parasites, heavy clouds, exhausted people).
    - **PHASE 2: TRANSITION TO AUTHORITY**: Use clean, professional, and empathetic lifestyle shots (the "Expert's Domain").
    - **PHASE 3: SOLUTION / MECHANISM**: Prioritize \`medical_cgi\` or technical 3D animations explaining the product's function.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: Use high-key, vibrant, and vital lifestyle shots or metaphors reflecting "Relief".
    - **PHASE 5: CALL TO ACTION (CTA)**: Focus strictly on Product Heroes, Packaging Close-ups, or clear lifestyle results.
4. **SENTIMENT LOGIC**: 
    - **Problem/Pain**: Gritty, dark, high-contrast lighting with red/orange accents.
    - **Solution/Relief**: Bright, golden or blue lighting with smooth, vital textures.
5. **EXHAUSTIVE COVERAGE**: Within each segment, every single word MUST be assigned to exactly one shot.
5. **VERBATIM RECONSTRUCTION**: If you join the "words" of all shots in a segment, it MUST exactly match the original narration.
6. **EXACT ID MATCHING**: You MUST return the \`segmentId\` for each segment EXACTLY as provided.
7. **NO TEXT**: Visual prompts MUST NEVER contain text, letters, numbers, or labels.
8. **DENSITY**: ${pacingInstruction}

**PROMPTS PER SHOT:**
1. **firstFramePrompt**: A highly detailed static image description representing the **EXACT BEGINNING** or **HOOK** of the shot's trigger words.
    - **Semantic Analysis**: Create a visual that serves as a compelling "entry point" for the shot's narrative.
    - **Visual Flow**: Ensure the scene has a soft and inviting entry point. Avoid harsh angles or jarring contrasts.
    - **Product Consistency**: Ensure the product looks exactly like the reference images. (Do NOT include lighting or camera specs in the prompt as they are handled automatically).
2. **videoPrompt**: A motion prompt describing *elegant movement* applied to that first frame. 
    - **Motion Quality**: Specify: "Slow cinematic dolly forward", "Smooth orbital camera movement", "Macro sweep", etc.
3. **scenePrompt**: A complementary descriptive prompt representing the **GENERAL SCENE** and environment of the shot.

**CRITICAL GUIDELINES (STRICT):**
- **NO TEXT OR LABELS**: Visuals must be 100% free of text, numbers, UI elements, or logos.
- **SINGLE UNIFIED SCENE**: Absolutely NO split screens, collages, grids, or multi-frame layouts.
- **Style**: High-end commercial advertising. Clean, premium, and visually stunning.
- **Product Visibility**: Default to showing the product clearly and elegantly.

**OUTPUT FORMAT (JSON ONLY):**
Example:
[
  {
    "segmentId": "hqt0wk04r",
    "shots": [
      {
        "type": "product",
        "words": "Experience the premium quality of our latest product",
        "firstFramePrompt": "Cinematic close-up of the product packaging on a clean, modern surface.",
        "videoPrompt": "The camera performs a slow, smooth orbit around the product as light glints off the surface.",
        "scenePrompt": "A high-end, bright commercial studio setting with soft glowing highlights."
      }
    ]
  }
]`;
}
