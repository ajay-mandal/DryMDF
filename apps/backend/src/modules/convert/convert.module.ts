import { Module } from "@nestjs/common";
import { ConvertController } from "./convert.controller";
import { ConvertService } from "./convert.service";
import { ConvertProcessor } from "./convert.processor";
import { PdfModule } from "../pdf/pdf.module";
import { MarkdownModule } from "../markdown/markdown.module";
import { WebsocketModule } from "../websocket/websocket.module";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "pdf-generation",
    }),
    PdfModule,
    MarkdownModule,
    WebsocketModule,
  ],
  controllers: [ConvertController],
  providers: [ConvertService, ConvertProcessor],
  exports: [ConvertService],
})
export class ConvertModule {}
