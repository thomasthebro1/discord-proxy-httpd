import { preHandlerHookHandler } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
  }
}
