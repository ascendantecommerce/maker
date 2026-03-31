import { UGC_CRITICAL_REQUIREMENTS, UGC_VISUAL_ANALYSIS_STEP } from "./ugc-video-prompts";

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT AD B-ROLL PROMPTS
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_AD_BROLL_TYPES = `**SHOT TYPE:**
- Use key "type" with value:
    1. **video**: The avatar is talking to the camera in a UGC style. This is the only allowed type for B-rolls.`;

export const PRODUCT_AD_BROLL_INTERACTION_DIRECTION = `**STEP 2: PRODUCT AD B-ROLL DIRECTION**
1. **STRATEGIC PLACEMENT CRITERIA (PLACEMENT LOGIC)**:
   - **PHASE 1: THE HOOK / SHOCK (HIDE AVATAR)**:
     - **Logic**: Use for high-energy, "shocking" visuals, or problem-focused intros (e.g., parasites, skin issues, everyday pain).
     - **Action**: Do NOT generate a B-roll for this phase. Keep the avatar hidden and use voiceover (VO) only to allow the viewer to focus on the "problem".
   - **PHASE 2: TRANSITION TO AUTHORITY (SHOW AVATAR)**:
     - **Logic**: Use when the script shifts to direct address or empathy (e.g., "Hopefully I'm not scaring you," "I used to be in your shoes").
     - **Action**: Generate an avatar B-roll here to build trust and humanize the message.
   - **PHASE 3: SOLUTION / MECHANISM OF ACTION (HIDE AVATAR)**:
     - **Logic**: Use when explaining how the product works, technical features, or showing 3D/CGI mechanisms.
     - **Action**: Do NOT generate a B-roll. The avatar is a distraction here. ALWAYS yield to \`medical_cgi\`, \`product\`, or \`package_hero\` shots.
   - **PHASE 4: BENEFIT & SOCIAL PROOF (SHOW AVATAR)**:
     - **Logic**: Use when discussing results, scientific benefits, or personal recommendations.
     - **Action**: Generate an avatar B-roll to re-establish the "expert" presence.
   - **PHASE 5: CALL TO ACTION (CTA) (AVATAR OR GRAPHIC)**:
     - **Logic**: The final push or offer.
     - **Action**: Generate an avatar B-roll for a "personal tip" vibe, but yield to graphics for the final "Flash Sale" or offer details.
2. **SHOT TYPE YIELD (CRITICAL)**:
   - **STRICT YIELD**: The avatar MUST yield (hide) for \`medical_cgi\` shots (Mechanism Phase).
   - **FLEXIBLE YIELD**: In **Authority**, **Benefit**, and **CTA** phases, do NOT yield to generic \`product\` or \`lifestyle\` shots. The avatar is the "Trusted Source" and should be shown for conversational lines like "Hopefully I'm not scaring you," "This is your sign," or "Sale right now." 
   - If a segment is 100% "Product Description" (size, weight, material), you may yield, but if it is "Benefit-focused" or "Personal Tip", prioritize the avatar.
3. **TEXT YIELD & VERBATIM SUBSTRINGS**: 
   - The "words" property MUST be an **EXACT VERBATIM substring** of the segment text. 
   - **NO EDITING**: Do NOT remove, add, or skip words within a single "words" property.
   - **MULTIPLE B-ROLLS**: If the narrator's dialogue is interrupted by technical visuals (yielding), you MUST create **separate B-roll objects** in the \`bRolls\` array (one for the part before the yield, one for the part after).
4. **Do NOT force B-rolls.** It is expected and correct to have empty arrays for 60-70% of segments.
5. **MANDATORY BACKGROUND CONSISTENCY**: You MUST select ONE realistic environment (e.g., modern office, minimal living room) that fits the overall "Video Context". This EXACT environment MUST be used for EVERY B-roll.
6. **MOOD & LIGHTING**: Align lighting with the product's use-case (e.g., "warm evening lighting" for sleep; "bright morning sun" for energy).`;

export const PRODUCT_AD_BROLL_INTERACTION_SHOT_STRUCTURE = `**SHOT STRUCTURE:**
- **firstFramePrompt**: A generic description of the starting position. **The background must be 100% sharp and consistent.** The person should start in a neutral, attentive pose looking at the lens, ready to speak.
- **videoPrompt**: The verbal performance. **Vary the framing to keep the edit dynamic:**
    - **Intro/Outro Segments**: Use a **Medium Shot (waist up)** to establish the person in the environment.
    - **Pivots/Truth Bombs**: Use a **Medium Close-up (chest up)** to emphasize the sincerity of the point.
    - **Directional Gestures**: Describe the person gesturing subtly toward the left or right of the frame (empty space) as if referring to a graphic or product that will be placed there in post-production.
    - **Transition Safety**: Describe the person starting the action 1 second before they speak and maintaining their expression/position for 1 second after they finish the line to provide editing "handles".
- **scenePrompt**: Aesthetic and environment. MUST explicitly demand a **deep depth of field with zero blur**. Always reference the "selected environment".
- **words**: Select the EXACT VERBATIM substring from the segment text where the avatar should be shown. MUST MATCH THE SCRIPT EXACTLY.`;

