import { db } from "@/lib/database";
import { GeminiService } from "@/lib/gemini/generator";
import { ResolverStatus } from "@/utils/enum";
import { getInngestApp } from "../../index";
import { workflowChannel } from "../../utils/common";
import { ToastType } from "../../utils/types";
import { CHARACTER_AD_SYSTEM_PROMPT, CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA } from "@/lib/prompts/assistant-script";

const inngest = getInngestApp();

/**
 * Character-Driven Ad Script Generator
 * 
 * Generates a script as ordered `segments`, each with a nested `character` object —
 * matching the shape of other video types (UGC, narrative, etc.).
 * The orchestrator's scheme-creator step later expands these into full VideoSchema
 * segments with firstFramePrompt, videoPrompt, etc.
 */
export const generateCharacterAdScript = inngest.createFunction(
  { id: "character-ad-script-generator", concurrency: 5 },
  { event: "character-ad/script.request" },
  async ({ event, step, publish }) => {
    const { message, imageUrls, schemaId, previousSchema, productName, productDescription, visualStyle } = event.data;
    const channel = workflowChannel(schemaId);

    // 1. Initial Status Update
    await step.run("mark-scripting-start", async () => {
      await db
        .updateTable("generations")
        .set({ 
          status: ResolverStatus.PROGRESS, 
          metadata: { message: "AI is writing your character-driven script..." } 
        })
        .where("id", "=", schemaId)
        .execute();
        
      await publish({
        channel,
        topic: "steps",
        data: {
          type: ToastType.STEP_START,
          step: "Scripting",
          message: "Our creative writer is crafting your story...",
        },
      });
    });

    // 2. Specialized Gemini Generation — produces segments with character objects
    const result = await step.run("generate-script-content", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

      const gemini = new GeminiService(apiKey, "gemini-2.5-flash-lite");

      const strictCharacterInstruction = `
CRITICAL LIPSYNC & BRANDING RULES:
1. LIPSYNC CONTROL: Inside each segment's \`videoDescription\`, you MUST explicitly state who is speaking. Always add: "Only the [Character Name] is speaking and moving their mouth. The human in the background is completely silent with their mouth shut tight."
2. DO NOT hide the human's face. You can keep them in clear view, but they must be completely silent.
3. NO TEXT: Do not describe any text, letters, words, logos, or labels on the character itself.

OUTPUT FORMAT — SEGMENTS WITH CHARACTER:
- Output \`segments\` (NOT \`blocks\`). Each segment represents one scene.
- DIALOGUE PATTERN: EVERY segment's dialogue MUST start with: "Hi, I’m [Character Name]." or "Hi, I’m a [Character Name]..."
- Each segment MUST have a \`character\` object with: name, role, visualDescription, voiceDescription.
- \`character.visualDescription\` MUST be a LITERAL physical description of the 3D object/mascot (e.g., "A smug anthropomorphic brown plastic self-tanner bottle with arms, legs, and a mischievous Pixar face"). NEVER use metaphorical descriptions.
- Characters with the same name share the same visual — re-use the same \`name\` for recurring characters.
- \`sceneDescription\` MUST always be a cleanly lit, premium, modern Pixar 3D interior. NEVER dark, gloomy, or abstract.`;

      const styleInstruction = visualStyle 
        ? `\n\nUSER SELECTED VISUAL STYLE: "${visualStyle}"\nCRITICAL MANDATE: Ensure ALL character.visualDescription and sceneDescription fields perfectly match this chosen aesthetic.${strictCharacterInstruction}`
        : `\n\nCRITICAL MANDATE: Ensure ALL character.visualDescription and sceneDescription fields strictly follow a High-end 3D Pixar/Illumination animation style.${strictCharacterInstruction}`;

      return await gemini.generateScriptAssistant({
        message,
        imageUrls,
        schema: previousSchema,
        productName,
        productDescription,
        systemPrompt: CHARACTER_AD_SYSTEM_PROMPT + styleInstruction,
        outputSchema: CHARACTER_AD_SCRIPT_OUTPUT_SCHEMA,
      });
    });

    // 3. Persist the generated script to the generation record
    await step.run("save-script-result", async () => {
      await db
        .updateTable("generations")
        .set({ 
          input: result, 
          status: ResolverStatus.COMPLETED,
          metadata: { message: "Scripting complete." }
        })
        .where("id", "=", schemaId)
        .execute();
    });

    // 4. Notify Frontend
    await step.run("notify-success", async () => {
      await publish({
        channel,
        topic: "script/generate.complete",
        data: {
          result,
          schemaId,
        },
      });

      await publish({
        channel,
        topic: "steps",
        data: {
          type: ToastType.STEP_END,
          step: "Scripting",
          message: "Script generated successfully!",
        },
      });
    });

    return result;
  }
);
