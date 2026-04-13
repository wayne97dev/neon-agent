import { Connection, PublicKey } from "@solana/web3.js";
import { PumpAgent } from "@pump-fun/agent-payments-sdk";

export function getConnection() {
  const url = process.env.SOLANA_RPC_URL;
  if (!url) throw new Error("SOLANA_RPC_URL not set");
  return new Connection(url, "confirmed");
}

export function getAgentMint() {
  const mint = process.env.AGENT_TOKEN_MINT_ADDRESS;
  if (!mint) throw new Error("AGENT_TOKEN_MINT_ADDRESS not set");
  return new PublicKey(mint);
}

export function getCurrencyMint() {
  const mint = process.env.CURRENCY_MINT;
  if (!mint) throw new Error("CURRENCY_MINT not set");
  return new PublicKey(mint);
}

export function getPumpAgent() {
  const connection = getConnection();
  const agentMint = getAgentMint();
  return new PumpAgent(agentMint, "mainnet", connection);
}

export function generateInvoiceParams() {
  const memo = Math.floor(Math.random() * 900000000000) + 100000;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + 86400; // valid for 24 hours
  const amount = Number(process.env.PRICE_AMOUNT) || 100000000; // 0.1 SOL

  return { amount, memo, startTime, endTime };
}
