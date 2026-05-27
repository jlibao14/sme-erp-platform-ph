import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('WEB_APP_URL', 'http://localhost:3000'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI: served at /api/docs, raw spec at /api/docs-json.
  // The JSON spec is the source of truth for the Flutter Dart client codegen.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SME ERP Platform PH API')
    .setDescription('Multi-tenant ERP API for Philippine SMEs')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
}

bootstrap();