export const PRODUCT_AD_BROLL_PERSON_INTERACTION_ONLY_INSTRUCTIONS = `**STRICT VISIBILITY & ANONYMITY RULES:**
1. **ABSOLUTELY NO VISUAL SPECIFICITY**: It is FORBIDDEN to use any adjectives for the person's appearance. Use ONLY "the person".
2. **ABSOLUTELY NO PRODUCT OR ITEM MENTIONS**: Do NOT mention "the product", "package", "item", "box", or any physical object. The person must NOT be described as holding or interacting with anything other than speaking to the camera.
3. **SHARP ENVIRONMENT (MANDATORY)**: The environment MUST be **100% sharp and clear**. Strictly FORBIDDEN: bokeh, blurred backgrounds, or narrow depth of field.
4. **UGC PERFORMANCE**: The person MUST be talking directly to the lens, appearing like a genuine creator recording a video.
5. **CONSISTENCY**: Use only "the person" to match the provided reference avatar exactly.`;

export const PRODUCT_AD_BROLL_OUTPUT_FORMAT = `**OUTPUT FORMAT:**
Return a JSON array where each item has "segmentId" (string) and "bRolls" (ARRAY of objects for B-roll highlights).
Do NOT include a "shots" array.

Example:
[
  {
    "segmentId": "id-1",
    "bRolls": [
      {
        "type": "video",
        "firstFramePrompt": "Medium shot of the person looking at the camera...",
        "videoPrompt": "The person starts naturally, then speaks to the lens...",
        "scenePrompt": "Interior setting with bright energetic morning sunlight, 100% sharp focus.",
        "words": "believe it or not" 
      },
      {
        "type": "video",
        "firstFramePrompt": "Medium Close-up of the person continuing the thought...",
        "videoPrompt": "The person continues speaking with emphasis, maintaining eye contact...",
        "scenePrompt": "Interior setting with bright energetic morning sunlight, 100% sharp focus.",
        "words": "the real reason is" 
      }
    ]
  }
]
Return ONLY valid JSON.`;

/**
 * Enhanced prompt builder for B-rolls that FORCES person focus.
 * Simplified to use generic "person" terms and NO product mentions in the visual prompts.
 */
export function buildProductAdBrollInteractionPrompt(
  segmentsText: string,
  topicName?: string,
  topicDescription?: string,
  productName?: string,
  productDescription?: string,
  styleDna?: string,
): string {
  // We keep these for context so the LLM knows what the video is about,
  // but we instruct it NOT to use these details in the firstFramePrompt/videoPrompt.
  const productContext = `**PRODUCT CONTEXT (FOR BACKGROUND INFO ONLY - DO NOT USE IN DESCRIPTIONS):**
- Product Name: ${productName || "Not provided"}
- Product Description: ${productDescription || "Not provided"}`;

  const styleContext = styleDna
    ? `**VISUAL STYLE DNA (APPLY TO OVERALL AESTHETIC):**\n${styleDna}`
    : "";

  return `You are an Expert AI Creative Director. Your goal is to create generic B-roll prompts for a video ad focusing EXCLUSIVELY on the person (avatar) talking in a UGC style. 

**CRITICAL RULE: NEVER MENTION THE PRODUCT IN THE B-ROLL PROMPTS.** The visual prompts should only describe the person's presence, performance, and the clear environment.

${styleContext}

**VIDEO CONTEXT (SEGMENTS TEXT):**
${segmentsText}

**TOPIC CONTEXT:**
- Video Topic: ${topicName || "Not provided"}
- Video Description: ${topicDescription || "Not provided"}

${productContext}

${UGC_VISUAL_ANALYSIS_STEP}

${PRODUCT_AD_BROLL_INTERACTION_DIRECTION}

${PRODUCT_AD_BROLL_PERSON_INTERACTION_ONLY_INSTRUCTIONS}

${UGC_CRITICAL_REQUIREMENTS}

${PRODUCT_AD_BROLL_TYPES}

${PRODUCT_AD_BROLL_INTERACTION_SHOT_STRUCTURE}

${PRODUCT_AD_BROLL_OUTPUT_FORMAT}`;
}
