import {
  Neo4jGraphQL,
  Neo4jGraphQLSubscriptionsSingleInstancePlugin,
} from "@neo4j/graphql";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import neo4j from "neo4j-driver";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { useServer } from "graphql-ws/lib/use/ws";
dotenv.config();

async function startServer({ typeDefs, resolvers }) {
  const { NEO4J_URI, NEO4J_PASSWORD, PORT } = process.env;

  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic("neo4j", NEO4J_PASSWORD)
  );

  const neoSchema = new Neo4jGraphQL({
    typeDefs,
    driver,
    plugins: {
      subscriptions: new Neo4jGraphQLSubscriptionsSingleInstancePlugin(),
      onSchemaChange: async (event) => {
        console.log("O index fo criado...");
        console.log(
          "🚀 ~ file: startServer.js:29 ~ onSchemaChange: ~ event",
          event
        );
        const schema = event.fullSchema;
        const { neo4j } = event;
        const hasFulltextIndex = schema.indexOf("@fulltext") !== -1;
        const indexExists = await neo4j.query(
          `
        CALL db.indexes
      `,
          null,
          {}
        );
        if (indexExists.records.length === 0 && hasFulltextIndex) {
          await neo4j.query(createFulltextIndex, null, {});
        }
        if (indexExists.records.length > 0 && !hasFulltextIndex) {
          await neo4j.query(updateFulltextIndex, null, {});
        }
      },
    },
  });

  const app = express();
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/graphql",
  });
  // context: ({ req }) => ({ req, appId: "Raphael" }),

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
      return {
        // cypherParams: { movieId: "20" },
      };
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
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is now running on http://localhost:${PORT}/graphql`);
  });

  // await neoSchema.assertIndexesAndConstraints({ options: { create: true } });

  const initCypher = `CALL apoc.schema.assert({}, {})`;

  const executeQuery = (driver) => {
    const session = driver.session();
    return session
      .writeTransaction((tx) => tx.run(initCypher))
      .then(console.log("Cypher iniciado com sucesso !"))
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
