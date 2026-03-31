"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { Icons } from "./shared/icons";

const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/explore", label: "Explore", icon: Icons.home },
    { href: "/creations", label: "Creations", icon: Icons.video },
    { href: "/voices", label: "Voices", icon: Icons.voice },
    { href: "/assets", label: "Assets", icon: Icons.assetsPlus },
    { href: "/developers", label: "Developers", icon: Icons.code },
  ];

  return (
    <div className="w-[260px] shrink-0 fixed left-0 top-[68px] bottom-0 border-r border-border">
      <div className="p-4">
        <Button
          className="w-full bg-brand text-white hover:bg-brand/90 "
          onClick={() => router.push("/")}
        >
          Start a new video
        </Button>
        <div className="mt-4 flex flex-col gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "flex items-center gap-3 px-3 py-2 h-9 rounded-md transition-colors justify-start",
                  isActive
                    ? "bg-secondary font-semibold"
                    : "hover:bg-secondary text-muted-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
