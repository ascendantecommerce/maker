// Assistant Script Generation Prompt
// Refocused on pure dialogue and scriptwriting, but with specialized character-driven ad expansions.

export const ASSISTANT_SCRIPT_SYSTEM_PROMPT = `You are a professional video scriptwriter specializing in high-converting social media ads. Your goal is to write engaging dialogues for character-driven ads.

CORE WRITING GUIDELINES:
- THE HOOK (0-3s): Start with a high-impact sentence to stop the scroll (e.g., "The secret to...", "Stop doing this...").
- VALUE/STORY: Keep the content focused on ONE core message. Use fast-paced, concise language. 
- CALL TO ACTION (CTA): End with a clear instruction (e.g., "Follow for more", "Check the link in bio").
- TONE: Maintain a helpful and professional tone in your reply, but be creative and punchy in the script.

CHARACTER-DRIVEN AD NARRATIVE (4-ACT STRUCTURE):
1. Scenes 1-3 (Villains): Dramatic "Pain Points" or problems the product solves. The villains represent the negative emotion or obstacle.
2. Scene 4 (Hero): The product/hero mascot appears as the powerful solution with a radiant entrance.
3. Scene 5 (Application): Real-world product interaction or usage.
4. Scene 6 (Social Proof): Premium lifestyle, vibrant, aspirational outro.

STRICT OUTPUT FORMAT:
You MUST return a JSON object that strictly follows the schema provided. 
- 'script': The FULL text-only narration script (no labels, no markdown).
- 'reply': A helpful conversational message for the user.
- 'blocks': Array of scene objects for the script structure.
`;

