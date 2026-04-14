import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { IClip, getPresetTemplate } from "openvideo";
import { IconMovie, IconLoader2, IconBan } from "@tabler/icons-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  animationOptionsIn,
  animationOptionsOut,
  BASE_IN_PRESETS,
  BASE_OUT_PRESETS,
} from "@/constants/animations";

// Fallback to get template if not exported correctly or available
// Usually openvideo exports it, but just in case we use the clip's method if available
// or a simplified version here.
// BUT we should try to use the library's one.

interface AnimationsPanelProps {
  selectedClips: IClip[];
}

interface AnimationPreset {
  value: string;
  label: string;
  previewStatic?: string;
  previewDynamic?: string;
}

const COMBO_PRESETS: AnimationPreset[] = [
  { label: "Combo Zoom 1", value: "comboZoom1" },
  { label: "Combo Zoom 2", value: "comboZoom2" },
  { label: "Combo Pendulum 1", value: "comboPendulum1" },
  { label: "Combo Pendulum 2", value: "comboPendulum2" },
  { label: "Combo Right Distort", value: "comboRightDistort" },
  { label: "Combo Left Distort", value: "comboLeftDistort" },
  { label: "Combo Wobble", value: "comboWobble" },
  { label: "Combo Spinning Top 1", value: "comboSpinningTop1" },
  { label: "Combo Spinning Top 2", value: "comboSpinningTop2" },
  { label: "Combo Sway Out", value: "comboSwayOut" },
  { label: "Combo Bounce 1", value: "comboBounce1" },
  { label: "Combo Sway In", value: "comboSwayIn" },
];

const TEXT_LIKE_PRESETS: AnimationPreset[] = [
  { label: "Pop", value: "popCaption" },
  { label: "Bounce", value: "bounceCaption" },
  { label: "Scale", value: "scaleCaption" },
  { label: "Slide Left", value: "slideLeftCaption" },
  { label: "Slide Right", value: "slideRightCaption" },
  { label: "Slide Up", value: "slideUpCaption" },
  { label: "Slide Down", value: "slideDownCaption" },
  { label: "Slide Fade By Word", value: "slideFadeByWord" },
  { label: "Up Down", value: "upDownCaption" },
  { label: "Up Left", value: "upLeftCaption" },
  { label: "Char Fade In", value: "charFadeIn" },
  { label: "Char Slide Up", value: "charSlideUp" },
  { label: "Char Typewriter", value: "charTypewriter" },
  { label: "Fade By Word", value: "fadeByWord" },
  { label: "Pop By Word", value: "popByWord" },
  { label: "Scale Fade By Word", value: "scaleFadeByWord" },
  { label: "Bounce By Word", value: "bounceByWord" },
  { label: "Rotate In By Word", value: "rotateInByWord" },
  { label: "Slide Right By Word", value: "slideRightByWord" },
  { label: "Slide Left By Word", value: "slideLeftByWord" },
  { label: "Fade Rotate By Word", value: "fadeRotateByWord" },
  { label: "Skew By Word", value: "skewByWord" },
  { label: "Wave By Word", value: "waveByWord" },
  { label: "Blur In By Word", value: "blurInByWord" },
  { label: "Drop Soft By Word", value: "dropSoftByWord" },
  { label: "Elastic Pop By Word", value: "elasticPopByWord" },
  { label: "Flip Up By Word", value: "flipUpByWord" },
  { label: "Spin In By Word", value: "spinInByWord" },
  { label: "Stretch In By Word", value: "stretchInByWord" },
  { label: "Reveal Zoom By Word", value: "revealZoomByWord" },
  { label: "Float Wave By Word", value: "floatWaveByWord" },
];

export function AnimationsPanel({ selectedClips }: AnimationsPanelProps) {
  if (selectedClips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
        <IconMovie className="size-8 mb-2 opacity-20" />
        <span className="text-sm font-space-grotesk">
          Select a clip to animate
        </span>
      </div>
    );
  }

  return <AnimationsPanelInner clip={selectedClips[0]} />;
}

