"use client";
import * as Sentry from "@sentry/nextjs";
import { usePostHog } from "posthog-js/react";

import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useMemo } from "react";
import { data } from "./data";
import { nanoid } from "nanoid";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { fetchRealtimeToken } from "@/components/inngest/get-realtime-token";
import { ToastType } from "@/inngest/utils/types";

interface StatusMessage {
  status: string;
  message: string;
  progress?: number;
}

type StepEvent = {
  type: ToastType;
  step?: string;
  stepIndex?: number;
  message?: string;
  error?: string;
  resultUrl?: string;
};

function InngestRealtime({ schemeId }: { schemeId: string }) {
  const refreshToken = useCallback(() => {
    console.log("Fetching token for scheme:", schemeId);
    return fetchRealtimeToken(schemeId);
  }, [schemeId]);

  const { latestData, state } = useInngestSubscription({
    enabled: !!schemeId,
    refreshToken,
  });

  useEffect(() => {
    if (!latestData) return;
    const payload = latestData.data as StepEvent;
    if (!payload?.type) return;

    console.log("Inngest Event Received:", payload);
  }, [latestData]);

  useEffect(() => {
    if (state === "error") {
      console.error("⚠ Realtime connection error — check your Inngest config.");
    }
  }, [state]);

  return null;
}

