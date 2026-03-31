// ─────────────────────────────────────────────────────────────────────────────
// STANDARD IMAGE PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// Generic (non-product) image prompts for educational, motivational, SaaS videos.
// Used by `generateStandardImagePrompts`.
// Shot format: firstFramePrompt, videoPrompt, scenePrompt, words.
// ─────────────────────────────────────────────────────────────────────────────

// ─── System Role ──────────────────────────────────────────────────────────────

export const STANDARD_IMAGE_SYSTEM_ROLE = `You are a World-Class AI Video Director and Lead Prompt Engineer specializing in "Retention Editing"—creating fast-paced, hyper-stimulating visual flows that keep viewers hooked.
Your goal is to convert a voiceover script into a sequence of precise, visual-heavy visual prompts (firstFramePrompt, videoPrompt, scenePrompt) that reflect the subtext and emotional arc of the video.`;

// ─── Core Analysis Rules (static, pacing injected as rule 6 by builder) ───────

export const STANDARD_IMAGE_CORE_RULES = `For EACH segment listed above, you MUST perform a word-by-word analysis to break the script into a sequence of visual beats.

1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **CONTEXTUAL VISUAL INFERENCE (CVI)**: Do NOT visualize the text literally. Visualize the *implication*, *feeling*, or *mechanism*.
    - *Example*: "Over 50 with back pain" -> Macro X-ray of a spine glowing with jagged red inflammation.
3. **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: Use high-energy, "shocking" metaphors or gritty lifestyle shots to grab attention (e.g., swarming parasites, heavy clouds, exhausted people).
    - **PHASE 2: TRANSITION TO AUTHORITY**: Use clean, professional, and empathetic lifestyle shots (the "Expert's Domain").
    - **PHASE 3: SOLUTION / MECHANISM**: Prioritize \`medical_cgi\` or technical 3D animations explaining the core concept/mechanism.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: Use high-key, vibrant, and vital lifestyle shots or metaphors reflecting "Relief".
    - **PHASE 5: CALL TO ACTION (CTA)**: Focus strictly on clear lifestyle results or the core solution.
4. **SENTIMENT LOGIC**: 
    - **Problem/Pain**: Use dark, high-contrast lighting with red/orange accents or jagged/rusty textures.
    - **Solution/Relief**: Use bright, golden or blue lighting with smooth, healthy, and vital textures.
5. **EXHAUSTIVE COVERAGE**: Every single word in the narration MUST be assigned to exactly one shot.
5. **VERBATIM RECONSTRUCTION**: Joining the "words" of all shots in a segment MUST exactly match the original narration.
6. **EXACT ID MATCHING**: You MUST return the \`segmentId\` for each segment EXACTLY as provided.
7. **NO TEXT**: Visual prompts MUST NEVER contain text, letters, or numbers.`;

// ─── Shot Structure ────────────────────────────────────────────────────────────

export const STANDARD_IMAGE_SHOT_STRUCTURE = `**SHOT STRUCTURE & TYPES:**
Each shot must contain:
- **type**: Choose the most relevant category:
    - \`lifestyle\`: High-end cinematic shots of people matching the audience.
    - \`medical_cgi\`: Internal views (nerves, cells, blood, inflammation).
    - \`metaphor\`: Abstract surreal representations of pain, energy, or time.
    - \`generic\`: Default cinematic shots.
- **firstFramePrompt**: A dense, highly descriptive visual prompt for the scene. Focus ONLY on the subject, action, and environment.
- **videoPrompt**: Description of any subtle motion or animation (e.g., "The red energy pulses", "Camera slowly moves forward").
- **scenePrompt**: General environment and lighting context.
- **words**: The portion of the narration text.`;

// ─── Output Format ────────────────────────────────────────────────────────────

export const STANDARD_IMAGE_OUTPUT_FORMAT = `**OUTPUT FORMAT (JSON ONLY):**
Example:
[
  {
    "segmentId": "hqt0wk04r",
    "shots": [
      {
        "type": "medical_cgi",
        "words": "If your lower back feels like it's on fire",
        "firstFramePrompt": "Macro X-Ray of a human spine. The vertebrae are glowing with jagged, aggressive RED energy and smoke, symbolizing intense inflammation.",
        "videoPrompt": "The red energy pulses as jagged lightning sparks across the nerves.",
        "scenePrompt": "A gritty, medical-grade dark digital environment."
      }
    ]
  }
]`;

// ─── Pacing Helpers ────────────────────────────────────────────────────────────

export const STANDARD_IMAGE_RETENTION_PACING_RULES = `**RETENTION-BASED PACING (THE 2-SECOND RULE)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored". 
Follow these four logic triggers for visual cuts:
1. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger an immediate cut whenever a new high-value subject or noun is mentioned (e.g., "Tap water", "Ice machines", "Gummies").
2. **THE 2-SECOND RETENTION RULE**: Maximum duration for a single shot is ~2 seconds (~3 to 5 words). If a phrase is long and lacks specific nouns, FORCE a cut to a related lifestyle or metaphor shot to keep the eyes engaged.
3. **PUNCTUATION SYNC**: Trigger potential cut points on commas, periods, or natural breath pauses in the script.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: High frequency (cut every 1-2 words). Use "gross" imagery and dark colors.
   - **SOLUTION PHASE**: Medium frequency (cut every 3-5 words). Use bright lighting and clean tech visuals.
5. **PHRASE INTEGRITY (COHERENT BUNCHING)**: To control the visual rhythm, the \`words\` property MUST be a coherent phrase or complete clause. NEVER select arbitrary or grammatically fragmented substrings (e.g., do NOT split "even brushing your teeth abroad" into "even brushing your teeth" and "abroad"). Keep prepositions and related adverbs with their nouns.`;

export function getStandardImagePacingInstruction(pacing?: string): string {
  return STANDARD_IMAGE_RETENTION_PACING_RULES;
}

// ─── Prompt Builder ────────────────────────────────────────────────────────────

export function buildStandardSchemaPrompt(
  segmentsText: string,
  pacingInstruction: string,
  topicName?: string,
  topicDescription?: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${STANDARD_IMAGE_SYSTEM_ROLE}

${styleContext}

**VIDEO SCHEMA CONTEXT:**
The video has the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

**INSTRUCTIONS:**
${STANDARD_IMAGE_CORE_RULES}
8. **DENSITY**: ${pacingInstruction}

${STANDARD_IMAGE_SHOT_STRUCTURE}

${STANDARD_IMAGE_OUTPUT_FORMAT}`;
}
