import { PrismaClient } from "@prisma/client";
import type { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';

export const prisma = new PrismaClient();

export type Context = {
  prisma: PrismaClient
  userId?: string
  role?: 'USER' | 'ADMIN'
}

export function createContext({ request }: { request: IncomingMessage }): Context {
  const auth = request.headers.authorization || ''
  let userId: string | undefined
  let role: 'USER' | 'ADMIN' | undefined

  if (auth.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET!)
      const { sub, role: r } = payload as { sub: string; role?: 'USER'|'ADMIN' }
      userId = sub
      role = r ?? 'USER'
    } catch {}
  }
  return { prisma, userId, role } as Context
}