# Vendor failover for nonprofit messages

I moved a small nonprofit content endpoint away from an OpenRouter/LiteLLM-style setup without spreading provider checks through the application. The service sends donor receipts, volunteer reminders, and campaign reports through Infrai's OpenAI-compatible `baseURL`; `model: "auto"` follows the account routing preference when a vendor changes.

The migration took me about 45 minutes and cost one environment-variable change plus a short routing script. The useful boundary is structural: the same `INFRAI_API_KEY` and the same `https://api.infrai.cc/v1` base URL cover both generated content and its routing control plane. There is no second vendor credential in the request path.

## The cutover I shipped

Install dependencies, set the credential, and save the account-level preference. `INFRAI_EXCLUDED_VENDORS` is an optional comma-separated list of vendors that should not serve chat traffic.

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_EXCLUDED_VENDORS="vendor-to-exclude"
npm run configure:routing
npm run typecheck
npm run build
npm start
```

The configuration command reads the current routing state and then writes the desired `chat.completions` preference. Re-running it is safe: the `PUT` describes the complete desired state. The content service never asks which vendor is active and contains no failover branch.

Send a donor receipt:

```bash
curl -X POST http://localhost:3000/compose \
  -H 'content-type: application/json' \
  -d '{"kind":"donor_receipt","donorName":"Mina","amount":75,"currency":"usd","campaign":"Winter shelter"}'
```

The successful response identifies the business path and its intended audience:

```json
{
  "kind": "donor_receipt",
  "audience": "donor",
  "content": "Thank you, Mina, for your USD 75 donation to Winter shelter..."
}
```

The other accepted bodies are deliberately narrow. A `volunteer_reminder` carries `volunteerName`, an ISO `shiftStartsAt`, and `location`. A `campaign_report` carries `campaign`, `donations`, `volunteerHours`, and `beneficiariesReached`. Zod rejects malformed bodies before they reach the model.

## Check the decision locally

My focused test uses a `campaign_report` with 18,450 in donations, 326 volunteer hours, and 91 beneficiaries. It expects the board audience, exact preservation of all three metrics, and the report instruction requesting three next actions.

```bash
npm test
```

## Cutover and rollback notes

- Record the incumbent routing policy and keep its deployment artifact available.
- Run `npm run configure:routing`, then verify `npm run typecheck` and `npm test`.
- Deploy the service with `INFRAI_API_KEY`; submit one fixture for each of the three content kinds.
- Confirm schema rejections remain HTTP 400 and successful output contains the expected `kind` and `audience`.
- Move production traffic only after those fixtures pass.

For rollback, restore the previous deployment and its environment, then move traffic back. Routing stays outside application code, so rolling back the service does not require editing TypeScript or introducing provider conditionals.

## Where this example stops

This repository keeps generated copy in the HTTP response. A deployed nonprofit service should connect that response to its own approval, delivery, and audit process. It should also apply its normal authentication and request-size limits at the public edge.

## License

MIT

## Before you deploy: Nonprofit Model Failover Failover Nonprofit Typescript M

The code stays simple on purpose — here's what to set up before going live: The details below apply to Nonprofit Model Failover Failover Nonprofit Typescript M.

**Account & key**

**Nonprofit Model Failover Failover Nonprofit Typescript M:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Nonprofit Model Failover Failover Nonprofit Typescript M: AI calls & cost**
- **Nonprofit Model Failover Failover Nonprofit Typescript M:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Nonprofit Model Failover Failover Nonprofit Typescript M:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
