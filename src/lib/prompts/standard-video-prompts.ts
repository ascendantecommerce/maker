// ─────────────────────────────────────────────────────────────────────────────
// STANDARD VIDEO PROMPTS
// ─────────────────────────────────────────────────────────────────────────────
// Generic (non-product) video prompts for educational, motivational, SaaS videos.
// Used by `generateStandardVideoPrompts`.
// Shot format: firstFramePrompt, videoPrompt, scenePrompt.
// ─────────────────────────────────────────────────────────────────────────────

// ─── System Role ──────────────────────────────────────────────────────────────

export const STANDARD_VIDEO_SYSTEM_ROLE = `You are a World-Class AI Video Director and Lead Prompt Engineer specializing in "Retention Editing"—creating fast-paced, hyper-stimulating visual flows that keep viewers hooked.
Your goal is to convert a voiceover script into a sequence of precise, visual-heavy visual prompts (firstFramePrompt, videoPrompt, scenePrompt) that reflect the subtext and emotional arc of the video.`;

// ─── Core Requirements (static rules 1–6, density + split-screen injected by builder) ──

export const STANDARD_VIDEO_CORE_REQUIREMENTS = `1. **GROUP BY SEGMENT**: You MUST return an array of objects, one for each segment ID.
2. **CONTEXTUAL VISUAL INFERENCE (CVI)**: Do NOT visualize the text literally. Visualize the *implication*, *feeling*, or *mechanism*.
3. **STRATEGIC MARKETING PHASES (VISUAL SELECTION)**:
    - **PHASE 1: THE HOOK / SHOCK**: Use high-energy, "shocking" metaphors or gritty lifestyle shots to grab attention (e.g., swarming parasites, heavy clouds, exhausted people).
    - **PHASE 2: TRANSITION TO AUTHORITY**: Use clean, professional, and empathetic lifestyle shots (the "Expert's Domain").
    - **PHASE 3: SOLUTION / MECHANISM**: Prioritize \`medical_cgi\` or technical 3D animations explaining the core concept/mechanism.
    - **PHASE 4: BENEFIT & SOCIAL PROOF**: Use high-key, vibrant, and vital lifestyle shots or metaphors reflecting "Relief".
    - **PHASE 5: CALL TO ACTION (CTA)**: Focus strictly on clear lifestyle results or the core solution.
4. **SENTIMENT LOGIC**: 
    - **Problem/Pain**: Use dark, high-contrast lighting with red/orange accents or jagged/rusty textures.
    - **Solution/Relief**: Use bright, golden or blue lighting with smooth, vital textures.
5. **EXHAUSTIVE COVERAGE**: Every single word in the narration MUST be assigned to exactly one shot.
5. **VERBATIM RECONSTRUCTION**: Joining the "words" of all shots in a segment MUST exactly match the original narration.
6. **EXACT ID MATCHING**: You MUST return the \`segmentId\` for each segment EXACTLY as provided.
7. **NO TEXT**: Visual prompts MUST NEVER contain text, letters, numbers, or labels.`;

// ─── Visual Strategy ──────────────────────────────────────────────────────────

export const STANDARD_VIDEO_VISUAL_STRATEGY = `**VISUAL STRATEGY (SHOT TYPES):**
- **medical_cgi**: Internal views (nerves, cells, blood, inflammation). Use bioluminescent cerulean for relief, jagged red for pain.
- **lifestyle**: High-end cinematic shots of people matching the audience in relevant scenarios.
- **metaphor**: Abstract surreal representations of concepts (e.g., time, pressure, growth).
- **generic**: Professional cinematic environmental or context shots.`;

// ─── Shot Categories ──────────────────────────────────────────────────────────

export const STANDARD_VIDEO_SHOT_CATEGORIES = `**SHOT CATEGORIES:**
- **Concept/Metaphor**: Abstract representations
- **Lifestyle/Context**: People and environments
- **Emotion/Mood**: Feeling-evoking visuals
- **Action/Process**: Demonstrations or activities
- **Nature/Environment**: Natural settings
- **Technology/Modern**: Contemporary tools and settings
- **Human Connection**: Relationships and interactions`;

// ─── Prompt Guidelines (per shot) ─────────────────────────────────────────────

export const STANDARD_VIDEO_PROMPT_GUIDELINES = `**PROMPT GUIDELINES (PROMPTS PER SHOT):**
1. **firstFramePrompt**: A dense, style-aware description of the **EXACT START** of the shot's trigger words. Focus strictly on the subject and environment.
2. **videoPrompt**: A motion prompt describing *dynamic movement*. 
    - **Motion Quality**: Specify: "Slow cinematic dolly forward", "Macro focus pull", "Smooth orbit", etc.
3. **scenePrompt**: General environment, lighting context, and overall aesthetic representing the entire shot.`;