function AnimationsPanelInner({ clip }: { clip: any }) {
  const [activeTab, setActiveTab] = useState<"in" | "out" | "combo">("in");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onPropsChange = () => setTick((t: number) => t + 1);

    clip.on?.("propsChange", onPropsChange);
    return () => {
      clip.off?.("propsChange", onPropsChange);
    };
  }, [clip]);

  const animations = [...(clip.animations || [])];
  const isImage = clip.type === "Image";
  const isVideo = clip.type === "Video";
  const isTextLike = clip.type === "Text" || clip.type === "Caption";

  const inPresetsRaw = [
    ...BASE_IN_PRESETS,
    ...(isImage || isVideo ? animationOptionsIn : []),
    ...(isTextLike ? TEXT_LIKE_PRESETS : []),
  ];
  const inPresets = Array.from(new Map(inPresetsRaw.map(item => [item.value, item])).values());

  const outPresetsRaw = [
    ...BASE_OUT_PRESETS,
    ...(isImage || isVideo ? animationOptionsOut : []),
  ];
  const outPresets = Array.from(new Map(outPresetsRaw.map(item => [item.value, item])).values());

  const presets =
    activeTab === "in"
      ? inPresets
      : activeTab === "out"
        ? outPresets
        : COMBO_PRESETS;

  const currentAnimation = useMemo(() => {
    const clipDuration = clip.duration || 0;
    const sorted = [...animations].sort(
      (a, b) => a.options.delay - b.options.delay,
    );

    if (activeTab === "in") {
      return sorted.find(
        (a) =>
          a.options.delay === 0 &&
          !a.type.toLowerCase().includes("out") &&
          a.options.duration <= clipDuration,
      );
    }
    if (activeTab === "out") {
      return sorted.find(
        (a) =>
          Math.abs(a.options.delay + a.options.duration - clipDuration) < 50000,
      ); // 50ms tolerance
    }
    if (activeTab === "combo") {
      return sorted.find(
        (a) =>
          a.type.toLowerCase().startsWith("combo") ||
          (a.options.delay === 0 &&
            Math.abs(a.options.duration - clipDuration) < 50000),
      );
    }
    return null;
  }, [animations, activeTab, clip.duration, tick]);

  const handleApplyPreset = (presetValue: string) => {
    if (currentAnimation) {
      clip.removeAnimation(currentAnimation.id);
    }

    if (presetValue === "none") {
      setTick((t: number) => t + 1);
      clip.emit?.("propsChange", {});
      return;
    }

    const clipDurationUs = clip.duration || 0;
    const otherAnims = [...animations].filter((a) => !currentAnimation || a.id !== currentAnimation.id);

    let defaultDur = 1000 * 1000; // 1s default in microseconds
    let safeDelay = 0;
    let safeDur = clipDurationUs;

    if (activeTab === "in") {
      const earliestStart = otherAnims.reduce((min, a) => Math.min(min, a.options.delay), clipDurationUs);
      safeDur = Math.max(0, Math.min(defaultDur, earliestStart));
      safeDelay = 0;
    } else if (activeTab === "out") {
      const latestEnd = otherAnims.reduce((max, a) => Math.max(max, a.options.delay + a.options.duration), 0);
      safeDur = Math.max(0, Math.min(defaultDur, clipDurationUs - latestEnd));
      safeDelay = Math.max(0, clipDurationUs - safeDur);
    } else if (activeTab === "combo") {
      const inAnim = otherAnims.find(a => a.options.delay === 0);
      const outAnim = otherAnims.find(a => Math.abs(a.options.delay + a.options.duration - clipDurationUs) < 100000);
      const minStart = inAnim ? inAnim.options.duration : 0;
      const maxEnd = outAnim ? outAnim.options.delay : clipDurationUs;

      safeDelay = minStart;
      safeDur = Math.max(0, maxEnd - minStart);
    }

    // Attempt to add animation
    try {
      const template = getPresetTemplate(presetValue, {});
      clip.addAnimation(
        presetValue,
        { duration: safeDur, delay: safeDelay, easing: "linear" },
        template,
      );
    } catch (e) {
      console.error("Failed to add animation", e);
      // Fallback if template fails
      clip.addAnimation(presetValue, { duration: safeDur, delay: safeDelay, easing: "linear" }, {});
    }

    setTick((t: number) => t + 1);
    clip.emit?.("propsChange", {});
  };


  return (
    <div className="flex flex-col h-full font-space-grotesk overflow-hidden">
      <div className="p-4 flex-shrink-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full flex">
            <TabsTrigger className="flex-1 capitalize text-xs" value="in">In</TabsTrigger>
            <TabsTrigger className="flex-1 capitalize text-xs" value="out">Out</TabsTrigger>
            <TabsTrigger className="flex-1 capitalize text-xs" value="combo">Combo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 pb-6">
          {/* None Preset */}
          <PresetCard
            label="None"
            isSelected={!currentAnimation}
            onClick={() => handleApplyPreset("none")}
            isNone
          />

          {presets.map((preset) => (
            <PresetCard
              key={preset.value}
              label={preset.label}
              previewStatic={preset.previewStatic}
              previewDynamic={preset.previewDynamic}
              isSelected={currentAnimation?.type === preset.value}
              onClick={() => handleApplyPreset(preset.value)}
            />
          ))}
        </div>
      </ScrollArea>
      {currentAnimation && (
        <AnimationConfigControls
          clip={clip}
          animation={currentAnimation}
          activeTab={activeTab}
          setTick={setTick}
        />
      )}
    </div>
  );
}

