import { GraphQLScalarType, Kind } from "graphql";
import type { Context } from "./context.js";
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();
const topic = (t: string, id: string) => `${t}:${id}`

export const DateTime = new GraphQLScalarType({
  name: 'DateTime',
  serialize: (v: any) => (v instanceof Date ? v.toISOString() : v),
  parseValue: (v: any) => new Date(v as string),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null)
})

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  serialize: (v: any) => v,
  parseValue: (v: any) => v,
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? JSON.parse(ast.value) : null)
})

export const resolvers = {
  DateTime,
  JSON: JSONScalar,

  Query: {
    me: (_: any, __: any, ctx: Context) =>
      ctx.userId ? ctx.prisma.user.findUnique({ where: { id: ctx.userId } }) : null,
    board: (_: any, { id }: { id: string }, ctx: Context) =>
      ctx.prisma.board.findUnique({
        where: { id },
        include: {
          layers: { orderBy: { order: 'asc' } },
          shapes: { orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }] },
        }
      })
  },

   Board: {
    layers: (b: any, _: any, ctx: Context) =>
      ctx.prisma.layer.findMany({ where: { boardId: b.id }, orderBy: { order: 'asc' } }),
    shapes: (b: any, _: any, ctx: Context) =>
      ctx.prisma.shape.findMany({
        where: { boardId: b.id },
        orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }]
      }),
    comments: async (b: any, { first = 20, after }: { first?: number; after?: string }, ctx: Context) => {
      const cursor = after ? { id: after } : undefined
      const nodes = await ctx.prisma.comment.findMany({
        where: { boardId: b.id },
        take: first + 1,
        ...(cursor ? { skip: 1, cursor } : {}),
        orderBy: { createdAt: 'desc' }
      })
      const edges = nodes.slice(0, first).map(n => ({ node: n, cursor: n.id }))
      return {
        edges,
        pageInfo: { hasNextPage: nodes.length > first, endCursor: edges.at(-1)?.cursor ?? null }
      }
    }
  },

  Comment: {
    author: (c: any, _: any, ctx: Context) => ctx.prisma.user.findUnique({ where: { id: c.authorId } })
  },

  Mutation: {
    createBoard: async (_: any, { name }: { name: string }, ctx: Context) => {
      if (!ctx.userId) throw new Error('Unauthorized')
      const board = await ctx.prisma.board.create({
        data: {
          name,
          members: { create: { userId: ctx.userId, role: 'OWNER' } },
          layers: { create: [{ name: 'Layer 1', order: 1 }] }
        }
      })
      return board
    },

    addShape: async (_: any, { input }: any, ctx: Context) => {
      if (!ctx.userId) throw new Error('Unauthorized')
      const shape = await ctx.prisma.shape.create({
        data: {
          kind: input.kind,
          x: input.x, y: input.y,
          width: input.width, height: input.height,
          rotation: input.rotation ?? 0,
          zIndex: input.zIndex ?? 0,
          props: input.props ?? {},
          layerId: input.layerId,
          boardId: input.boardId
        }
      })
      await pubsub.publish(topic('shapeAdded', input.boardId), { shapeAdded: shape })
      return shape
    },

    updateShape: async (_: any, { input }: any, ctx: Context) => {
      if (!ctx.userId) throw new Error('Unauthorized')
      const { id, ...patch } = input
      // normalize props merge
      if (patch.props) {
        const existing = await ctx.prisma.shape.findUnique({ where: { id } })
        patch.props = { ...(existing?.props as any), ...patch.props }
      }
      const shape = await ctx.prisma.shape.update({
        where: { id },
        data: {
          ...patch,
          layerId: patch.layerId ?? undefined
        }
      })
      await pubsub.publish(topic('shapeUpdated', shape.boardId), { shapeUpdated: shape })
      return shape
    },

    deleteShape: async (_: any, { id }: { id: string }, ctx: Context) => {
      if (!ctx.userId) throw new Error('Unauthorized')
      const shape = await ctx.prisma.shape.delete({ where: { id } })
      await pubsub.publish(topic('shapeDeleted', shape.boardId), { shapeDeleted: shape.id })
      return shape.id
    },

    addComment: async (_: any, { boardId, body }: any, ctx: Context) => {
      if (!ctx.userId) throw new Error('Unauthorized')
      const comment = await ctx.prisma.comment.create({
        data: { body, boardId, authorId: ctx.userId }
      })
      await pubsub.publish(topic('commentAdded', boardId), { commentAdded: comment })
      return comment
    },
  },

  Subscription: {
    shapeAdded: {
      subscribe: (_: any, { boardId }: { boardId: string }) =>
        (pubsub as any).asyncIterator(topic('shapeAdded', boardId)),
      resolve: (p: any) => p.shapeAdded
    },
    shapeUpdated: {
      subscribe: (_: any, { boardId }: { boardId: string }) =>
        (pubsub as any).asyncIterator(topic('shapeUpdated', boardId)),
      resolve: (p: any) => p.shapeUpdated
    },
    shapeDeleted: {
      subscribe: (_: any, { boardId }: { boardId: string }) =>
        (pubsub as any).asyncIterator(topic('shapeDeleted', boardId)),
      resolve: (p: any) => p.shapeDeleted
    },
    commentAdded: {
      subscribe: (_: any, { boardId }: { boardId: string }) =>
        (pubsub as any).asyncIterator(topic('commentAdded', boardId)),
      resolve: (p: any) => p.commentAdded
    }
  }
}