import { createApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
const app = createApp(config);

export type AppType = typeof app;

export default {
  port: config.port,
  fetch: app.fetch,
};

console.log(
  `DocPDF back-end listening on http://localhost:${config.port} and proxying to ${config.gotenbergUrl}`,
);