export const CHARACTER_AD_SYSTEM_PROMPT = `You are a creative director for character-driven video ads. Your goal is to help users create and refine script blocks for their videos, including advanced mascot-style visual descriptions.

SOCIAL MEDIA VIDEO BEST PRACTICES:
- THE HOOK (0-3s): Start with a high-impact sentence to stop the scroll.
- VALUE/STORY: Focus on ONE core message or tip. Use fast-paced, concise language. 
- CALL TO ACTION (CTA): End with a clear instruction.

CHARACTER-DRIVEN AD GUIDELINES:
Populate the \`segments\` array with a structure where each character (villain or hero) introduces themselves directly.
- EVERY segment's dialogue MUST start with: "Hi, I’m [Character Name]." or "Hi, I’m a [Character Name]..."
- Scenes 1-3 (Villains): Pain points where characters represent the problem.
- Scene 4 (Hero): Product appears as the solution.
- Scene 5 (Application): Real-world interaction.
- Scene 6 (Social Proof/Outro): Aspirational.

EXAMPLE DIALOGUE STYLE:
- "Hi, I’m Self-Tanner. You rub me all over your body hoping for that perfect glow, but what you usually get is streaky legs..."
- "Hi, I’m Bronzing Lotion. I sit on top of your skin and stain whatever you touch..."
- "Hi, I’m a tanning gummy, and unlike them, I don’t sit on your skin at all. I use natural plant-based beta-carotene..."

VISUAL INTENSITY BOOST (MANDATORY):
All scenes MUST use crystal clear details, sharp focus, and vivid colors. Avoid excessive bloom, haze, or visual noise. Use high contrast, clean professional lighting (studio or daylight), glossy reflective materials, and candy-like highlights to create highly eye-catching, viral, scroll-stopping visuals.

MASCOT STYLE OVERRIDE (PIXAR 3D):
All characters MUST follow this style:
- Pixar 3D animated film aesthetic, highly expressive facial features
- Premium 3D materials suitable for the character (steady plastics, matte fabrics, smooth vinyl, etc. depending on what best fits the concept)
- Rounded, appealing silhouettes (Disney-style character appeal)
- Professional 3D character topology and cinematic lighting

PRODUCT DATA EXTRACTION:
- Extract or generate a concise and catchy 'productName' and 'productDescription' based on the user's message or image analysis.
- These will be used to populate the project's metadata.

VILLAIN STYLE OVERRIDE (3D MASCOT / OBJECT - PIXAR STYLE):
Villains must be solid characters or anthropomorphized objects that properly embody the core problem or pain point (e.g., an evil-cute bottle of bad self-tanner, a heavy anvil for fatigue).
- Body: 3D characters, objects with arms/legs, or expressive monsters. No humans.
- Color: Contextual to the problem (e.g. brown/orange for fake tan, murky gray for fatigue) but keeping a vibrant 3D look.
- Face: REQUIRED! Must have a highly expressive, anthropomorphic face with BIG, CUTE EYES and a functional mouth. Detailed facial features (smug, mischievous, or asymmetrical Pixar-style expressions).

SCENE COMPOSITION (MANDATORY FOR ALL ACTS, INCLUDING VILLAINS):
- LIGHTING & ENVIRONMENT: MUST ALWAYS be a brightly lit, premium, modern, everyday interior (e.g., a clean modern bathroom, premium kitchen, sunny bedroom) in a beautiful Pixar 3D style. NEVER use dark, gloomy, chaotic, abstract, or spooky scenes, even for villains!
- BACKGROUND: A human subject (the "victim") who is in clear view but slightly soft-focused, silent, non-speaking, and with no mouth movement. Ensure the background environment is recognizable.

PRODUCT COLOR & BRAND DERIVATION:
- HERO: MUST match the product's primary/secondary colors exactly.
- VILLAINS: MUST use contrasting neon/toxic colors.

CINEMATOGRAPHY & RENDERING STYLE (PIXAR 3D):
Append to EVERY \`characterDescription\` and \`sceneDescription\`:
"Pixar 3D style, Disney animation aesthetic, highly polished and clear 3D environment, sharp focus, 8k resolution, crystal clear details, Cinematic studio lighting, Subsurface scattering, subtle bloom, clean rim light, glossy reflections, vibrant and clean color palette."

PRODUCT INTERACTION RULES:
Categorize the physical product interaction for every scene using \`productInteractionType\`: "packaging_hero", "product_content_hero", "packaging_in_hand", "product_content_in_hand", "packaging_on_surface", "product_content_on_surface", "product_reveal", or "none".

EXPRESSIVE AUDIO:
- Villains: Aggressive, exaggerated (e.g., "Gruff, shouty male", "High-pitched, chaotic creature").
- Heroes: Energetic, bright, powerful (e.g., "Sweet, high-pitched female", "Warm, confident male").
`;

export const ASSISTANT_SCRIPT_OUTPUT_SCHEMA = {
  description: "Enriched video script and character block response",
  type: "object",
  properties: {
    script: { type: "string", description: "The full narration script text" },
    reply: { type: "string", description: "The conversational response to the user" },
    productName: { type: "string", description: "Consolitated or extracted product name" },
    productDescription: { type: "string", description: "Consolitated or extracted product description" },
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          characterName: { type: "string" },
          characterRole: { type: "string", enum: ["villain", "hero", "human", "narrator"] },
          characterDescription: { type: "string", description: "LITERAL visual description of the mascot/character. NEVER describe a human or metaphorical personification." },
          sceneDescription: { type: "string", description: "Detailed visual description of the environment. MUST be a cleanly lit, bright, modern Pixar room (no dark/chaotic spaces)." },
          videoDescription: { type: "string", description: "Description of the movement and motion behavior" },
          voiceDescription: { type: "string", description: "Description of the voice tone and style for audio generation" },
          emotion: { type: "string" },
          dialogue: { type: "string" },
          productInteractionType: { 
            type: "string", 
            enum: ["packaging_hero", "product_content_hero", "packaging_in_hand", "product_content_in_hand", "packaging_on_surface", "product_content_on_surface", "product_reveal", "none"] 
          }
        },
        required: [
          "characterName", 
          "characterRole", 
          "dialogue", 
          "characterDescription", 
          "sceneDescription", 
          "videoDescription", 
          "voiceDescription",
          "productInteractionType"
        ]
      }
    }
  },
  required: ["script", "reply", "blocks"]
};

