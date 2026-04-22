import { VideoGenerator } from "../src/lib/video-generation";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("Testing FalVeoProvider via VideoGenerator factory...");

  if (!process.env.FAL_KEY) {
    console.error("FAL_KEY is not set in .env");
    process.exit(1);
  }

  // 1. Test Lite Model (Explicitly specified)
  const liteGenerator = new VideoGenerator({
    provider: "fal-veo",
    params: {
      apiKey: process.env.FAL_KEY,
      model: "fal-ai/veo3.1/lite/image-to-video",
    },
  });

  console.log("\n--- 1. Testing Lite Image-to-Video ---");
  try {
    const result = await liteGenerator.create({
      prompt: "A beautiful sunset over the ocean.",
      style: "cinematic",
      firstFrameUrl:
        "https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png",
      aspectRatio: "16:9",
      durationSeconds: 4,
    });
    console.log("Lite I2V Success:", result);
  } catch (error) {
    console.error("Lite I2V Failed:", error);
  }

  // 2. Test Smart Model Selection (Automatic upgrade to First-Last Frame)
  console.log("\n--- 2. Testing Smart Upgrade to First-Last Frame ---");
  try {
    const result = await liteGenerator.create({
      prompt: "A smooth transition between the two frames.",
      style: "cinematic",
      firstFrameUrl:
        "https://storage.googleapis.com/falserverless/example_inputs/veo31-flf2v-input-1.jpeg",
      lastFrameUrl:
        "https://storage.googleapis.com/falserverless/example_inputs/veo31-flf2v-input-2.jpeg",
      aspectRatio: "16:9",
      durationSeconds: 8,
    });
    console.log("Smart FLF2V Success:", result);
  } catch (error) {
    console.error("Smart FLF2V Failed:", error);
  }

  // 3. Test Reference-to-Video
  console.log("\n--- 3. Testing Reference-to-Video ---");
  try {
    const result = await liteGenerator.create({
      prompt: "A person walking in the park.",
      style: "cinematic",
      referenceImageUrls: [
        "https://storage.googleapis.com/falserverless/example_inputs/veo31-r2v-input-1.png",
      ],
      aspectRatio: "9:16",
      durationSeconds: 8,
    });
    console.log("Reference-to-Video Success:", result);
  } catch (error) {
    console.error("Reference-to-Video Failed:", error);
  }

  // 4. Test Fast Model
  const fastGenerator = new VideoGenerator({
    provider: "fal-veo",
    params: {
      apiKey: process.env.FAL_KEY,
      model: "fal-ai/veo3.1/fast/image-to-video",
    },
  });

  console.log("\n--- 4. Testing Fast Image-to-Video ---");
  try {
    const result = await fastGenerator.create({
      prompt: "A fast moving car on a highway.",
      style: "cinematic",
      firstFrameUrl:
        "https://storage.googleapis.com/falserverless/example_inputs/veo3-i2v-input.png",
      aspectRatio: "16:9",
      durationSeconds: 4,
    });
    console.log("Fast I2V Success:", result);
  } catch (error) {
    console.error("Fast I2V Failed:", error);
  }
}

main().catch((error) => {
  console.error("Test script failed:", error);
  process.exit(1);
});
