import { preHandlerHookHandler } from 'fastify';
import { PrismaClient } from '../lib/prisma/client.ts';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: preHandlerHookHandler;
  }
}