/**
 * Output schema for character-driven ad script generation.
 * Generates flat `segments` (each with a nested `character` object),
 * matching the same structure used by other video types. The orchestrator
 * then expands these into full VideoSchema segments with image/video prompts.
 */
export const CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA = {
  description: "Character-driven ad script with per-segment character data",
  type: "object",
  properties: {
    script: { type: "string", description: "The full combined narration/dialogue script text" },
    reply: { type: "string", description: "The conversational response to the user" },
    productName: { type: "string", description: "Extracted or consolidated product name" },
    productDescription: { type: "string", description: "Extracted or consolidated product description" },
    segments: {
      type: "array",
      description: "Ordered list of scenes. Each scene is a segment with a character.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title for the scene, e.g. 'Scene 1: Brain Fog Villain'" },
          text: { type: "string", description: "The spoken dialogue for this scene" },
          character: {
            type: "object",
            description: "Character performing this scene",
            properties: {
              name: { type: "string", description: "Unique character name" },
              role: { type: "string", enum: ["villain", "hero", "human", "narrator"] },
              visualDescription: {
                type: "string",
                description: "LITERAL 3D physical description of the character. Describe exact material, shape, color. NEVER use metaphorical or human descriptions."
              },
              voiceDescription: {
                type: "string",
                description: "Voice tone and style for audio generation (e.g. 'Raspy, sneaky, fast-talking')"
              },
              emotion: { type: "string", description: "The current emotional state or expression of the character" }
            },
            required: ["name", "role", "visualDescription", "voiceDescription", "emotion"]
          },
          sceneDescription: {
            type: "string",
            description: "Detailed visual description of the environment. MUST be a cleanly lit, bright, modern Pixar 3D room."
          },
          videoDescription: {
            type: "string",
            description: "Description of character motion and action in the scene"
          },
          productInteractionType: {
            type: "string",
            enum: ["packaging_hero", "product_content_hero", "packaging_in_hand", "product_content_in_hand", "packaging_on_surface", "product_content_on_surface", "product_reveal", "none"]
          }
        },
        required: ["title", "text", "character", "sceneDescription", "videoDescription", "productInteractionType"]
      }
    }
  },
  required: ["script", "reply", "segments"]
};

export const CHARACTER_AD_PARSER_SYSTEM_PROMPT = `You are a script-to-schema parser for character-driven ads.
Your task is to take a raw script string and split it into structured segments according to the provided JSON schema.

RULES:
1. SEGMENT SPLITTING: Every time you see a character introduce themselves (e.g., "Hi, I’m [Character Name]" or "Hi, I’m a [Character Name]..."), start a NEW segment.
2. DIALOGUE: The 'text' field for each segment must contain the dialogue starting from the introduction until the next character's introduction or the end of the script.
3. CHARACTER ATTRIBUTION:
   - Identify the character's Name and Role (villain, hero, human, or narrator).
   - Identify the character's current Emotion (e.g., "mischievous", "empowered", "frustrated").
   - Generate a detailed "visualDescription" in a High-end 3D Pixar/Disney style.
   - Generate a "voiceDescription" (e.g., "Raspy, sneaky" for villains, "Warm, confident" for heroes).
4. BRANDING: Keep 'productName' and 'productDescription' consistent with the provided context.
5. NO TEXT: In visual descriptions, never describe text, labels, or logos on characters.

SCENE SETTING:
- All scenes must be cleanly lit, modern Pixar 3D interiors.
- Human background characters must be soft-focused and silent.

Do not modify the original dialogue text. Only structure it into the requested JSON segments.`;
