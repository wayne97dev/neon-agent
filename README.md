# $NEON — Solana Agent

Pay-gated AI image generator powered by [pump.fun](https://pump.fun) tokenized agents.
Users pay 0.1 SOL, payment is verified on-chain, then they can generate unlimited
AI images via Flux. Every payment triggers automatic buyback & burn of $NEON.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind)
- **@pump-fun/agent-payments-sdk** — on-chain payment verification
- **@solana/wallet-adapter** — Phantom / Solflare wallet integration
- **Replicate** (Flux-schnell) — AI image generation

## Environment variables

Create `.env.local` in the project root with:

```bash
SOLANA_RPC_URL=https://rpc.solanatracker.io/public
NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc.solanatracker.io/public
AGENT_TOKEN_MINT_ADDRESS=<your-pump.fun-token-mint>
CURRENCY_MINT=So11111111111111111111111111111111111111112
PRICE_AMOUNT=100000000
REPLICATE_API_TOKEN=<your-replicate-token>
```

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

Pushes to `main` auto-deploy via Netlify. Set the env vars above in
Netlify Site settings → Environment variables (never commit them).

## Flow

```
1. User connects wallet (Phantom/Solflare)
2. Clicks "Pay 0.1 SOL"
3. Server builds payment tx via agent-payments-sdk
4. User signs with wallet → tx sent on-chain
5. Server verifies via validateInvoicePayment
6. On success: image generator unlocks
7. User prompts → Flux generates image
```

90% of each payment is auto-routed to $NEON buyback & burn, 10% to creator.
