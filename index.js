import App from "./App.svelte";
import { Client } from "faunadb";
export const serverClient = new Client({
  secret: "fnAESCbcTmACS_xZJEqITqgsxEcrVjPHqDVxkwk6"
});
const app = new App({
  target: document.body
});

export default app;
