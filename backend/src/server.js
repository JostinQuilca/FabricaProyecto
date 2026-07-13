const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { typeDefs } = require('./schema/typeDefs');
const { resolvers } = require('./resolvers');
const { connectDB } = require('./config/database');
const { verifyToken } = require('./middleware/auth');
require('dotenv').config();

async function startServer() {
  await connectDB();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.PORT || 4000 },
    context: async ({ req }) => {
      const token = req.headers.authorization || '';
      const user = verifyToken(token);
      return { token, user, req };
    },
  });

  console.log(`Servidor GraphQL listo en ${url}`);
}

startServer();
