import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/db';
import { schedulerService } from './services/scheduler.service';

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(env.port, () => {
      logger.info(`MJ Transport ERP API running on http://localhost:${env.port}`);
    });

    await schedulerService.reload();
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

bootstrap();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
