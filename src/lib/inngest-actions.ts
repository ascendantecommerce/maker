"use server";

import { getSubscriptionToken } from "@inngest/realtime";
import type { Realtime } from "@inngest/realtime";
import { getInngestApp } from "@/inngest";
import { resolveProgressChannel } from "@/inngest/channels";

export async function fetchSubscriptionToken(): Promise<
  Realtime.Token<typeof resolveProgressChannel, ["status"]>
> {
  const inngest = getInngestApp();
  const token = await getSubscriptionToken(inngest, {
    channel: resolveProgressChannel(),
    topics: ["status"],
  });

  return token;
}
