import {
  IsString,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class MarginsDto {
  @ApiPropertyOptional({ example: "20mm", description: "Top margin" })
  @IsOptional()
  @IsString()
  top?: string;

  @ApiPropertyOptional({ example: "20mm", description: "Right margin" })
  @IsOptional()
  @IsString()
  right?: string;

  @ApiPropertyOptional({ example: "20mm", description: "Bottom margin" })
  @IsOptional()
  @IsString()
  bottom?: string;

  @ApiPropertyOptional({ example: "20mm", description: "Left margin" })
  @IsOptional()
  @IsString()
  left?: string;
}

class PdfOptionsDto {
  @ApiPropertyOptional({
    enum: ["a4", "letter", "legal"],
    default: "a4",
    description: "Page format",
  })
  @IsEnum(["a4", "letter", "legal"])
  @IsOptional()
  format?: "a4" | "letter" | "legal";

  @ApiPropertyOptional({
    type: MarginsDto,
    description: "Page margins",
  })
  @ValidateNested()
  @Type(() => MarginsDto)
  @IsOptional()
  margins?: MarginsDto;

  @ApiPropertyOptional({
    default: false,
    description: "Show header and footer",
  })
  @IsBoolean()
  @IsOptional()
  showHeaderFooter?: boolean;

  @ApiPropertyOptional({
    description: "Custom header template (HTML)",
  })
  @IsString()
  @IsOptional()
  headerTemplate?: string;

  @ApiPropertyOptional({
    description: "Custom footer template (HTML)",
  })
  @IsString()
  @IsOptional()
  footerTemplate?: string;
}

export class ConvertPdfDto {
  @ApiProperty({
    description: "Markdown content to convert",
    example: "# Hello World\n\nThis is **markdown**.",
    minLength: 1,
    maxLength: 500000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500000)
  markdown!: string;

  @ApiProperty({
    description: "Client ID for WebSocket progress updates",
    example: "client-123456",
  })
  @IsString()
  clientId!: string;

  @ApiPropertyOptional({
    type: PdfOptionsDto,
    description: "PDF generation options",
  })
  @ValidateNested()
  @Type(() => PdfOptionsDto)
  @IsOptional()
  options?: PdfOptionsDto;
}
