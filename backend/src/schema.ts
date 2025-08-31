import { createSchema } from 'graphql-yoga'
import { resolvers } from './resolvers.js'
import type { Context } from './context.js'

export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON

  enum Role { USER ADMIN }
  enum BoardRole { OWNER ADMIN EDITOR VIEWER }
  enum ShapeKind { RECT ELLIPSE LINE TEXT IMAGE FREEHAND }

  interface Node { id: ID! }

  type User implements Node {
    id: ID!
    email: String!
  }

  type Board implements Node {
    id: ID!
    name: String!
    layers: [Layer!]!
    shapes: [Shape!]!
    comments(first: Int, after: String): CommentConnection!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Layer implements Node {
    id: ID!
    name: String!
    order: Int!
    shapes: [Shape!]!
  }

  type Shape implements Node {
    id: ID!
    kind: ShapeKind!
    x: Float!
    y: Float!
    width: Float
    height: Float
    rotation: Float!
    zIndex: Int!
    props: JSON!
    layerId: ID!
    boardId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Comment implements Node {
    id: ID!
    body: String!
    author: User!
    createdAt: DateTime!
  }

  type CommentEdge { node: Comment!, cursor: String! }
  type PageInfo { hasNextPage: Boolean!, endCursor: String }
  type CommentConnection { edges: [CommentEdge!]!, pageInfo: PageInfo! }

  type Query {
    me: User
    board(id: ID!): Board
  }

  input ShapePropsInput { fill: String, stroke: String, text: String, path: JSON }
  input AddShapeInput {
    boardId: ID!
    layerId: ID!
    kind: ShapeKind!
    x: Float!, y: Float!
    width: Float, height: Float, rotation: Float, zIndex: Int
    props: ShapePropsInput
  }
  input UpdateShapeInput {
    id: ID!
    x: Float, y: Float, width: Float, height: Float, rotation: Float, zIndex: Int
    props: ShapePropsInput
    layerId: ID
  }

  type Mutation {
    createBoard(name: String!): Board!
    addShape(input: AddShapeInput!): Shape!
    updateShape(input: UpdateShapeInput!): Shape!
    deleteShape(id: ID!): ID!
    addComment(boardId: ID!, body: String!): Comment!
  }

  type Subscription {
    shapeAdded(boardId: ID!): Shape!
    shapeUpdated(boardId: ID!): Shape!
    shapeDeleted(boardId: ID!): ID!
    commentAdded(boardId: ID!): Comment!
  }
`

export const schema = createSchema<Context>({ typeDefs, resolvers })
