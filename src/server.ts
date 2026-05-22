import Fastify from 'fastify';
import app from './app.js';

const server = Fastify({
  logger: true,
});

// Register our autoload logic
server.register(app);

server.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
});
