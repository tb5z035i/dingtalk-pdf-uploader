import { createServer } from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDingtalkProvider } from "./services/dingtalkKnowledgeBase.js";

const config = loadConfig();
const provider = createDingtalkProvider(config);
const app = createApp({ config, provider });

const server = createServer(app);

server.listen(config.port, () => {
  console.log(`dingtalk-pdf-uploader server listening on http://localhost:${config.port}`);
});
