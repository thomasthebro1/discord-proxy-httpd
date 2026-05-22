import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

// Discord API Base
const DISCORD_API = 'https://discord.com/api/v10/webhooks';

// Type definitions for our URL parameters
interface WebhookParams {
  id: string;
  token: string;
  messageId?: string;
}

const webhooks: FastifyPluginAsync = async (fastify) => {
  /**
   * Core Request Handler
   * Acts as a generic proxy to the Discord Webhook API
   */
  const handleDiscordRequest = async (
    request: FastifyRequest<{ Params: WebhookParams }>,
    reply: FastifyReply,
  ) => {
    const { id, token, messageId } = request.params;

    // Construct URL dynamically based on whether a messageId exists
    let url = `${DISCORD_API}/${id}/${token}`;
    if (messageId) url += `/messages/${messageId}`;

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: { 'Content-Type': 'application/json' },
        // Pass body only for mutation methods
        body: ['POST', 'PATCH'].includes(request.method)
          ? JSON.stringify(request.body)
          : undefined,
      });

      // Handle 204 No Content (standard for Discord DELETE)
      if (response.status === 204) return reply.status(204).send();

      const data = await response.json();
      return reply.status(response.status).send(data);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Proxy Error' });
    }
  };

  /**
   * Base Webhook Operations
   * Supports: Get, Modify, Delete, and Execute Webhook
   * @see https://docs.discord.com/developers/resources/webhook#get-webhook
   */
  fastify.route({
    method: ['GET', 'POST', 'PATCH', 'DELETE'],
    url: '/:id/:token',
    handler: handleDiscordRequest,
  });

  /**
   * Webhook Message Operations
   * Supports: Get, Edit, and Delete existing Webhook Messages
   * @see https://discord.com/developers/docs/resources/webhook#get-webhook-message
   */
  fastify.route({
    method: ['GET', 'PATCH', 'DELETE'],
    url: '/:id/:token/messages/:messageId',
    handler: handleDiscordRequest,
  });
};

export default webhooks;
