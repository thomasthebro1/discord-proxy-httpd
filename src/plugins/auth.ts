import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyPluginAsync } from 'fastify';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Enforce configuration check immediately when the plugin initialises
  if (!process.env.JWT_SECRET) {
    fastify.log.fatal(
      'JWT_SECRET environment variable is missing. The proxy cannot sign or verify API keys without it. Please set JWT_SECRET in your environment or .env file.',
    );
    process.exit(1);
  }

  // Register JWT functionality
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET,
  });

  fastify.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
};

export default fp(authPlugin);