interface PresetCardProps {
  label: string;
  previewStatic?: string;
  previewDynamic?: string;
  isSelected: boolean;
  onClick: () => void;
  isNone?: boolean;
}

const PresetCard = React.memo(
  ({
    label,
    previewStatic,
    previewDynamic,
    isSelected,
    onClick,
    isNone,
  }: PresetCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    const currentSrc =
      isHovered && previewDynamic ? previewDynamic : previewStatic;

    return (
      <div
        className="flex flex-col gap-1.5 cursor-pointer group select-none"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            "aspect-square rounded-xl overflow-hidden relative border-[1.5px] transition-all duration-200",
            isSelected
              ? "border-[#009dff] bg-[#009dff]/10"
              : "border-transparent bg-white/10 group-hover:bg-input-primary/80 group-hover:border-border",
          )}
        >
          {isNone ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <IconBan className="size-7 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
            </div>
          ) : (
            <>
              {!isLoaded && previewStatic && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
                  <IconLoader2 className="size-4 animate-spin opacity-20 text-white" />
                </div>
              )}
              {previewStatic ? (
                <img
                  src={currentSrc}
                  alt={label}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-500",
                    isLoaded ? "opacity-100" : "opacity-0",
                  )}
                  onLoad={() => setIsLoaded(true)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <IconMovie className="size-6 text-muted-foreground/20" />
                </div>
              )}
            </>
          )}
        </div>
        <span
          className={cn(
            "text-[10px] text-center font-medium leading-[1.2] truncate px-0.5 transition-colors duration-200",
            isSelected
              ? "text-white font-bold"
              : "text-[#888] group-hover:text-muted-foreground",
          )}
        >
          {label}
        </span>
      </div>
    );
  },
);

PresetCard.displayName = "PresetCard";

