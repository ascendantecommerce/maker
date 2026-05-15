import { useCallback, useEffect, useRef } from "react";
import { useSchemaStore } from "@/stores/schema-store";

export function useShotGeneration() {
  const { schema, setSchema, updateShot, generatingShots, setGeneratingShots } = useSchemaStore();

  const handleGenerateStandardImage = useCallback(
    async (segmentId: string, shotIndexStr: string, _type?: string, model?: string, shotTypeOverride?: string) => {
      console.log("generating", { segmentId, shotIndexStr, _type, model, shotTypeOverride });
      const selectedSegment = (schema?.segments || []).find((s) => s.id === segmentId);
      if (!segmentId || !shotIndexStr || !selectedSegment || !schema) return;

      const shotIndex = parseInt(shotIndexStr, 10);
      const targetShot = selectedSegment.shots?.[shotIndex];
      if (!targetShot) return;

      const shotKey = `${segmentId}-${shotIndex}-img`;

      try {
        setGeneratingShots((prev) => ({ ...prev, [shotKey]: true }));
        console.log("shotIndex", shotIndex);
        console.log("shotKey", shotKey);

        // Optimistically update status to show progress instantly
        updateShot(segmentId, shotIndex, { status: "generating", error: undefined });

        const prompt =
          targetShot.firstFramePrompt ||
          targetShot.scenePrompt ||
          selectedSegment.description ||
          "";
        // Use the override from the UI if provided, otherwise fall back to DB value
        const shotType = shotTypeOverride || targetShot.type || "generic";

        const response = await fetch("/api/workflow/generate-shot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemeId: schema.id,
            segmentId,
            shotId: targetShot.id,
            shotIndex,
            prompt,
            shotType,
            mode: "image",
            projectId: null,
            model: model || targetShot.model,
          }),
        });

        if (!response.ok) throw new Error("Failed to start shot generation");
        const { generationId } = await response.json();

        if (generationId) {
          setGeneratingShots((prev) => ({ ...prev, [shotKey]: generationId }));
          updateShot(segmentId, shotIndex, { generationId, status: "generating" });
        }
      } catch (error) {
        console.error("Error initiating single shot generation:", error);
        setGeneratingShots((prev) => ({ ...prev, [shotKey]: false }));
      }
    },
    [schema, setSchema],
  );

  const handleGenerateStandardVideo = useCallback(
    async (segmentId: string, shotIndexStr: string, _type?: string, model?: string, shotTypeOverride?: string) => {
      console.log("generating standard video", { segmentId, shotIndexStr, _type, model, shotTypeOverride });
      const selectedSegment = (schema?.segments || []).find((s) => s.id === segmentId);
      if (!segmentId || !shotIndexStr || !selectedSegment || !schema) return;

      const shotIndex = parseInt(shotIndexStr, 10);
      const targetShot = selectedSegment.shots?.[shotIndex];
      if (!targetShot) return;

      const shotKey = `${segmentId}-${shotIndex}-vid`;

      try {
        setGeneratingShots((prev) => ({ ...prev, [shotKey]: true }));
        updateShot(segmentId, shotIndex, { status: "generating", error: undefined });

        const prompt =
          targetShot.videoPrompt || targetShot.scenePrompt || selectedSegment.description || "";
        // Use the override from the UI if provided, otherwise fall back to DB value
        const shotType = shotTypeOverride || targetShot.type || "generic";

        const response = await fetch("/api/workflow/generate-shot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schemeId: schema.id,
            segmentId,
            shotId: targetShot.id,
            shotIndex,
            prompt,
            shotType,
            mode: "video",
            projectId: null,
            model: model || targetShot.model,
          }),
        });

        if (!response.ok) throw new Error("Failed to start shot video generation");
        const { generationId } = await response.json();

        if (generationId) {
          setGeneratingShots((prev) => ({ ...prev, [shotKey]: generationId }));
          updateShot(segmentId, shotIndex, { generationId, status: "generating" });
        }
      } catch (error) {
        console.error("Error initiating standard video generation:", error);
        setGeneratingShots((prev) => ({ ...prev, [shotKey]: false }));
      }
    },
    [schema, setSchema],
  );

  const pollStatus = useCallback(async () => {
    if (!schema?.id) return;

    const activeShots = Object.entries(generatingShots).filter(([_, genId]) => !!genId);
    if (activeShots.length === 0) return;

    for (const [shotKey, generationId] of activeShots) {
      if (typeof generationId !== "string") continue;

      try {
        const response = await fetch(`/api/workflow/generation/status?id=${generationId}`);
        if (!response.ok) continue;

        const data = await response.json();
        const { status, output } = data;

        if (status === "COMPLETED" || status === "FAILED" || status === "PROGRESS") {
          const parts = shotKey.split("-");
          const type = parts.pop();
          const shotIndexStr = parts.pop();
          const segmentId = parts.join("-");
          const shotIndex = parseInt(shotIndexStr || "0", 10);

          if (status === "COMPLETED") {
            console.log("shot completed", {
              shotKey,
              generationId,
              status,
              output,
              segmentId,
              shotIndex,
              type,
            });
            const url = output?.url;
            if (url) {
              const isVideo = type === "vid";
              if (isVideo) {
                updateShot(segmentId, shotIndex, {
                  videoUrl: url,
                  status: "completed",
                  progress: 100,
                });
              } else {
                updateShot(segmentId, shotIndex, {
                  imageUrl: url,
                  status: "completed",
                  progress: 100,
                });
              }
            }

            setGeneratingShots((prev) => {
              const next = { ...prev };
              delete next[shotKey];
              return next;
            });
          } else if (status === "FAILED") {
            updateShot(segmentId, shotIndex, {
              status: "failed",
              error: output?.error || "Generation failed",
            });

            setGeneratingShots((prev) => {
              const next = { ...prev };
              delete next[shotKey];
              return next;
            });
          } else if (status === "PROGRESS") {
            updateShot(segmentId, shotIndex, { status: "generating", progress: data.progress });
          }
        }
      } catch (e) {
        console.error(`Polling error for ${shotKey}:`, e);
      }
    }
  }, [schema, generatingShots, setSchema]);

  // Resume polling on mount
  const resumedSchemas = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!schema?.id || !schema?.segments) return;
    if (resumedSchemas.current.has(schema.id)) return;

    resumedSchemas.current.add(schema.id);

    const initialGenerating: Record<string, string | boolean> = {};
    let hasResume = false;

    schema.segments.forEach((seg) => {
      seg.shots?.forEach((shot, shotIndex) => {
        if (shot.status === "generating" && shot.generationId) {
          // If we resume from DB state, we don't know for sure if it's image or video from shot.status alone.
          // However, if we don't have videoUrl, it might be image?
          // Since the DB has only one `generationId`, we can guess based on if videoPrompt exists or what's missing.
          // For now, let's just resume it as `-img` or `-vid` depending on what's missing, but to be safe we check.
          const isVidGenerating = shot.videoUrl === undefined && shot.imageUrl !== undefined;
          const type = isVidGenerating ? "vid" : "img";
          const shotKey = `${seg.id}-${shotIndex}-${type}`;
          initialGenerating[shotKey] = shot.generationId;
          hasResume = true;
        }
      });
    });

    if (hasResume) {
      setGeneratingShots((prev) => ({ ...prev, ...initialGenerating }));
    }
  }, [schema?.id, schema?.segments, setGeneratingShots]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (Object.values(generatingShots).some(Boolean)) {
      interval = setInterval(pollStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [generatingShots, pollStatus]);

  return {
    handleGenerateStandardImage,
    handleGenerateStandardVideo,
    generatingShots,
  };
}
