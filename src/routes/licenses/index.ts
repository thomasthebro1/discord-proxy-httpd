import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AccessType } from '../../lib/prisma/enums.js';

const licenses: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    '/verify-access',
    {
      // Keeping the schema inline ensures fastify-type-provider-zod compiles it before AJV sees it
      schema: {
        summary:
          'Check if a Roblox user or their group has access to a product',
        querystring: z.object({
          userId: z.string().transform((val) => BigInt(val)),
          groupId: z
            .string()
            .optional()
            .transform((val) => (val ? BigInt(val) : undefined)),
          productName: z.string(),
        }),
        response: {
          200: z.object({
            allowed: z.boolean(),
            type: z.enum(['GLOBAL_WHITELIST', 'PRODUCT_WHITELIST', 'NONE']),
            reason: z.string().nullable(),
          }),
          403: z.object({
            allowed: z.boolean(),
            type: z.enum(['GLOBAL_BLACKLIST', 'PRODUCT_BLACKLIST']),
            reason: z.string().nullable(),
          }),
          404: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { userId, groupId, productName } = request.query;

      // Helper function to deduplicate responses
      const handleRuleResponse = (
        rule: { accessType: AccessType; reason: string | null },
        scope: 'GLOBAL' | 'PRODUCT',
      ) => {
        const isBlacklist = rule.accessType === AccessType.BLACKLIST;
        return reply.status(isBlacklist ? 403 : 200).send({
          allowed: !isBlacklist,
          type: `${scope}_${rule.accessType}` as any,
          reason: rule.reason,
        });
      };

      // 1. Fetch the product first to ensure it exists
      const product = await fastify.prisma.product.findUnique({
        where: { name: productName },
      });

      if (!product) {
        return reply
          .status(404)
          .send({ message: `Product '${productName}' not found.` });
      }

      // 2. Check Global User Rules
      const globalUserRule = await fastify.prisma.globalUserLicense.findUnique({
        where: { robloxUserId: userId },
      });
      if (globalUserRule) return handleRuleResponse(globalUserRule, 'GLOBAL');

      // 3. Check Global Group Rules
      if (groupId) {
        const globalGroupRule =
          await fastify.prisma.globalGroupLicense.findUnique({
            where: { robloxGroupId: groupId },
          });
        if (globalGroupRule)
          return handleRuleResponse(globalGroupRule, 'GLOBAL');
      }

      // 4. Check Product-Specific User Rules
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

      // 5. Check Product-Specific Group Rules
      if (groupId) {
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

      // 6. Default Fallback
      return reply.status(200).send({
        allowed: false,
        type: 'NONE',
        reason: 'No blacklist or whitelist found for this product.',
      });
    },
  );
};

export default licenses;
