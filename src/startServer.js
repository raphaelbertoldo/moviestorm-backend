import { Neo4jGraphQL } from "@neo4j/graphql";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import neo4j from "neo4j-driver";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { useServer } from "graphql-ws/lib/use/ws";
import cors from "cors";

dotenv.config();

async function startServer({ typeDefs, resolvers }) {
  const { NEO4J_URI, NEO4J_PASSWORD, PORT } = process.env;
  const app = express();

  var corsOptions = {
    origin: "http://localhost:8080",
    credentials: true,
  };

  // app.use(cors(corsOptions)); // Habilita CORS

  const httpServer = createServer(app);
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic("neo4j", NEO4J_PASSWORD)
  );
  const neoSchema = new Neo4jGraphQL({
    typeDefs,
    driver,
    plugins: {},
  });

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });

  const schema = await neoSchema.getSchema();
  await neoSchema.checkNeo4jCompat();
  const serverCleanup = useServer(
    {
      schema,
    },
    wsServer
  );

  const server = new ApolloServer({
    schema,
    context: () => {
      return {};
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({
        httpServer,
      }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  await server.start();

  server.applyMiddleware({
    app,
    path: "/graphql",
    cors: corsOptions,
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is now running on http://localhost:${PORT}/graphql`);
  });

  const initCypher = `CALL apoc.schema.assert({}, {})`;

  const executeQuery = (driver) => {
    const session = driver.session();
    return session
      .writeTransaction((tx) => tx.run(initCypher))
      .then(console.log("Neo4j iniciado com sucesso !"))
      .finally(() => session.close());
  };

  executeQuery(driver).catch((error) => {
    console.error(
      "Database initialization failed to complete\n",
      error.message
    );
  });
}

export default startServer;
