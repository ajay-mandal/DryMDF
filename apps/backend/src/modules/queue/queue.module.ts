import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "pdf-generation",
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
