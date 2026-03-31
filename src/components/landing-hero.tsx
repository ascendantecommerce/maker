"use client";
import { Megaphone, GraduationCap, Heart, Zap, VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "./ui/border-beam";
import { useState } from "react";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { Icons } from "./shared/icons";

const ACTIONS = [
  {
    id: "product-promo",
    icon: <VideoIcon className="h-4 w-4" />,
    text: "Create product promo video",
  },
  {
    id: "social-ad",
    icon: <Megaphone className="h-4 w-4" />,
    text: "Generate social media ad",
  },
  {
    id: "educational",
    icon: <GraduationCap className="h-4 w-4" />,
    text: "Make educational explainer",
  },
  {
    id: "ugc-testimonial",
    icon: <Heart className="h-4 w-4" />,
    text: "Create UGC testimonial",
  },
  {
    id: "motivational",
    icon: <Zap className="h-4 w-4" />,
    text: "Generate motivational",
  },
];

export default function LandingHero() {
  const [value, setValue] = useState("");

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });

  const handleSubmit = () => {
    console.log("value", value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        setValue("");
        adjustHeight(true);
      }
    }
  };

  return (
    <div className="selection-accent flex grow flex-col pb-4 sm:pb-6 md:pb-10 mx-auto w-full gap-3 sm:gap-4 pt-12 sm:pt-16 md:pt-24 lg:pt-32 xl:pt-48">
      <div className="mx-2 sm:mx-4 md:mx-6 flex flex-col">
        <div className="mb-4 sm:mb-6 md:mb-8 text-center">
          <h1 className="mb-2 sm:mb-3 md:mb-4 text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold px-2 sm:px-4">
            Create. Publish. Grow.
          </h1>
          <p className="text-sm sm:text-base text-gray-400 px-4 sm:px-6">
            Generate, edit, and <span className="font-medium text-foreground">publish</span> video
            stories <span className="font-medium text-foreground">instantly</span>.
          </p>
        </div>

        <div className="mx-auto mb-3 sm:mb-4 md:mb-6 w-full max-w-sm sm:max-w-xl px-2 sm:px-0">
          <div className="shadow-xs relative rounded-lg backdrop-blur">
            <div className="flex flex-col rounded-lg border bg-secondary/20 p-2.5 sm:p-3 md:p-4">
              <BorderBeam />
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="What can scenify generate for you?"
                className="mb-2.5 sm:mb-3 md:mb-4 h-16 sm:h-20 md:h-20 w-full resize-none bg-transparent outline-none text-sm sm:text-base"
              />

              <div className="mt-auto flex gap-2 sm:gap-3 md:gap-4 justify-between">
                <Button className=" size-7.5 px-2  py-0.5 text-xs" variant="ghost" size="icon">
                  <Icons.settingsSimple size={16} className="size-4" />
                </Button>

                <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                  <Button
                    onClick={handleSubmit}
                    variant="outline"
                    size="icon"
                    className=" size-7.5 px-2  py-0.5 text-xs"
                    title="Send message"
                  >
                    <Icons.arrowUp className="size-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-4 sm:mt-6 md:mt-8 flex w-full max-w-2xl sm:max-w-3xl flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-4 px-2 sm:px-4 md:px-0">
          {ACTIONS.slice(0, 3).map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="outline"
              className="rounded-full px-2 sm:px-3 md:px-4 py-0.5 text-xs"
            >
              {action.icon}
              <span className="hidden md:inline">{action.text}</span>
              <span className="hidden sm:inline md:hidden">
                {action.text.split(" ").slice(0, 3).join(" ")}
              </span>
              <span className="sm:hidden">{action.text.split(" ").slice(0, 2).join(" ")}</span>
            </Button>
          ))}
          {/* Show the 5th button only on medium screens and up */}
          {ACTIONS.slice(3).map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant="outline"
              className="hidden sm:flex rounded-full px-2 sm:px-3 md:px-4 py-0.5 text-xs"
            >
              {action.icon}
              <span className="hidden md:inline">{action.text}</span>
              <span className="hidden sm:inline md:hidden">
                {action.text.split(" ").slice(0, 3).join(" ")}
              </span>
              <span className="sm:hidden">{action.text.split(" ").slice(0, 2).join(" ")}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
