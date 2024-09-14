import { Neo4jGraphQL } from "@neo4j/graphql";
import dotenv from "dotenv";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { useServer } from "graphql-ws/lib/use/ws";
import cors from "cors";
import { connectNeo4j } from "./providers/neo4j.js";
import cron from "node-cron";

dotenv.config();

async function startServer() {
  const schema = await connectNeo4j();
  const { PORT } = process.env;
  const app = express();
  const httpServer = createServer(app);

  const server = new ApolloServer({
    schema,
    context: () => {
      return {};
    },
    cors: {
      origin: "*",
      credentials: true,
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({
        httpServer,
      }),
    ],
  });

  await server.start();
  app.use(
    cors({
      origin: ["*", "http://localhost:8080"],
      credentials: true,
    })
  );
  var corsOptions = {
    origin: "*",
  };
  app.options("*", cors(corsOptions));

  server.applyMiddleware({
    app,
    path: "/graphql",
    cors: false,
  });

  httpServer.listen(PORT, () => {
    console.log(`Server is now running 🚅 on port ${PORT}`);
  });
}

export default startServer;
