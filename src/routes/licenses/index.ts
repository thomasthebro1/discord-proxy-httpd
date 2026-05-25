import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AccessType } from '../../lib/prisma/enums.js';

const licenses: FastifyPluginAsyncZod = async (fastify) => {
  // Schema definitions
  const baseResponse = {
    allowed: z.boolean(),
    type: z.string(),
    entityType: z.enum(['USER', 'GROUP']),
    entityId: z.string(),
    reason: z.string().nullable(),
  };

  fastify.get(
    '/verify-access',
    {
      schema: {
        summary: 'Check if a Roblox user or their group has access',
        querystring: z
          .object({
            userId: z
              .string()
              .transform((val) => BigInt(val))
              .optional(),
            groupId: z
              .string()
              .transform((val) => BigInt(val))
              .optional(),
            productName: z.string(),
          })
          .refine(
            (data) =>
              (data.userId !== undefined) !== (data.groupId !== undefined),
            {
              message: 'Provide either userId OR groupId.',
              path: ['userId'],
            },
          ),
        response: {
          200: z.object(baseResponse),
          403: z.object(baseResponse),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { userId, groupId, productName } = request.query;

      // Determine IDs and types
      const entityType = userId !== undefined ? 'USER' : 'GROUP';
      const entityId = (userId ?? groupId)!.toString();

      const handleRuleResponse = (
        rule: { accessType: AccessType; reason: string | null },
        scope: 'GLOBAL' | 'PRODUCT',
      ) => {
        const isBlacklist = rule.accessType === AccessType.BLACKLIST;
        return reply.status(isBlacklist ? 403 : 200).send({
          allowed: !isBlacklist,
          type: `${scope}_${rule.accessType}`,
          entityType,
          entityId, // Included in response
          reason: rule.reason,
        });
      };

      const product = await fastify.prisma.product.findUnique({
        where: { name: productName },
      });
      if (!product)
        return reply
          .status(404)
          .send({ message: `Product '${productName}' not found.` });

      // 1. Check Global Rules
      if (userId !== undefined) {
        const globalUserRule =
          await fastify.prisma.globalUserLicense.findUnique({
            where: { robloxUserId: userId },
          });
        if (globalUserRule) return handleRuleResponse(globalUserRule, 'GLOBAL');
      } else if (groupId !== undefined) {
        const globalGroupRule =
          await fastify.prisma.globalGroupLicense.findUnique({
            where: { robloxGroupId: groupId },
          });
        if (globalGroupRule)
          return handleRuleResponse(globalGroupRule, 'GLOBAL');
      }

      // 2. Check Product Rules
      if (userId !== undefined) {
        const productUserRule = await fastify.prisma.userLicense.findUnique({
          where: {
            robloxUserId_productId: {
              robloxUserId: userId,
              productId: product.id,
            },
          },
        });
        if (productUserRule)
          return handleRuleResponse(productUserRule, 'PRODUCT');
      } else if (groupId !== undefined) {
        const productGroupRule = await fastify.prisma.groupLicense.findUnique({
          where: {
            robloxGroupId_productId: {
              robloxGroupId: groupId,
              productId: product.id,
            },
          },
        });
        if (productGroupRule)
          return handleRuleResponse(productGroupRule, 'PRODUCT');
      }

      return reply.status(200).send({
        allowed: false,
        type: 'NONE',
        entityType,
        entityId,
        reason: 'No blacklist or whitelist found.',
      });
    },
  );
};

export default licenses;
