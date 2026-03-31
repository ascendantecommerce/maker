import { config } from "@/inngest/config";
import { ScrapedData } from "../utils/types";

export async function scrapeUrl(url: string): Promise<ScrapedData> {
  const workerUrl = config.scraper.workerUrl;

  try {
    // STEP 1: Start the scraping job
    const startResponse = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json();
      console.error("Scraper Worker Start Error:", errorData);
      throw new Error(`Failed to start scraping job: ${JSON.stringify(errorData)}`);
    }

    const { jobId } = await startResponse.json();

    // STEP 2: Poll for job completion
    let status: "queued" | "processing" | "done" | "error" = "queued";
    let scrapedData: ScrapedData | null = null;
    const MAX_POLLING_ATTEMPTS = 300; // 300 seconds max
    let attempts = 0;

    while (status !== "done" && status !== "error" && attempts < MAX_POLLING_ATTEMPTS) {
      // Wait 1 second between polls
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;

      const jobResponse = await fetch(`${workerUrl}/${jobId}`);
      if (!jobResponse.ok) {
        console.error(`Failed to fetch job status for ${jobId}`);
        continue;
      }

      const jobData = await jobResponse.json();
      status = jobData.status;

      if (status === "done") {
        scrapedData = jobData.data;
      }
    }

    if (status === "error") {
      throw new Error("Scraping job failed on worker.");
    }

    if (status !== "done" || !scrapedData) {
      throw new Error("Scraping job timed out or returned no data.");
    }

    return scrapedData;
  } catch (err: any) {
    console.error("Scraper Service Error:", err);
    if (err instanceof Error) throw err;
    throw new Error("Unable to scrape URL. Please try again later.");
  }
}
