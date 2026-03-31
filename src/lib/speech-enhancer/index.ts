import { PhonosAPI } from "./phonos-api.js";
import { POLLING_INTERVAL_MS, MAX_POLLING_ATTEMPTS } from "./constants.js";
import { randomUUID } from "node:crypto";
import process from "node:process";

const TOKEN =
  "Bearer eyJhbGciOiJSUzI1NiIsIng1dSI6Imltc19uYTEta2V5LWF0LTEuY2VyIiwia2lkIjoiaW1zX25hMS1rZXktYXQtMSIsIml0dCI6ImF0In0.eyJpZCI6IjE3NzM5NDE5ODY0NzFfODk1NjZmYzItOTY0NS00NjNiLWIyMmQtODhjMmRmMjEyNmIzX3VlMSIsInR5cGUiOiJhY2Nlc3NfdG9rZW4iLCJjbGllbnRfaWQiOiJwaG9ub3Mtc2VydmVyLXByb2QiLCJ1c2VyX2lkIjoiNEY4RTIyOUY2ODU3MUVCRTBBNDk1RUVGQEFkb2JlSUQiLCJhcyI6Imltcy1uYTEiLCJhYV9pZCI6IjRGOEUyMjlGNjg1NzFFQkUwQTQ5NUVFRkBBZG9iZUlEIiwiY3RwIjowLCJmZyI6IjJKUTZHWEJUVkxNNUFEVUtGQVFWSUhBQUU0PT09PT09Iiwic2lkIjoiMTc2OTAxNDI3NTcyNV81NmVhMDU1OC0xMmI2LTQzZDctODliOC05NjEwZGJjMTZlYjVfdWUxIiwibW9pIjoiOTQ5Y2I3NTQiLCJwYmEiOiJNZWRTZWNOb0VWLExvd1NlYyIsImV4cGlyZXNfaW4iOiI4NjQwMDAwMCIsInNjb3BlIjoiQWRvYmVJRCxvcGVuaWQsY3JlYXRpdmVfY2xvdWQsYWRkaXRpb25hbF9pbmZvLm93bmVyT3JnIiwiY3JlYXRlZF9hdCI6IjE3NzM5NDE5ODY0NzEifQ.VX9PZvq9wDNtgGBTAjNlVM0myAc48Pw79IB7DrVoXepWnRsS3XYMbd0K9z1DQ5CHiovJiX_TD2KcN5ZXDajtxeYjZ9Kv1Z3Cpjx69m7PgLBXjtI6LHD_ggsxVaaInLAvUxcz7RsPkrncgs-SZ2JczlwML1AKw7MOHeW2ZPFUbQ58gS6lxY87pXtM9k1iVE8Z7l1PJUVU5jwOAOVHhCZ9PIA7efDTGbsD9uDygu93Pt0udiXhCoR1lcEaYdG4UIKedc2mnF-Viyu2ZMB27csj1MeVbAiEFkWtMeEPyBEgArxR-g825wuh0Uym-KV9CDG-iTbZVwKYr68jvCSIAKDqTw";

/**
 * Orchestrates the full speech enhancement pipeline:
 * Upload -> Create Track -> Poll until complete -> Download
 */
async function processAudioEnhancement(filePath: string, token: string) {
  const api = new PhonosAPI(token);
  const trackId = randomUUID();

  try {
    // Step 1: Upload
    console.log("🚀 Step 1/3: Uploading audio file...");
    await api.uploadFile(filePath);

    // Step 2: Track Creation
    console.log("\n🚀 Step 2/3: Creating enhancement track...");
    const serverTrackId = await api.createEnhanceSpeechTrack(trackId);
    console.log(`✅ Track created successfully. (ID: ${serverTrackId})`);

    // Step 3: Polling and Download
    console.log("\n🚀 Step 3/3: Waiting for enhancement to complete...");

    for (let attempt = 1; attempt <= MAX_POLLING_ATTEMPTS; attempt++) {
      const { status, data } = await api.checkEnhancementResult(serverTrackId);

      if (status === 200 && data?.url) {
        console.log("\n✨ Enhancement complete! Processing download...");
        await api.downloadEnhancedAudio(data.url);
        return true;
      }

      if (status === 204) {
        process.stdout.write(
          `\r⏳ Progress: Attempting status check ${attempt}/${MAX_POLLING_ATTEMPTS}...`,
        );
      } else {
        throw new Error(`Unexpected status code while polling: ${status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    }

    throw new Error("Enhancement timed out after maximum attempts.");
  } catch (error: any) {
    console.error(`\n❌ Error during enhancement pipeline: ${error.message}`);
    return false;
  }
}

// CLI Execution Entry Point
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.ts")) {
  const filePath = process.argv[2] || "./output.mp3";

  processAudioEnhancement(filePath, TOKEN)
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

export { processAudioEnhancement };
