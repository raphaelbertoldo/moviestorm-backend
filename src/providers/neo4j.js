import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j from "neo4j-driver";
import dotenv from "dotenv";
import { typeDefs } from "../graphql/graphql-schema.js";

dotenv.config();

const { NEO4J_URI, NEO4J_PASSWORD } = process.env;

let driver;
let neoSchema;

export const connectNeo4j = async () => {
  if (!driver) {
    driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic("neo4j", NEO4J_PASSWORD));
    neoSchema = new Neo4jGraphQL({
      typeDefs,
      driver,
      plugins: {},
    });
    await neoSchema.checkNeo4jCompat();
  }
  return neoSchema.getSchema();
};

export const getDriver = () => {
  if (!driver) {
    throw new Error("Neo4j driver not initialized");
  }
  return driver;
};

export const getSchema = async () => {
  if (!neoSchema) {
    await connectNeo4j();
  }
  return neoSchema.getSchema();
};

/* 
  //TODO - crearte indexes with next cypher

    TODO - incluir os campos dos nos necessarios, checaro que é usado no frontend

  `CALL apoc.schema.assert(
  {
    Movie: ['title'],
    Gender: ['name'] 
  },
  {}
)
`
  */
