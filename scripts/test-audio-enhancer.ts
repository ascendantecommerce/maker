import fs from "fs";
import path from "path";
import os from "os";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { PhonosAPI } from "../src/lib/speech-enhancer/phonos-api";
import { detectLeadingSpike } from "../src/inngest/services/audio-utils";
import { ffmpegAsync } from "../src/inngest/services/ffmpeg";

dotenv.config();

async function testEnhancement() {
  const videoUrl =
    "https://cdn.scenify.io/ugc-videos/oZVCktvO-W6EVCEvg81w1/oZVCktvO-W6EVCEvg81w1-seg-0/trimmed-l-fsuzvDqTk2NV9nnNnJS.mp4";
  const phonosToken = process.env.PHONOS_TOKEN;

  if (!phonosToken) {
    console.error("PHONOS_TOKEN not set in .env");
    return;
  }

  const tmpDir = os.tmpdir();
  const segmentId = "test-segment";
  const runToken = "local";

  const inputVideoPath = path.join(tmpDir, `input-${segmentId}-${runToken}.mp4`);
  const inputAudioPath = path.join(tmpDir, `audio-${segmentId}-${runToken}.mp3`);
  const enhancedAudioPath = path.join(tmpDir, `enhanced-${segmentId}-${runToken}.wav`);
  const outputVideoPath = path.join(process.cwd(), `test-enhanced-output.mp4`);

  try {
    console.log("1. Downloading video...");
    const response = await fetch(videoUrl);
    fs.writeFileSync(inputVideoPath, Buffer.from(await response.arrayBuffer()));

    console.log("2. Extracting Audio...");
    await ffmpegAsync([
      "-y",
      "-i",
      inputVideoPath,
      "-vn",
      "-acodec",
      "libmp3lame",
      "-b:a",
      "128k",
      inputAudioPath,
    ]);

    console.log("3. Enhancing with Phonos...");
    let downloadUrl = "";
    try {
      const phonos = new PhonosAPI(phonosToken);
      await phonos.uploadFile(inputAudioPath);
      const serverTrackId = await phonos.createEnhanceSpeechTrack(randomUUID());

      console.log("Waiting for enhancement result...");
      for (let i = 0; i < 60; i++) {
        const { status, data } = await phonos.checkEnhancementResult(serverTrackId);
        if (status === 200 && data?.url) {
          downloadUrl = data.url;
          break;
        }
        process.stdout.write(".");
        await new Promise((r) => setTimeout(r, 5000));
      }

      if (!downloadUrl) throw new Error("Phonos enhancement timed out");
      console.log("\nDownloading enhanced audio...");
      await phonos.downloadEnhancedAudio(downloadUrl, enhancedAudioPath);
    } catch (phonosErr: any) {
      console.error(
        "\n[Phonos] Enhancement failed (use fallback):",
        phonosErr?.message || phonosErr,
      );
      console.log("FALLBACK: Using original audio to test cleanup logic...");
      // Extract original audio to enhancedAudioPath for testing filters
      await ffmpegAsync([
        "-y",
        "-i",
        inputVideoPath,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-b:a",
        "128k",
        enhancedAudioPath,
      ]);
    }

    console.log("4. Detecting Spikes and Remuxing...");
    // Use applyCleanup = true for testing
    const spikeResult = await detectLeadingSpike(inputVideoPath);
    const leadingSpike = spikeResult.muteRange;
    const isSustainedSpeech = spikeResult.isSustainedSpeech;

    const ffmpegArgs = ["-y", "-i", inputVideoPath, "-i", enhancedAudioPath];
    const audioFilters: string[] = [];

    // Signal Refinement: highpass, declick and aggressive gate
    // We add highpass to kill low-end hum (rumble)
    audioFilters.push(
      "highpass=f=200",
      "adeclick",
      "agate=threshold=0.05:range=0:attack=10:release=100",
    );

    if (leadingSpike) {
      console.log(
        `[AudioEnhancer] Detected surgical spike: ${leadingSpike.start.toFixed(3)}s - ${leadingSpike.end.toFixed(3)}s`,
      );
      audioFilters.push(
        `volume=enable='between(t,${leadingSpike.start},${leadingSpike.end})':volume=0`,
      );
    } else {
      console.log("[AudioEnhancer] No surgical spike detected.");
    }

    // Mandatory mute for the first 250ms (for test) to kill artifacts
    // ONLY if NO sustained speech was detected at the beginning
    if (!isSustainedSpeech) {
      console.log("[AudioEnhancer] Applying speech-safe initial mute (250ms)");
      audioFilters.push("volume=enable='between(t,0,0.25)':volume=0");
    } else {
      console.log("[AudioEnhancer] Skipping initial mute: Start-of-video speech detected.");
    }

    if (audioFilters.length > 0) {
      ffmpegArgs.push("-af", audioFilters.join(","));
    }

    ffmpegArgs.push("-c:v", "copy", "-map", "0:v:0", "-map", "1:a:0", outputVideoPath);

    await ffmpegAsync(ffmpegArgs);

    console.log(`\n✅ Done! Enhanced video saved to: ${outputVideoPath}`);
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    // Clean up temp files except the final output
    [inputVideoPath, inputAudioPath, enhancedAudioPath].forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}

testEnhancement();
