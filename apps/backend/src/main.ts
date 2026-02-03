import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const apiPrefix = configService.get<string>("API_PREFIX", "api");
  const corsOrigin = configService.get<string>(
    "CORS_ORIGIN",
    "http://localhost:3000",
  );

  // Enable CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("DryPDF API")
    .setDescription(
      "API documentation for DryPDF - Markdown to PDF converter service with Mermaid support",
    )
    .setVersion("1.0")
    .addTag("convert", "Markdown conversion endpoints")
    .addTag("health", "Health check endpoints")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(
    `📚 API Documentation: http://localhost:${port}/${apiPrefix}/docs`,
  );
}

bootstrap();