export default function Page() {
  const [schemeId, setSchemeId] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ data: StatusMessage; timestamp: number }>>([]);
  const [error, setError] = useState<Error | null>(null);
  const posthog = usePostHog();

  useEffect(() => {
    Sentry.setTag("page_name", "playground-test");

    // Recupera el ID si se recarga la página
    const savedSchemeId = localStorage.getItem("inngest_scheme_id");
    if (savedSchemeId) {
      setSchemeId(savedSchemeId);
    }
  }, []);

  const handleGenerate = async () => {
    console.log("Generate");
    posthog.capture("playground_generate_clicked");

    try {
      setError(null);
      setMessages([]);

      const newSchemeId = nanoid();
      setSchemeId(newSchemeId);
      localStorage.setItem("inngest_scheme_id", newSchemeId);

      const response = await fetch("/api/resolve-schema", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheme: {
            id: newSchemeId,
            script:
              "Ever wonder why some trips feel magical and others... just okay?\n\nThe secret isn't just the destination, it's how you prepare. Stop overpacking your schedule! Instead, pick one or two must-do experiences and leave room for spontaneity. Embrace the unexpected coffee shop, the hidden alleyway, or that random conversation with a local. Those are the moments you'll actually remember.\n\nDon't chase perfection; chase discovery.\n\nFollow for more travel tips!",
            voice: {
              id: "CwhRBWXzGAHq8TQ4Fs17",
              name: "Roger - Laid-Back, Casual, Resonant",
              language: "en",
              gender: "male",
              accent: "american",
              previewUrl:
                "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
              supportedLanguages: ["en", "fr", "de", "nl", "es"],
              verifiedLanguages: [
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "en",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3",
                  accent: "american",
                  locale: "en-US",
                },
                {
                  language: "fr",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/042d9b70-5927-4630-985e-e95107b74ec2.mp3",
                  accent: "standard",
                  locale: "fr-FR",
                },
                {
                  language: "de",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/fa6a7658-18a9-4634-a96f-95dc3c47629d.mp3",
                  accent: "standard",
                  locale: "de-DE",
                },
                {
                  language: "nl",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/12a2ba8b-4fb3-44b6-9bc7-da0afd076fc9.mp3",
                  accent: "standard",
                  locale: "nl-NL",
                },
                {
                  language: "es",
                  previewUrl:
                    "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/f172f037-5e23-44ea-a08e-56ddb6447d5b.mp3",
                  accent: "standard",
                  locale: "es-ES",
                },
              ],
              quality: "High Quality",
              description: "Easy going and perfect for casual conversations.",
            },
            aspectRatio: "9:16",
            visuals: {
              type: "STOCK_VIDEOS",
              style:
                "A style that closely mimics the visual appearance of reality, focusing on accuracy and detail.",
            },
            caption: {
              id: "will",
              name: "Will",
              position: "bottom",
              size: "medium",
            },
            assets: [],
            secondsPerImage: 1.5,
            pacing: "fast",
            executionMode: "live",
          },
        }),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (!data.ok || !data.id) {
        setError(new Error("Failed to start scheme resolution"));
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    }
  };

  const handleSchemaToScene = async () => {
    try {
      const response = await fetch("/api/convert-schema-to-scene", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schema: data.schema,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to convert schema: ${response.status}`);
      }

      const result = await response.json();
    } catch (error) {
      console.error("Error converting schema to scene:", error);
      setError(error instanceof Error ? error : new Error("Unknown error"));
    }
  };
  const [activeTab, setActiveTab] = useState<"generator" | "analytics">("generator");

  const handleTriggerClientError = () => {
    console.log("Triggering client error...");
    throw new Error("Intentional Client Debug Error from Playground");
  };

  const handleCapturePostHogEvent = () => {
    console.log("Capturing custom PostHog event...");
    posthog.capture("playground_custom_event", {
      timestamp: new Date().toISOString(),
      user_action: "debug_button_click",
    });
    alert("Event captured in PostHog!");
  };

  const handleServerAction = async (action: "trigger_error" | "capture_event") => {
    try {
      const response = await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message || "Server action successful!");
      } else {
        alert("Server action failed: " + data.error);
      }
    } catch (err) {
      console.error("Failed to run server action:", err);
      alert("Error calling debug API");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {schemeId && <InngestRealtime key={schemeId} schemeId={schemeId} />}
      <div className="flex gap-4 mb-8 border-b border-border">
        <button
          onClick={() => setActiveTab("generator")}
          className={`pb-2 px-4 transition-colors ${activeTab === "generator" ? "border-b-2 border-primary text-primary font-bold" : "text-muted-foreground"}`}
        >
          Generator
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`pb-2 px-4 transition-colors ${activeTab === "analytics" ? "border-b-2 border-primary text-primary font-bold" : "text-muted-foreground"}`}
        >
          Analytics Debug
        </button>
      </div>

      {activeTab === "generator" ? (
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleGenerate}>Generate</Button>
            <Button onClick={handleSchemaToScene} variant="outline">
              schema to scene
            </Button>
          </div>
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Status Log:</h2>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">State:</div>
              {schemeId && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Scheme ID: {schemeId}
                </div>
              )}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">Error: {error.message}</div>
              )}

              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Message History:</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {messages.length === 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      No messages yet. Click Generate to start.
                    </div>
                  )}
                  {messages.map((message, idx) => (
                    <div
                      key={`${message.timestamp}-${idx}`}
                      className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-900 p-2 rounded"
                    >
                      {message.data.status}: {message.data.message}
                      {message.data.progress !== undefined && ` (${message.data.progress}%)`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <h3 className="text-lg font-bold mb-4">Client-Side Verification</h3>
            <div className="flex flex-wrap gap-4">
              <Button onClick={handleTriggerClientError} variant="destructive">
                Trigger Client Sentry Error
              </Button>
              <Button onClick={handleCapturePostHogEvent} variant="secondary">
                Capture PostHog Custom Event
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Testing tips: Open browser console. Custom events should appear in PostHog Live
              Events. Sentry errors appear in Issues tab.
            </p>
          </div>

          <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
            <h3 className="text-lg font-bold mb-4">Server-Side Verification</h3>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => handleServerAction("trigger_error")} variant="destructive">
                Trigger Server Sentry Error
              </Button>
              <Button onClick={() => handleServerAction("capture_event")} variant="secondary">
                Capture Server PostHog Event
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              These call the /api/debug endpoint to verify that server-side tracking via
              posthog-node and sentry/nextjs server instrumentation is active.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