function AnimationConfigControls({
  clip,
  animation,
  activeTab,
  setTick,
}: {
  clip: any;
  animation: any;
  activeTab: "in" | "out" | "combo";
  setTick: any;
}) {
  const [isInteracting, setIsInteracting] = useState(false);
  const [localDuration, setLocalDuration] = useState(animation.options.duration / 1000);
  const [localDelay, setLocalDelay] = useState(animation.options.delay / 1000);

  const clipDurationMs = clip.duration / 1000;

  useEffect(() => {
    if (!isInteracting) {
      setLocalDuration(animation.options.duration / 1000);
      setLocalDelay(animation.options.delay / 1000);
    }
  }, [animation, isInteracting]);

  const handleUpdate = (updates: any) => {
    const newOptions = { ...animation.options, ...updates.options };
    const newParams = { ...animation.params, ...updates.params };
    clip.updateAnimation(animation.id, animation.type, newOptions, newParams);
    setTick((t: number) => t + 1);
    clip.emit?.("propsChange", {});
  };

  const handleSliderChange = (vals: number[]) => {
    if (activeTab === "combo") {
      const clampedStart = Math.min(Math.max(vals[0], sliderMin), sliderMax);
      const clampedEnd = Math.min(Math.max(vals[1], sliderMin), sliderMax);
      const finalStart = Math.min(clampedStart, clampedEnd);
      const finalEnd = Math.max(clampedStart, clampedEnd);
      setLocalDelay(finalStart);
      setLocalDuration(finalEnd - finalStart);
    } else {
      setLocalDuration(Math.min(vals[0], sliderMax));
    }
  };

  const handleSliderCommit = (vals: number[]) => {
    let finalVals = vals;
    if (activeTab === "combo") {
      const clampedStart = Math.min(Math.max(vals[0], sliderMin), sliderMax);
      const clampedEnd = Math.min(Math.max(vals[1], sliderMin), sliderMax);
      const finalStart = Math.min(clampedStart, clampedEnd);
      const finalEnd = Math.max(clampedStart, clampedEnd);
      finalVals = [finalStart, finalEnd];

      const newDelay = finalVals[0] * 1000;
      const newDuration = (finalVals[1] - finalVals[0]) * 1000;
      handleUpdate({ options: { delay: newDelay, duration: newDuration } });
    } else if (activeTab === "in") {
      finalVals = [Math.min(vals[0], sliderMax)];
      handleUpdate({ options: { duration: finalVals[0] * 1000, delay: 0 } });
    } else if (activeTab === "out") {
      finalVals = [Math.min(vals[0], sliderMax)];
      const dur = finalVals[0] * 1000;
      handleUpdate({
        options: { duration: dur, delay: Math.max(0, clip.duration - dur) },
      });
    }
  };

  const handleMirrorChange = (checked: boolean) => {
    const newParams = { ...animation.params };
    Object.keys(newParams).forEach((k) => {
      if (k.includes("%")) {
        newParams[k] = { ...newParams[k], mirror: checked ? 1 : 0 };
      }
    });
    handleUpdate({ params: newParams });
  };

  const handleEasingChange = (val: string) => {
    handleUpdate({ options: { easing: val } });
  };

  const hasMirror = Object.values(animation.params || {}).some(
    (p: any) => p && p.mirror > 0,
  );

  const otherAnimations = (clip.animations || []).filter((a: any) => a.id !== animation.id);

  let sliderMin = 0;
  let sliderMax = clipDurationMs;
  let sliderValue = [localDuration];
  let dir: "ltr" | "rtl" = "ltr";

  // Calculate safe bounds
  if (activeTab === "in") {
    const earliestOtherStart = otherAnimations.reduce((min: number, a: any) => Math.min(min, a.options.delay / 1000), clipDurationMs);
    sliderMax = earliestOtherStart;
    sliderValue = [Math.min(localDuration, sliderMax)];
  } else if (activeTab === "out") {
    dir = "rtl";
    const latestOtherEnd = otherAnimations.reduce((max: number, a: any) => Math.max(max, (a.options.delay + a.options.duration) / 1000), 0);
    sliderMax = clipDurationMs - latestOtherEnd;
    sliderValue = [Math.min(localDuration, sliderMax)];
  } else if (activeTab === "combo") {
    const inAnim = otherAnimations.find((a: any) => a.options.delay === 0);
    const outAnim = otherAnimations.find((a: any) => Math.abs(a.options.delay + a.options.duration - clip.duration) < 50000);

    sliderMin = inAnim ? inAnim.options.duration / 1000 : 0;
    sliderMax = outAnim ? outAnim.options.delay / 1000 : clipDurationMs;

    if (sliderMin >= sliderMax) sliderMax = sliderMin + 0.1; // Safety fallback

    let safeDelay = Math.max(sliderMin, localDelay);
    let safeEnd = Math.min(sliderMax, safeDelay + localDuration);
    sliderValue = [safeDelay, safeEnd];
  }

  // Formatting helper
  const formatSecs = (s: number) => {
    return parseFloat(Math.max(0, s / 1000).toFixed(1)) + "s";
  };

  // Determine label for the duration badge based on tab
  const badgeLabel = activeTab === "combo"
    ? `${formatSecs(sliderValue[0])} - ${formatSecs(sliderValue[1])}`
    : formatSecs(sliderValue[0]);

  const trackOverlay = (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full z-10 opacity-70">
      {otherAnimations.map((a: any) => {
        const startPct = ((a.options.delay / 1000) / clipDurationMs) * 100;
        const durPct = ((a.options.duration / 1000) / clipDurationMs) * 100;
        return (
          <div
            key={a.id}
            className="absolute h-full bg-primary/40"
            style={{ left: `${startPct}%`, width: `${durPct}%` }}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex-shrink-0 p-4 border-t border-white/5 pb-6 bg-input-primary rounded-b-sm">

      <div className="flex flex-col gap-4">
        {/* Slider */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            {activeTab === "combo"
              ? "Motion range"
              : "In and out motion duration"}
          </label>
          <div className="flex items-center gap-3">
            <Slider
              dir={dir}
              min={0}
              max={clipDurationMs}
              step={clipDurationMs / 100 || 0.1}
              value={sliderValue}
              onValueChange={handleSliderChange}
              onPointerDown={() => setIsInteracting(true)}
              onPointerUp={() => setIsInteracting(false)}
              onValueCommit={handleSliderCommit}
              trackOverlay={trackOverlay}
              className="flex-1"
            />
            <div className="text-xs bg-[#2a2a2a] px-2 py-1.5 rounded-md min-w-[3.5rem] text-center font-medium shadow-sm">
              {badgeLabel}
            </div>
          </div>
        </div>

        {/* Easing & Mirror */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              Easing
            </label>
            <Select
              value={(animation.options.easing as string) || "linear"}
              onValueChange={handleEasingChange}
            >
              <SelectTrigger className="h-8 text-xs bg-[#2a2a2a] border-white/5 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[250] bg-[#2a2a2a] border-white/5">
                <SelectItem value="linear">Linear</SelectItem>
                <SelectItem value="slow">Slow</SelectItem>
                <SelectItem value="easeInQuad">Ease In Quad</SelectItem>
                <SelectItem value="easeOutQuad">Ease Out Quad</SelectItem>
                <SelectItem value="easeInOutQuad">Ease In Out Quad</SelectItem>
                <SelectItem value="easeInCubic">Ease In Cubic</SelectItem>
                <SelectItem value="easeOutCubic">Ease Out Cubic</SelectItem>
                <SelectItem value="easeInOutCubic">
                  Ease In Out Cubic
                </SelectItem>
                <SelectItem value="easeInBack">Ease In Back</SelectItem>
                <SelectItem value="easeOutBack">Ease Out Back</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {clip.type !== "Text" && (
            <div className="flex flex-col gap-2 items-end">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Mirror
              </label>
              <div className="h-6 flex items-center">
                <Switch
                  checked={hasMirror}
                  onCheckedChange={handleMirrorChange}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
