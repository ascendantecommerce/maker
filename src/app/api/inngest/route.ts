import { serve } from "inngest/next";
import { getInngestApp } from "@/inngest";
import { functions } from "@/inngest/functions";

const inngest = getInngestApp();

// Create an API that serves all registered functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
