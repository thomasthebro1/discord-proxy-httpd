import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { FastifyPluginAsync } from 'fastify';
import autoload from '@fastify/autoload';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // Register Zod compilers
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  // Load Plugins
  fastify.register(autoload, {
    dir: join(__dirname, 'plugins'),
    options: { ...opts },
  });

  // Load Routes
  fastify.register(autoload, {
    dir: join(__dirname, 'routes'),
    options: { ...opts, prefix: '/api' },
  });
};

export default app;
