import { typeDefs } from "./graphql/graphql-schema";
import resolvers from "./graphql/resolvers";
import startServer from "./startServer";

startServer({ typeDefs, resolvers });
