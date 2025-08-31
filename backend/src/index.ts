
import { createYoga } from '@graphql-yoga/node'
import { schema } from './schema.js'
import { createContext } from './context.js'
import 'dotenv/config'
import http from 'http'

const yoga = createYoga({
  schema,
  context: createContext,
  maskedErrors: false,
  logging: true,
})

const server = http.createServer(yoga as any)
server.listen(4000, () => {
  console.log('🎨 Collab Draw GraphQL at http://localhost:4000/graphql')
})