// ─── Critical Guidelines ──────────────────────────────────────────────────────

export const STANDARD_VIDEO_CRITICAL_GUIDELINES = `**CRITICAL GUIDELINES (STRICT):**
- **NO TEXT OR LABELS**: Visuals must be 100% free of text, numbers, UI elements, or logos.
- **SINGLE UNIFIED SCENE**: Absolutely NO split screens, collages, grids, or multi-frame layouts.
- **Visual DNA**: Maintain thematic consistency throughout all segments.`;

// ─── Output Format ────────────────────────────────────────────────────────────

export const STANDARD_VIDEO_OUTPUT_FORMAT = `**OUTPUT FORMAT (JSON ONLY):**
Example:
[
  {
    "segmentId": "seg_1",
    "shots": [
      {
        "type": "lifestyle",
        "words": "In a world where technology evolves faster than ever,",
        "firstFramePrompt": "Cinematic close-up of a silver-haired woman looking into a monitor, her face illuminated by high-contrast blue light.",
        "videoPrompt": "The camera slowly dollies forward toward her eye as digital reflections shimmer on the cornea.",
        "scenePrompt": "A futuristic dark room with flickering electronic blue lights and a high-tech vibe."
      }
    ]
  }
]`;

// ─── Pacing Helpers ────────────────────────────────────────────────────────────

export const STANDARD_VIDEO_RETENTION_PACING_RULES = `**RETENTION-BASED PACING (THE 2-SECOND RULE)**
In high-performance marketing, the timing of cuts prevents the brain from getting "bored". 
Follow these four logic triggers for visual cuts:
1. **THE NOUN-OBJECT MATCH (SEMANTIC SYNC)**: Trigger an immediate cut whenever a new high-value subject or noun is mentioned (e.g., "Tap water", "Ice machines", "Gummies").
2. **THE 2-SECOND RETENTION RULE**: Maximum duration for a single shot is ~2 seconds (~4 to 6 words). If a phrase is long and lacks specific nouns, FORCE a cut to a related lifestyle or metaphor shot to keep the eyes engaged.
3. **PUNCTUATION SYNC**: Trigger potential cut points on commas, periods, or natural breath pauses in the script.
4. **THE TONE-SHIFT PIVOT**:
   - **PROBLEM PHASE**: High frequency (cut every 2-3 words). Use "gross" imagery and dark colors.
   - **SOLUTION PHASE**: Medium frequency (cut every 5-7 words). Use bright lighting and clean tech visuals.
5. **PHRASE INTEGRITY (COHERENT BUNCHING)**: To control the visual rhythm, the \`words\` property MUST be a coherent phrase or complete clause. NEVER select arbitrary or grammatically fragmented substrings (e.g., do NOT split "even brushing your teeth abroad" into "even brushing your teeth" and "abroad"). Keep prepositions and related adverbs with their nouns.`;

export function getStandardVideoPacingInstruction(pacing?: string): string {
  return STANDARD_VIDEO_RETENTION_PACING_RULES;
}

// ─── Prompt Builder ────────────────────────────────────────────────────────────

export function buildStandardVideoPrompt(
  segmentsText: string,
  pacingInstruction: string,
  topicName?: string,
  topicDescription?: string,
  styleDna?: string,
): string {
  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO ALL PROMPTS):**\n${styleDna}\nYour descriptions MUST reflect this aesthetic.`
    : "";

  return `${STANDARD_VIDEO_SYSTEM_ROLE}

${styleContext}

**VIDEO SCHEMA CONTEXT:**
The video will have the following segments and narration script:
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

**YOUR TASK:**
For EACH segment ID, perform a word-by-word analysis to create a nested sequence of visual shots that cover the ENTIRE narration text.

**CRITICAL REQUIREMENTS:**
${STANDARD_VIDEO_CORE_REQUIREMENTS}
8. **DENSITY**: ${pacingInstruction}
9. **NO SPLIT SCREENS (CRITICAL)**: All visual prompts MUST describe a SINGLE unified scene. NEVER generate prompts for split-screens, collages, grids, or multi-frame compositions.

${STANDARD_VIDEO_VISUAL_STRATEGY}

${STANDARD_VIDEO_PROMPT_GUIDELINES}

${STANDARD_VIDEO_CRITICAL_GUIDELINES}

${STANDARD_VIDEO_OUTPUT_FORMAT}`;
}
