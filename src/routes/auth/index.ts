import { FastifyPluginAsync } from 'fastify';

const auth: FastifyPluginAsync = async (fastify) => {
  fastify.post('/token', async (_request, reply) => {
    const apiKey = fastify.jwt.sign({}, { expiresIn: '15m' });
    return (
      reply
        .code(200)
        // Strict RFC 6749 Section 5.1 Mandate: Prevent token leakage in network caches
        .header('cache-control', 'no-store')
        .header('pragma', 'no-cache')
        .send({
          access_token: apiKey,
          token_type: 'Bearer',
          expires_in: 900,
        })
    );
  });
};

export default auth;
