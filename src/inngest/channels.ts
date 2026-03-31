import { channel, topic } from "@inngest/realtime";

// Create a channel for progress updates
export const resolveProgressChannel = channel("resolve-schema-progress").addTopic(
  topic("status").type<{
    status: string;
    message: string;
    progress?: number;
  }>(),
);
