/**
 * @file The entry file for the websocket script. Spins up a websocket server.
 */

import { WebSocketServer } from "ws";

import { createPool, type RowDataPacket } from "mysql2";
import { isEmpty, isNullish } from "radashi";
import dayjs from "dayjs";
import { parseNumber } from "./helpers/parseNumber.js";
import dotenv from "dotenv";
dotenv.config();

const debug = process.env.DEBUG === "true";
const verboseDebug = process.env.VERBOSE === "true";
const safeTableNames = new Set<string>(["temperatures", "ids"]);

debug && console.log("Creating pool connection to database");
const databaseConnection = createPool({
  user: process.env.DATABASE_READ_USER ?? "",
  password: process.env.DATABASE_READ_PASSWORD ?? "",
  host: process.env.DATABASE_READ_HOST ?? "",
  database: process.env.DATABASE_READ_DATABASE ?? "",
}).promise();

const temperatureTableName = process.env.TEMPERATURE_TABLE;
const idTableName = process.env.IDS_TABLE;

debug &&
  console.log(
    `Creating websocket server with environment variables: ${{
      temperatureTableName: temperatureTableName ?? "undefined",
      idTableName: idTableName ?? "undefined",
    }}.`
  );
const rpiWebSocketServer = new WebSocketServer({
  port: parseNumber(process.env.WEBSOCKET_PORT) ?? 8080,
});

/**
 * Propagates database data to each websocket client connected to the websocket server.
 */
const sendWebsocketData = async (): Promise<void> => {
  const isTemperatureTableNameValid =
    !isNullish(temperatureTableName) &&
    safeTableNames.has(temperatureTableName);
  const isIdTableNameValid =
    !isNullish(idTableName) && safeTableNames.has(idTableName);
  const doesWebsocketServerHaveClients = rpiWebSocketServer.clients.size > 0;

  if (
    isTemperatureTableNameValid &&
    isIdTableNameValid &&
    doesWebsocketServerHaveClients
  ) {
    const now = dayjs();
    const upper = now.add(1, "minute").format("YYYY-MM-DD HH:mm:ss");
    const lower = now.subtract(1, "week").format("YYYY-MM-DD HH:mm:ss");
    const temperatureQueryResponse = await databaseConnection.execute<
      RowDataPacket[]
    >(
      `SELECT * FROM ${temperatureTableName} WHERE created_at BETWEEN ? AND ?`,
      [lower, upper]
    );

    verboseDebug &&
      console.log(
        `Temperature query result: ${!isEmpty(temperatureQueryResponse)}`
      );

    if (!isEmpty(temperatureQueryResponse)) {
      for (const eachWebsocketClient of rpiWebSocketServer.clients) {
        if (eachWebsocketClient.readyState === eachWebsocketClient.OPEN) {
          debug && console.log("transmitting temperature update");
          eachWebsocketClient.send(
            JSON.stringify({
              type: "temperature_update",
              data: temperatureQueryResponse[0],
            })
          );
        }
      }
    }

    const idTableQueryResult = await databaseConnection.execute<
      RowDataPacket[]
    >(`SELECT * FROM ${idTableName} WHERE created_at BETWEEN ? AND ?`, [
      lower,
      upper,
    ]);

    verboseDebug &&
      console.log(`Id query result: ${!isEmpty(idTableQueryResult)}`);

    if (!isEmpty(idTableQueryResult)) {
      for (const eachWebsocketClient of rpiWebSocketServer.clients) {
        if (eachWebsocketClient.readyState === eachWebsocketClient.OPEN) {
          debug && console.log("transmitting id update to websocket client");
          eachWebsocketClient.send(
            JSON.stringify({
              type: "id_update",
              data: idTableQueryResult[0],
            })
          );
        }
      }
    }
  }
};

rpiWebSocketServer.on("connection", async () => {
  if (debug) {
    console.log("Client connected");
  }

  await sendWebsocketData();
});

const mainLoop = async () => {
  debug && console.log("Querying database");
  try {
    await sendWebsocketData();
  } catch {
    debug &&
      console.error(
        "Failed to transmit database information to project website."
      );
  } finally {
    setTimeout(mainLoop, 60_000);
  }
};

mainLoop();

/** Close all resources on termination (interrupt handler). */
process.on("SIGINT", async () => {
  debug && console.log("Closing connection and websocket server.");
  await databaseConnection.end();
  rpiWebSocketServer.close();
  process.exit(0);
});
