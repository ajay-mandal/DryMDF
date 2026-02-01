import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class StorageService {
  constructor(private configService: ConfigService) {}

  async upload(_buffer: Buffer, filename: string): Promise<string> {
    const storageType = this.configService.get<string>("storage.type");

    if (storageType === "s3") {
      // TODO: Implement S3 upload
      return `https://example.s3.amazonaws.com/${filename}`;
    }

    // Local storage (for development)
    return `file://${filename}`;
  }
}
