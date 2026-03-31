"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModalStore } from "@/stores/use-modal-store";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Icons } from "@/components/shared/icons";
import GithubIcon from "@/components/logos/github";
import GoogleIcon from "@/components/logos/google";
import { useRouter } from "next/navigation";

const SigninModal = () => {
  const { modalSignin, setModalSignin } = useModalStore();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isLoadingGitHub, setIsLoadingGitHub] = React.useState<boolean>(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState<string>("");
  const router = useRouter();

  //function validate email true if temporary, false if valid
  async function isDisposableEmail(email: string): Promise<boolean> {
    if (1) {
      return false;
    }
    const response = await fetch(`https://api.recheck.email/?email=${email}`);
    const data = await response.json();
    return data.isDisposable;
  }

  const signinGit = async () => {
    try {
      setIsLoadingGitHub(true);
      await authClient.signIn.social({
        provider: "github",
        callbackURL: "/",
      });
    } catch (error) {
      console.error("GitHub sign-in error:", error);
    } finally {
      setIsLoadingGitHub(false);
    }
  };

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

  const authWithMagicLink = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setIsLoading(true);
    const isValid = await isDisposableEmail(email);
    if (isValid === false) {
      await authClient.signIn.magicLink(
        {
          email: email,
          callbackURL: "/",
        },
        {
          onSuccess: (_ctx) => {
            setIsLoading(false);
            setModalSignin(false);
            if (router) {
              router.push("/confirm");
            }
          },
          onError: (_ctx) => {
            setIsLoading(false);
          },
        },
      );
    } else {
      toast("This email is disposable", {});
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={modalSignin} onOpenChange={setModalSignin}>
      <DialogContent
        className=" md:max-w-[360px] bg-card opacity-100 border-none rounded-lg border px-6 py-12 text-center"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold mb-2 text-center">
            Log in or sign up
          </DialogTitle>
          <p className="text-muted-foreground text-sm mb-6 text-center">
            You'll get smarter responses and can upload files, images, and more.
          </p>
        </DialogHeader>

        <form onSubmit={authWithMagicLink} className="flex flex-col gap-6">
          {/* Social Login Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={true}
              onClick={signInWithGoogle}
              className="border border-border h-12 rounded-full"
            >
              {isLoadingGoogle ? (
                <Icons.spinner className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon className="mr-3 h-5 w-5" />
              )}
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={true}
              onClick={signinGit}
              className="border border-border h-12 rounded-full"
            >
              {isLoadingGitHub ? (
                <Icons.spinner className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <GithubIcon className="mr-3 h-5 w-5" />
              )}
              Continue with GitHub
            </Button>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-2 w-full">
            <Separator className="flex-1 !h-[1px] bg-white/20" />
            <span className="text-white text-xs font-medium">OR</span>
            <Separator className="flex-1 !h-[1px] bg-white/20" />
          </div>

          {/* Email Input */}
          <div className="flex flex-col gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-full border border-border"
              placeholder="Email address"
              required
            />
          </div>

          {/* Continue Button */}
          <Button type="submit" className="h-12 rounded-full" disabled={isLoading}>
            {isLoading ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SigninModal;
