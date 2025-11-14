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

debug && console.log("Creating pool connection to database");
const databaseConnection = createPool({
  user: process.env.DATABASE_READ_USER ?? "",
  password: process.env.DATABASE_READ_PASSWORD ?? "",
  host: process.env.DATABASE_READ_HOST ?? "",
  database: process.env.DATABASE_READ_DATABASE ?? "",
}).promise();

const temperatureTableName = process.env.TEMPERATURE_TABLE;
const idTableName = process.env.IDS_TABLE;

debug && console.log("Creating websocket server.");
const rpiWebSocketServer = new WebSocketServer({
  port: parseNumber(process.env.WEBSOCKET_PORT) ?? 8080,
});

setInterval(async () => {
  debug && console.log("Querying database");
  try {
    const currentDay = dayjs();
    const upperDateBound = currentDay.format("YYYY-MM-DD HH:mm:ss");
    const lowerDateBound = currentDay
      .subtract(30, "days")
      .format("YYYY-MM-DD HH:mm:ss");
    if (!isNullish(temperatureTableName)) {
      const temperatureQueryResponse = await databaseConnection.execute<
        RowDataPacket[]
      >(`SELECT * FROM ?? WHERE created_at BETWEEN ? AND ?`, [
        temperatureTableName,
        lowerDateBound,
        upperDateBound,
      ]);

      if (!isEmpty(temperatureQueryResponse)) {
        for (const eachWebsocketClient of rpiWebSocketServer.clients) {
          if (eachWebsocketClient.readyState === eachWebsocketClient.OPEN) {
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
      >(`SELECT * FROM ?? WHERE created_at BETWEEN ? AND ?`, [
        idTableName,
        lowerDateBound,
        upperDateBound,
      ]);

      if (!isEmpty(idTableQueryResult)) {
        for (const eachWebsocketClient of rpiWebSocketServer.clients) {
          if (eachWebsocketClient.readyState === eachWebsocketClient.OPEN) {
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
  } catch (error) {
    debug &&
      console.error(
        "Failed to transmit database information to project website.",
        (error as Error).message
      );
  }
}, 60000);

/** Close all resources on termination (interrupt handler). */
process.on("SIGINT", async () => {
  debug && console.log("Closing connection and websocket server.");
  await databaseConnection.end();
  rpiWebSocketServer.close();
  process.exit(0);
});
