import { initializeUgcServices } from "./src/inngest/functions/ugc/index";

async function run() {
  console.log("Initializing services...");
  const services = initializeUgcServices();
  const elevenlabs = services.elevenlabs;

  console.log("Fetching voices...");
  const listResponse = await elevenlabs.voices.getAll();
  const clonedVoices = (listResponse.voices || []).filter(
    (v: any) => v.category === "cloned" || v.category === "generated",
  );

  console.log(`Found ${clonedVoices.length} cloned voices. Deleting...`);

  for (const voice of clonedVoices) {
    try {
      console.log(`Deleting voice ${voice.name} (${voice.voiceId})...`);
      await elevenlabs.voices.delete(voice.voiceId);
    } catch (e: any) {
      console.error(`Failed to delete voice ${voice.voiceId}:`, e?.message || e);
    }
  }

  console.log("Done.");
}

run().catch(console.error);
