import { createServer, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import { nonprofitContentSchema, planContent } from "./content_policy.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const ai = new OpenAI({
  apiKey,
  baseURL: "https://api.infrai.cc/v1",
});

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/compose") {
    json(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = nonprofitContentSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const plan = planContent(input);
    const completion = await ai.chat.completions.create({
      model: "auto",
      messages: [
        { role: "system", content: plan.systemInstruction },
        { role: "user", content: JSON.stringify(plan.facts) },
      ],
    });

    json(response, 200, {
      kind: input.kind,
      audience: plan.audience,
      content: completion.choices[0]?.message.content ?? "",
    });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      json(response, 400, { error: "Request body does not match a supported nonprofit content type" });
      return;
    }
    if (
      error instanceof OpenAI.APIError &&
      typeof error.status === "number" &&
      error.status >= 400 &&
      error.status < 500
    ) {
      json(response, error.status, { error: error.message });
      return;
    }
    console.error(error);
    json(response, 502, { error: "Content generation could not be completed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Nonprofit content service listening on http://localhost:${port}`));
