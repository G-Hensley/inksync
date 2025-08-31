import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function run() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@draw.app' },
    update: {},
    create: { email: 'demo@draw.app', role: 'ADMIN' }
  })

  const board = await prisma.board.create({
    data: {
      name: 'Collab Demo Board',
      members: { create: { userId: user.id, role: 'OWNER' } },
      layers: { create: [{ name: 'Background', order: 1 }, { name: 'Foreground', order: 2 }] }
    },
    include: { layers: true }
  })

  await prisma.shape.create({
    data: {
      kind: 'RECT',
      x: 100, y: 80, width: 200, height: 120, zIndex: 1,
      props: { fill: '#cccccc', stroke: '#333333' },
      layerId: board.layers[1].id,
      boardId: board.id
    }
  })
}
run().finally(() => prisma.$disconnect())
