"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { JobProgress } from "@/types/pdf";

export function useJobProgress(clientId: string) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!clientId) return;

    // Connect to WebSocket
    const socket = io(
      (process.env.NEXT_PUBLIC_WS_URL as string) || "ws://localhost:4000",
      {
        auth: {
          sessionId: clientId,
        },
        query: {
          sessionId: clientId,
        },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      },
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ WebSocket connected");
    });

    socket.on("disconnect", () => {
      console.log("🔌 WebSocket disconnected");
    });

    socket.on("job-progress", (data: JobProgress) => {
      console.log("📊 Job progress:", data);
      setProgress(data);
    });

    socket.on("error", (error: Error) => {
      console.error("❌ WebSocket error:", error);
    });

    return () => {
      socket.disconnect();
    };
  }, [clientId]);

  return { progress };
}
