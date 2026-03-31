import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

// Create a client to send and receive events with realtime support
export const inngest = new Inngest({
  id: "my-app",
  middleware: [realtimeMiddleware()],
});
