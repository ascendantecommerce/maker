// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT IMAGE PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// All prompt pieces used by `generateProductImagePrompts` in the GeminiService.
// Edit here to customize the creative direction, pacing rules, categories, etc.
// ─────────────────────────────────────────────────────────────────────────────

// ─── PRODUCT CONTEXT ─────────────────────────────────────────────────────────

export function buildProductContextBlock(
  productName?: string,
  productDescription?: string,
): string {
  return `**PRODUCT CONTEXT:**
- Product Name: ${productName || "Not provided"}
- Product Description: ${productDescription || "Not provided"}`;
}

// ─── ASPECT RATIO / STYLE HEADER ─────────────────────────────────────────────
// Injected at the top of every prompt as the system role + creative goal.

export const PRODUCT_IMAGE_SYSTEM_ROLE = `You are a World-Class AI Video Director and Lead Prompt Engineer specializing in "Retention Editing"—creating fast-paced, hyper-stimulating visual flows that keep viewers hooked.
Your goal is to analyze a product reference image and convert a voiceover script into a sequence of precise, visual-heavy visual prompts (firstFramePrompt, videoPrompt, scenePrompt) that reflect the subtext and emotional arc of the advertisement.`;

// ─── STEP 1: IMAGE ANALYSIS ───────────────────────────────────────────────────

export const PRODUCT_IMAGE_ANALYSIS_STEP = `**STEP 1: IMAGE ANALYSIS**
Analyze the provided reference image(s). Identify the core physical attributes: shape, color, material, and key brand elements.

**CRITICAL CONSTRAINT**: All visual prompts MUST describe a SINGLE unified scene. NEVER generate prompts for split-screens, collages, grids, or multi-frame compositions.`;

// ─── PACING INSTRUCTIONS ─────────────────────────────────────────────────────

export const RETENTION_PACING_RULES = `**STEP 2: RETENTION-BASED PACING (THE 2-SECOND RULE)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored". 
Follow these four logic triggers for visual cuts:
1. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger an immediate cut whenever a new high-value subject or noun is mentioned (e.g., "Tap water", "Ice machines", "Gummies").
2. **THE 2-SECOND RETENTION RULE**: Maximum duration for a single shot is ~2 seconds (~3 to 5 words). If a phrase is long and lacks specific nouns, FORCE a cut to a related lifestyle or metaphor shot to keep the eyes engaged.
3. **PUNCTUATION SYNC**: Trigger potential cut points on commas, periods, or natural breath pauses in the script.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: High frequency (cut every 1-2 words). Use "gross" imagery and dark colors.
   - **SOLUTION PHASE**: Medium frequency (cut every 3-5 words). Use bright lighting and clean tech visuals.
5. **PHRASE INTEGRITY (COHERENT BUNCHING)**: To control the visual rhythm, the \`words\` property MUST be a coherent phrase or complete clause. NEVER select arbitrary or grammatically fragmented substrings (e.g., do NOT split "even brushing your teeth abroad" into "even brushing your teeth" and "abroad"). Keep prepositions and related adverbs with their nouns.`;

/** Returns the correct pacing instruction string based on the given pacing value. */
export function getProductImagePacingInstruction(pacing?: string): string {
  return RETENTION_PACING_RULES;
}

// ─── SHOT RULES ───────────────────────────────────────────────────────────────

export const PRODUCT_SHOT_RULES = `**Rules for Product Reference (type: "product"):**
- **Implicit Product Placement**: If the script implies "relief", "solution", or "taking it", you MUST show the product (the provided reference) even if it's not named.
- Refer to the main subject as "the product from the provided reference image".
- Ensure the product's color, logo, and form are identical to the reference.
- **NO TEXT**: Absolutely NO labels or UI elements in the prompt.
- Do NOT include camera specs or studio lighting rules in the prompt (they are handled automatically).`;

