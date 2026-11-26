import "dotenv/config";
import { createApp } from "./app.js";

const app = createApp();
const PORT = process.env.PORT || 3001;

const HOST = process.env.ALLOW_INSECURE_LOCAL_DEV === "true" ? "127.0.0.1" : undefined;

app.listen(PORT, HOST, () => {
  console.log(
    `gEneSysBot server listening on ${HOST ?? "0.0.0.0"}:${PORT}`
  );
});
