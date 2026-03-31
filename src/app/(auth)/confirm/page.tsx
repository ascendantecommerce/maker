"use client";
import Link from "next/link";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import ScenifyIcon from "@/components/logos/scenify";

export default function AuthenticationPage() {
  const router = useRouter();
  return (
    <main className="bg-main-bg w-screen h-screen flex justify-center relative">
      <div className="h-screen w-screen flex flex-col relative">
        <div className="h-20 px-5 flex items-center absolute">
          <div>
            <Link href="/">
              <ScenifyIcon className="h-6" />
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <div className="flex flex-col space-y-4 text-center">
              <div className="flex items-center justify-center">
                <Icons.checkCircle className="size-10 text-brand" />
              </div>
              <h1 className="text-xl font-semibold">Check your email</h1>
              <p className=" text-muted-foreground">
                We've sent you a magic link to user@ntail.com, Click the link in your inbox to sign
                in securely,
              </p>
            </div>
            <div className="flex items-center justify-center mt-4">
              <Button
                variant={"secondary"}
                onClick={() => router.push("/")}
                className="border border-border h-12 rounded-full has-[>svg]:px-6"
              >
                <Icons.arrowLeft className="size-4" />
                Back to home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
