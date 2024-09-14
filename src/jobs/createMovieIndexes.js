import cron from "node-cron";
import { getDriver } from "../providers/neo4j.js";

const task = async () => {
  try {
    const driver = getDriver();
    const session = driver.session();
    await session.run("MATCH (n) RETURN n LIMIT 1");
    console.log("Conexão mantida ativa com sucesso");
    await session.close();
  } catch (error) {
    console.error(
      "Erro ao tentar manter a conexão com o banco de dados",
      error
    );
  }
};

cron.schedule("0 0 * * *", task);
