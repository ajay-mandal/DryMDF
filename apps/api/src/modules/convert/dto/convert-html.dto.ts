import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ConvertHtmlDto {
  @ApiProperty({
    description: "Markdown content to convert to HTML",
    example: "# Hello World\n\nThis is **markdown**.",
    minLength: 1,
    maxLength: 500000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500000)
  markdown!: string;
}
