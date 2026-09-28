import { accountRequest } from "./infrai_control_plane.js";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before configuring routing");

const exclude = (process.env.INFRAI_EXCLUDED_VENDORS ?? "")
  .split(",")
  .map((vendor) => vendor.trim())
  .filter(Boolean);

await accountRequest<unknown>(key, "/account/routing/get", { method: "GET" });
const routing = await accountRequest<unknown>(key, "/account/routing/set", {
  method: "PUT",
  body: {
    capability: "chat.completions",
    ...(exclude.length > 0 ? { exclude } : {}),
  },
});

console.log("Chat routing saved:", routing);
