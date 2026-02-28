import { kv } from "@vercel/kv";

const TASKS_KEY = "flow:tasks";

export default async function handler(req, res) {
  const secret = req.headers["x-api-key"];
  if (!secret || secret !== process.env.FLOW_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const tasks = await kv.get(TASKS_KEY);
    return res.status(200).json({ tasks: tasks ?? [] });
  }

  if (req.method === "POST") {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: "tasks must be an array" });
    }
    await kv.set(TASKS_KEY, tasks);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
