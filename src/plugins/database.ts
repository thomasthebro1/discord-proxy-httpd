import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../lib/prisma/client.js';

console.log(
  process.env.DATABASE_HOST,
  process.env.DATABASE_USER,
  process.env.DATABASE_PASSWORD,
  process.env.DATABASE_NAME,
  process.env.DATABASE_URL,
);

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  const adapter = new PrismaMariaDb({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 5,
  });

  const prisma = new PrismaClient({ adapter });

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (server) => {
    await server.prisma.$disconnect();
  });
};

export default fp(dbPlugin);
