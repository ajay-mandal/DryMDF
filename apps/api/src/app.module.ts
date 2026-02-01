import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bull";
import { CacheModule } from "@nestjs/cache-manager";

import configuration from "./config/configuration";
import { HealthModule } from "./modules/health/health.module";
import { ConvertModule } from "./modules/convert/convert.module";
import { PdfModule } from "./modules/pdf/pdf.module";
import { MarkdownModule } from "./modules/markdown/markdown.module";
import { StorageModule } from "./modules/storage/storage.module";
import { QueueModule } from "./modules/queue/queue.module";
import { WebsocketModule } from "./modules/websocket/websocket.module";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 10, // 10 requests
      },
    ]),

    // Bull Queue with Redis
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || "0", 10),
        },
      }),
    }),

    // Cache with memory store (Redis optional)
    CacheModule.register({
      isGlobal: true,
      ttl: 3600, // 1 hour default (in seconds)
      max: 100, // maximum number of items in cache
    }),

    // Feature modules
    HealthModule,
    ConvertModule,
    PdfModule,
    MarkdownModule,
    StorageModule,
    QueueModule,
    WebsocketModule,
  ],
})
export class AppModule {}
