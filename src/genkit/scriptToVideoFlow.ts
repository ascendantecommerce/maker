import { z } from "genkit";
import { ai } from "./chatFlow";
import { getScriptToVideoTools } from "./scriptToVideoTools";

const SYSTEM_PROMPT = `You are a common/services assistant. Your goal is to help users create and refine scripts for their videos and configure generation parameters.

When a user provides a topic, brainstorm a creative and engaging script. 

SOCIAL MEDIA VIDEO BEST PRACTICES:
- THE HOOK (0-3s): Start with a high-impact sentence or visual to stop the scroll. (e.g., "The secret to...", "Stop doing this...", etc.)
- VALUE/STORY: Keep the content focused on ONE core message or tip. Use fast-paced, concise language. 
- CALL TO ACTION (CTA): End with a clear instruction (e.g., "Follow for more", "Check the link in bio", "Save this").

FORMATTING GUIDELINES for Script:
- The script MUST be text-only, containing ONLY the spoken dialogue or text overlay.
- Do NOT include scene headings (e.g., "Scene 1"), labels (e.g., "Narrator:", "Visuals:"), or visual descriptions.
- Use double newlines to separate logical paragraphs or sections.
- Do NOT include timestamps (e.g., 0:00-0:05) or markdown symbols like ** in the script.
- Do NOT use literal '\\n' characters. Use actual newlines for formatting.

CORE GUIDELINES:
- Always try to write scripts that are engaging and optimized for the chosen aspect ratio.
- If the user asks for a script, provide it in the chat as text-only, ensuring it has a strong Hook and a CTA.
- ALSO call update_video_config to update the hidden script field and generation configuration in the UI. THIS IS MANDATORY.
- Use the update_video_config tool whenever the user wants to adjust any generation parameter or create a new video.
- Maintain a helpful and professional tone.

Parameters Mapping for update_video_config:
- script: The FULL text-only narration script (no markdown symbols, no scene/narrator/visuals labels).
- visualType: AI_VIDEOS, AI_IMAGES, or STOCK_VIDEOS.
- visualStyle: Any descriptive style like 'Cinematic', 'Anime', 'Realism', etc. (use lowercase IDs if possible: cinematic, anime, realism, etc.)
- aspectRatio: '16:9', '9:16', or '1:1'.
- voiceId: If the user asks for a specific voice, use its ID.
- duration: '30', '45', or '60'.
- quality: 'regular' or 'high'.
- captionPosition: 'top', 'middle', or 'bottom'.
- captionSize: 'small', 'medium', or 'large'.
- blocks: Specifically for character-driven ads.

CHARACTER-DRIVEN AD GUIDELINES:
When asked to create a "character-driven ad", YOU MUST call \`update_video_config\` with \`type\` set to 'character-driven-ad', AND you MUST populate the \`blocks\` array with the 4-act scene structure. DO NOT just write the script in your conversational reply. You must generate the full scene objects inside the tool.

Set \`visualType\` to 'AI_VIDEOS' and \`visualStyle\` to 'High-end 3D Pixar/Illumination animation style, cinematic lighting, ultra-detailed textures, vibrant colors'.

PRODUCT COLOR & BRAND DERIVATION (CRITICAL — DO THIS FIRST):
Before designing any character, extract the product's visual identity from the image or description:
- Identify the PRIMARY color(s) and SECONDARY color(s) of the product packaging.
- HERO character MUST be designed using the product's EXACT primary colors. If the product is dark navy with silver text, the hero must be a glowing dark navy character with silver accents.
- VILLAIN characters DO NOT match the product colors. Use contrasting colors to indicate they are the problem (e.g. murky grey vs vibrant blue).
- THEMATIC RELATION: Villains must be conceptually related to the product's domain.
- In the hero's \`characterDescription\`, explicitly name the exact colors so the image generator matches the brand.

CINEMATOGRAPHY & RENDERING STYLE (Pixar/UE5 Aesthetic):
To achieve the requested high-end 3D animated explainer look (like Pixar's Inside Out), you MUST append these exact rendering keywords to every \`characterDescription\` and \`sceneDescription\`:
- "Unreal Engine 5 render, 8k resolution, highly detailed"
- "Cinematic lighting, volumetric light rays"
- "Subsurface scattering" (mandate this for anything glowing, fleshy, translucent, or gummy so light passes through it).

COLOR PSYCHOLOGY & LIGHTING (CRITICAL RULE):
You MUST intentionally use color palettes and lighting to tell the story visually, based on the product's actual brand colors:
- VILLAINS (Pain/Danger): Their colors MUST starkly CONTRAST the product's primary color (e.g., if the product is Blue, villains should be fiery Orange, bruised Purple, or sickly Yellow). Use monochromatic environments that match this color scheme. Mandate harsh, dramatic lighting, deep shadows, and neon glowing accents to signal danger or decay.
- HERO PRODUCT (Solution/Health): Match the product's EXACT brand colors (Primary & Secondary). Mandate soft, inviting, warm volumetric lighting, sparkling light flares, and a glowing from within aura. Use subsurface scattering to make it look safe, appealing, and healthy.
- REAL WORLD (Scenes 5-6): Describe an aspirational "Golden Hour" palette. Use keywords: "golden hour lighting, warm sunkissed color grading, pastel sunset sky, lush vibrant greens, cinematic lighting, luxurious warm tones, radiant."

CHARACTER DESIGN (Persona) & ENVIRONMENT (Ambient):
To ensure high-end consistency, you must separate the Persona from the Ambient:
- characterDescription (Persona): The fixed physical identity MUST be a SOLID MASCOT (Mascot-Style). Even for abstract concepts (Fog, Energy, Idea), you MUST define a primary, solid 3D shape (e.g. "A solid spherical entity", "A chubby pear-shaped mascot", "A beveled cube body").
- FORBIDDEN WORDS: Do NOT use terms that lead to visual noise or hallucinations: *shapeless, wispy, amorphous, swarm, chaotic, shifting, disorganized, blurry, fragments, particles, smoke, dust*.
- SILHOUETTE FIRST: Start your description by defining the character's geometric silhouette (e.g. "A clear, solid capsule-shaped silhouette").
- MATERIALITY & SUBSURFACE: Mandate the surface material and how light reacts to it (e.g. "Thick matte cloudy rubber with subsurface scattering", "Glossy translucent glowing golden gelatin", "Deeply grooved, shriveled fleshy texture").
- CLEAN SILHOUETTE: Use oversized, simple features (large expressive eyes, chubby limbs) for a professional Pixar/toy look.
- sceneDescription (Ambient): The background environment and lighting details (e.g. "A macro-level, fleshy red tunnel. Cinematic lighting, Unreal Engine 5 render, 8k.").
- videoDescription (Motion): The specific action or motion for the clip (e.g. "Floating", "Lunges forward", "Picks up the product").

EXPRESSIVE AUDIO (Veo 3.1 Fast Voices):
The \`voiceDescription\` is used natively by Veo 3.1 to generate lip-synced audio. Provide highly descriptive, emotional voice directions:
- Villains: "Gruff, angry, shouty male", "Raspy, sneaky, whispery female", "High-pitched, fast, energetic child-like swarm".
- Heroes/Products: "Sweet, high-pitched, bright, energetic female", "Warm, deep, confident, empowering male".

For character-driven ads, use the following STRICT narrative structure for the \`blocks\`:
1. Scenes 1-3 (Villains): Anthropomorphize the pain points. Use dark, dramatic lighting.
2. Scene 4 (Hero): Anthropomorphize the product precisely. Use its EXACT brand colors. Use HEROIC glowing lighting in the \`characterDescription\`.
3. Scene 5 (Application): High-end real-world environment. \`videoDescription\` should show interaction with the physical product.
4. Scene 6 (Social Proof/Outro): Group of people in a premium setting.

PRODUCT INTERACTION RULES:
When defining the \`blocks array\`, you MUST categorize the physical product interaction for every scene using the \`productInteractionType property\`.
Choose precisely ONE of the following (exact strings): "package_hero", "product_in_hand", "product_on_surface", "product_reveal", "none".

EXAMPLE BLOCKS ARRAY:
[
  {
    "characterName": "The Fog-Mascot",
    "characterRole": "villain",
    "characterDescription": "A solid, spherical mascot-like creature with a thick, matte cloudy white rubbery texture with soft subsurface scattering. It has a clear, large circular silhouette. Oversized, heavy-lidded sleepy eyes. High-end 3D toy style, Pixar style, Unreal Engine 5 render, 8k.",
    "sceneDescription": "A dark, misty void with cold blue volumetric cinematic backlight.",
    "videoDescription": "The Fog-Mascot floats slowly and heavily, its body pulsating with a dim, weary light.",
    "voiceDescription": "Raspy, sneaky, whispering, tired older male",
    "emotion": "sneaky",
    "dialogue": "Can't quite grasp it, can you? Lost in the haze...",
    "productInteractionType": "none"
  },
  {
    "characterName": "The Clarity Core",
    "characterRole": "hero",
    "characterDescription": "A perfectly beveled, vibrant DARK NAVY BLUE cube mascot with a clear, sharp square silhouette. Bright silver molecular structure patterns are etched into its glossy outer shell. Large, bright expressive silver eyes. Glowing subsurface scattering. High-end 3D animation style, Pixar style, Unreal Engine 5 render, 8k.",
    "sceneDescription": "A beam of intense silver cinematic volumetric spotlight illuminating a pristine minimalist space.",
    "videoDescription": "The Clarity Core steps forward triumphantly, its body radiating intense silver and navy light rays.",
    "voiceDescription": "Sweet, high-pitched, bright, energetic young female",
    "emotion": "triumphant",
    "dialogue": "Time to clear the fog and ignite your inner power!",
    "productInteractionType": "package_hero"
  }
]`;

