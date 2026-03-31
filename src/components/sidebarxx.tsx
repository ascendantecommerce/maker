import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    id: "my-videos",
    label: "My Videos",
    icon: Icons.film,
    active: true,
  },
  {
    id: "voices",
    label: "Voices",
    icon: Icons.film,
  },
  {
    id: "assets",
    label: "Assets",
    icon: Icons.equalizer,
  },
  {
    id: "developers",
    label: "Developers",
    icon: Icons.code,
  },
];

export function Sidebar({ className }: SidebarProps) {
  return (
    <div
      className={cn(
        "w-[260px] h-full border-r border-black/20 flex flex-col p-5 gap-6 pt-10",
        className,
      )}
    >
      {/* Start a new video button */}
      <Button
        className="w-full h-button-sm bg-primary-custom text-white font-semibold text-sm py-3 px-4 rounded-md hover:bg-primary-custom/90 transition-colors w-["
        size="lg"
      >
        Start a new video
      </Button>

      {/* Navigation items */}
      <nav className="flex flex-col gap-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors h-[45px]",
                item.active
                  ? "bg-accent"
                  : "text-muted-foreground hover:text-white hover:bg-accent/50",
              )}
            >
              <Icon className="size-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
