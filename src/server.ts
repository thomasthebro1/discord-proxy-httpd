import 'dotenv/config';
import Fastify from 'fastify';
import app from './app.js';
import { ZodTypeProvider } from 'fastify-type-provider-zod';

const server = Fastify({
  logger: true,
  trustProxy: true,
}).withTypeProvider<ZodTypeProvider>();

// Register our autoload logic
server.register(app);

server.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