export const scriptToVideoFlow = ai.defineFlow(
  {
    name: "scriptToVideoFlow",
    inputSchema: z.object({
      message: z.string(),
      productImageUrl: z.string().optional(),
    }),
    outputSchema: z.object({
      reply: z.string(),
    }),
    streamSchema: z.string(),
  },
  async ({ message, productImageUrl }, { sendChunk }) => {
    let prompt = `[USER]: ${message}`;

    if (productImageUrl) {
      prompt += `\n\n[PRODUCT IMAGE ANALYSIS]:
Analyze the uploaded product image to identify:
1. PRIMARY COLOR(S): The dominant colors of the product/packaging.
2. SECONDARY COLOR(S): Accents and branding highlights.
3. CORE THEME: What problem does this product solve?

Apply these rules for the Character-Driven Ad blocks:
- HERO: MUST match the product's primary and secondary colors exactly (e.g., if packaging is dark blue, the hero must be dark blue).
- VILLAINS: MUST represent the problem the product solves (e.g., "Brain Fog", "Fatigue"). Their colors should contrast the hero (murky, dark, or negative tones) and SHOULD NOT match the product colors.
- THEMATIC COHESION: Even with contrasting colors, villains should feel like they belong in a story about the product's benefits.`;
    }

    const { stream, response } = ai.generateStream({
      system: SYSTEM_PROMPT,
      config: {
        thinkingConfig: {
          thinkingBudget: 2000,
          includeThoughts: true,
        },
      },
      prompt: productImageUrl 
        ? [
            { text: prompt },
            { media: { url: productImageUrl } }
          ]
        : prompt,
      tools: getScriptToVideoTools(),
    });

    const toolsQueue: Array<{ name: string; arg: any; response?: any }> = [];

    for await (const chunk of stream) {
      if (chunk.role === "model" && chunk.content?.[0]?.reasoning) {
        sendChunk(
          JSON.stringify({
            event: "reasoning",
            text: chunk.content[0].reasoning,
          }),
        );
      }

      if (chunk.role === "model" && chunk.content?.[0]?.toolRequest) {
        for (let idx = 0; idx < chunk.content.length; idx++) {
          const toolContent = chunk.content[idx];
          if (toolContent.toolRequest) {
            const name = toolContent.toolRequest.name;
            const arg = toolContent.toolRequest.input;
            toolsQueue.push({ name, arg });
          }
        }
      }

      if (chunk.role === "tool" && chunk.content?.[0]?.toolResponse) {
        for (let idx = 0; idx < chunk.content.length; idx++) {
          const toolContent = chunk.content[idx];
          if (toolContent.toolResponse) {
            const name = toolContent.toolResponse.name;
            const responseOutput = toolContent.toolResponse.output;
            const tool = toolsQueue.find((t) => t.name === name && t.response === undefined);
            if (tool) tool.response = responseOutput;
          }
        }
      }
    }

    for (const tool of toolsQueue) {
      sendChunk(
        JSON.stringify({
          event: "tool",
          name: tool.name,
          arg: tool.arg,
          response: tool.response,
        }),
      );
    }

    let { text } = await response;
    
    // Fallback: If the model only used tools and didn't provide a textual reply, 
    // we generate a default summary so the user knows it's working.
    if (!text && toolsQueue.length > 0) {
      const toolNames = toolsQueue.map(t => t.name).join(", ");
      text = `I've successfully updated your video configuration and generated the character-driven ad segments. You should see the updated blocks in the panel to the right.`;
    }

    return { reply: text || "I've processed your request, but no textual reply was generated." };
  },
);
