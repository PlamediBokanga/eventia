import dotenv from "dotenv";
import { createApp } from "./app";
import { appConfig, validateConfig } from "./config";

dotenv.config();
validateConfig();

const app = createApp();
const port = appConfig.port;

app.listen(port, () => {
  console.log(`EVENTIA backend ecoute sur le port ${port}`);
});