export const GENERIC_SHOT_RULES = `**Rules for Contextual Shots:**
- **type: "medical_cgi"**: Internal views (nerves, cells, inflammation). Use red for pain, blue for relief.
- **type: "lifestyle"**: High-end cinematic shots of people matching the audience profile.
- **type: "metaphor"**: Abstract surreal representations of concepts like time, energy, or restoration.
- **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: Use high-energy, "shocking" metaphors or gritty lifestyle shots to grab attention. **CRITICAL**: These shots MUST be relevant to the Product Context. If the product is about water purity, show dirty water, a rusty tap, or someone looking hesitant near a drinking source. **STRICTLY FORBIDDEN**: Never use generic "people in a city", "busy urban streets", or "unaware crowds" as a filler hook unless the product is specifically about city life. Pivot immediately to the product's problem domain.
    - **PHASE 2: TRANSITION TO AUTHORITY**: Use clean, professional, and empathetic lifestyle shots (the "Expert's Domain"). Again, anchor these to the product's world (e.g., a home, a lab, or a gym).
    - **PHASE 3: SOLUTION / MECHANISM**: Prioritize \`medical_cgi\` or technical 3D animations explaining the product's function.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: Use high-key, vibrant, and vital lifestyle shots or metaphors reflecting "Relief".
    - **PHASE 5: CALL TO ACTION (CTA)**: Focus strictly on Product Heroes, Packaging Close-ups, or clear lifestyle results.
- **SENTIMENT LOGIC**: 
    - **Problem/Pain**: Gritty, high-contrast, dark lighting, rusty/jagged accents.
    - **Solution/Relief**: Bright, golden/blue lighting, smooth, vital textures.
- **VISUAL DNA**: Ensure the aesthetic (lighting, palette) matches the Visual style of the product reference.`;

// ─── SCHEMA-DRIVEN OUTPUT (when video segments are provided) ──────────────────

export const SCHEMA_OUTPUT_INSTRUCTIONS = `Return a JSON array of objects with "segmentId" and "shots" (array) keys.
"shots" contains objects with "type", "words", "firstFramePrompt", "videoPrompt", and "scenePrompt".

**Example for "After 48 hours // a big boost in daily energy":**
[
  {
    "segmentId": "nyooad1yu-1",
    "shots": [
      {
        "type": "lifestyle",
        "words": "After 48 hours",
        "firstFramePrompt": "The senior man from the reference, standing perfectly upright in a sunlit kitchen. No grimace.",
        "videoPrompt": "He takes a deep breath and smiles confidently.",
        "scenePrompt": "A warm, bright kitchen with soft morning light streaming through the window."
      },
      {
        "type": "metaphor",
        "words": "a big boost in daily energy",
        "firstFramePrompt": "Translucent silhouette of the man. A vertical column of pure blue energy shoots up his spine, blasting away red/rusty residue.",
        "videoPrompt": "The blue energy column intensely pulses and vertical light beams travel up through his body.",
        "scenePrompt": "A clean, abstract clinical environment with a soft blue gradient background."
      }
    ]
  }
]`;

// ─── FINAL PROMPT BUILDER ─────────────────────────────────────────────────────

/**
 * Assembles the full prompt for `generateProductImagePrompts`.
 *
 * @param contextBlock       - Built with `buildProductContextBlock()`
 * @param schemaContext      - Built with `buildVideoSchemaContext()`
 * @param outputInstructions - Use `SCHEMA_OUTPUT_INSTRUCTIONS`
 */
export function buildProductImagePrompt(
  contextBlock: string,
  schemaContext: string,
  outputInstructions: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${PRODUCT_IMAGE_SYSTEM_ROLE}

${contextBlock}

${styleContext}

${PRODUCT_IMAGE_ANALYSIS_STEP}

${schemaContext}

${PRODUCT_SHOT_RULES}

${GENERIC_SHOT_RULES}

${outputInstructions}`;
}
