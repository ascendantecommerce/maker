import { db } from "@/lib/database";
import { GeminiService } from "@/lib/gemini/generator";
import { ResolverStatus } from "@/utils/enum";
import { getInngestApp } from "../../index";
import { workflowChannel } from "../../utils/common";
import { ToastType } from "../../utils/types";
import { CHARACTER_AD_SYSTEM_PROMPT } from "@/lib/prompts/assistant-script";

const inngest = getInngestApp();

/**
 * Character-Driven Ad Script Generator
 * 
 * Specialized function for writing creative dialogues and acts for character ads.
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

    // 2. Specialized Gemini Generation
    const result = await step.run("generate-script-content", async () => {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

      const gemini = new GeminiService(apiKey, "gemini-2.5-flash-lite");

      const strictCharacterInstruction = `
CRITICAL LIPSYNC & BRANDING RULES:
1. LIPSYNC CONTROL: Inside your \`videoDescription\`, you MUST explicitly state who is speaking to guide the video generator. Always add: "Only the [Character Name] is speaking and moving their mouth. The human in the background is completely silent with their mouth shut tight."
2. DO NOT hide the human's face. You can keep them in clear view, but you MUST specify they are completely silent.
3. NO TEXT: Do not describe any text, letters, words, logos, or labels on the character itself! If you must describe text, it can ONLY be the character's exact name.

ANTI-HALLUCINATION ROLES:
- Heroes and Villains must be solid 3D characters or anthropomorphized objects that properly embody the core idea or product (e.g., an animated bottle of lotion, a heavy 3D anchor, or an expressive pill).
- You MUST BE THE CREATIVE DESIGNER. Your \`characterDescription\` must fully and realistically define the exact 3D material (like matte plastic, solid metal, smooth vinyl), shape, and expression of the character.
- Avoid literary, abstract, or metaphorical descriptions (e.g., do NOT write "A personified representation of uneven self-tanner"). Instead, describe exactly the physical 3D object the Image Generator should draw (e.g., "A smug, anthropomorphic brown plastic self-tanner bottle with arms, legs, and a mischievous face").
- SCENE REQUIREMENT: Environments MUST ALWAYS be clean, bright, modern, premium Pixar 3D rooms (e.g., well-lit bathroom or bedroom). NEVER use dimly lit, chaotic, abstract, or spooky rooms, even for villains!`;

      const styleInstruction = visualStyle 
        ? `\n\nUSER SELECTED VISUAL STYLE: "${visualStyle}"\nCRITICAL MANDATE: Ensure ALL characterDescription and sceneDescription fields perfectly match this chosen aesthetic.${strictCharacterInstruction}`
        : `\n\nCRITICAL MANDATE: Ensure ALL characterDescription and sceneDescription fields strictly follow a High-end 3D Pixar/Illumination animation style.${strictCharacterInstruction}`;

      return await gemini.generateScriptAssistant({
        message,
        imageUrls,
        schema: previousSchema,
        productName,
        productDescription,
        systemPrompt: CHARACTER_AD_SYSTEM_PROMPT + styleInstruction,
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
