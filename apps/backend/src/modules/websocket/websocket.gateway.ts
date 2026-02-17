import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";

interface JobProgress {
  stage: string;
  progress: number;
  message?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebsocketGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit() {
    this.logger.log("WebSocket gateway initialized");
  }

  handleConnection(client: Socket) {
    const sessionId =
      (client.handshake.auth?.sessionId as string | undefined) ||
      (client.handshake.query?.sessionId as string | undefined) ||
      "unknown";

    if (sessionId !== "unknown") {
      client.join(sessionId);
    }

    this.logger.log(
      `Client connected: id=${client.id}, sessionId=${sessionId}`,
    );
  }

  handleDisconnect(client: Socket) {
    const sessionId =
      (client.handshake.auth?.sessionId as string | undefined) ||
      (client.handshake.query?.sessionId as string | undefined) ||
      "unknown";

    this.logger.log(
      `Client disconnected: id=${client.id}, sessionId=${sessionId}`,
    );
  }

  sendProgress(clientId: string, data: JobProgress) {
    this.server.to(clientId).emit("job-progress", data);
  }
}
