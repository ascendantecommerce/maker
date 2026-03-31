"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import GoogleIcon from "@/components/logos/google";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isLoadingGoogle, setIsLoadingGoogle] = React.useState<boolean>(false);

  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/home");
    }
  }, [session, isPending, router]);

  const signInWithGoogle = async () => {
    try {
      setIsLoadingGoogle(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  if (isPending) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-card">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-card">
      <div className="max-w-90 w-full p-8 border border-border rounded-xl bg-background flex flex-col items-center text-center">
        <h1 className="text-2xl font-semibold mb-2">
          Log in or sign up
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          You'll get smarter responses and can upload files, images, and more.
        </p>

        <Button
          type="button"
          variant="secondary"
          disabled={isLoadingGoogle}
          onClick={signInWithGoogle}
          className="w-full border border-border h-12 rounded-full"
        >
          {isLoadingGoogle ? (
            <Icons.spinner className="mr-3 h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="mr-3 h-5 w-5" />
          )}
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
