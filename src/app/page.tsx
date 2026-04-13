"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";

type InvoiceParams = {
  amount: number;
  memo: number;
  startTime: number;
  endTime: number;
};

type Status =
  | "idle"
  | "creating"
  | "signing"
  | "confirming"
  | "verifying"
  | "paid"
  | "error";

export default function Home() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [txSignature, setTxSignature] = useState("");
  const [randomNumber, setRandomNumber] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const handlePayment = useCallback(async () => {
    if (!publicKey || !signTransaction) return;

    setError("");
    setStatus("creating");

    try {
      const createRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet: publicKey.toBase58() }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || "Failed to create payment");
      }

      const { transaction: txBase64, invoiceParams } = (await createRes.json()) as {
        transaction: string;
        invoiceParams: InvoiceParams;
      };

      setStatus("signing");
      const tx = Transaction.from(Buffer.from(txBase64, "base64"));
      const signedTx = await signTransaction(tx);

      setStatus("confirming");
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false, preflightCommitment: "confirmed" },
      );

      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature, ...latestBlockhash },
        "confirmed",
      );

      setTxSignature(signature);

      setStatus("verifying");
      const verifyRes = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWallet: publicKey.toBase58(),
          ...invoiceParams,
        }),
      });

      const { verified } = await verifyRes.json();

      if (verified) {
        setStatus("paid");
      } else {
        throw new Error("Verification failed. Wait a moment and refresh.");
      }
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Payment failed");
    }
  }, [publicKey, signTransaction, connection]);

  function generateRandomNumber() {
    setGenerating(true);
    setRandomNumber(null);
    setTimeout(() => {
      setRandomNumber(Math.floor(Math.random() * 1001));
      setGenerating(false);
    }, 600);
  }

  const statusLabels: Record<Status, string> = {
    idle: "Pay 0.1 SOL to Unlock",
    creating: "Building transaction...",
    signing: "Approve in wallet...",
    confirming: "Confirming on-chain...",
    verifying: "Verifying payment...",
    paid: "Paid",
    error: "Retry Payment",
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center min-h-screen cyber-grid scanlines overflow-hidden"
         style={{ background: "#050505" }}>

      {/* Top ambient glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
           style={{ background: "radial-gradient(ellipse, rgba(0,240,255,0.3), transparent 70%)" }} />

      <main className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-6 py-16">

        {/* ── Header ── */}
        <div className="text-center animate-fade-in">
          <h1 className="text-7xl font-black tracking-widest font-mono neon-text"
              style={{ color: "var(--neon-cyan)" }}>
            NEON
          </h1>
          <p className="mt-3 text-sm tracking-[0.25em] uppercase"
             style={{ color: "rgba(168,85,247,0.7)" }}>
            AI Agent on Solana
          </p>
          <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Pay &middot; Verify on-chain &middot; Generate
          </p>
        </div>

        {/* ── Wallet ── */}
        <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <WalletMultiButton />
        </div>

        {connected && publicKey && (
          <>
            {/* Wallet card */}
            <div className="w-full rounded-xl p-4 neon-glow animate-fade-in"
                 style={{
                   animationDelay: "0.15s",
                   background: "rgba(0,240,255,0.03)",
                   border: "1px solid rgba(0,240,255,0.1)",
                 }}>
              <p className="text-[10px] uppercase tracking-widest mb-1"
                 style={{ color: "rgba(0,240,255,0.5)" }}>
                Connected Wallet
              </p>
              <p className="text-xs font-mono truncate"
                 style={{ color: "rgba(0,240,255,0.7)" }}>
                {publicKey.toBase58()}
              </p>
            </div>

            {status !== "paid" ? (
              /* ── Payment card ── */
              <div className="w-full rounded-2xl p-6 animate-fade-in animate-glow-pulse"
                   style={{
                     animationDelay: "0.2s",
                     background: "linear-gradient(145deg, rgba(0,240,255,0.04), rgba(168,85,247,0.04))",
                     border: "1px solid rgba(0,240,255,0.15)",
                   }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "#fff" }}>
                      Unlock NEON
                    </h2>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      One-time access payment
                    </p>
                  </div>
                  <span className="text-3xl font-black font-mono neon-text"
                        style={{ color: "var(--neon-cyan)" }}>
                    0.1
                    <span className="text-base ml-1 font-normal"
                          style={{ color: "rgba(0,240,255,0.6)" }}>SOL</span>
                  </span>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={status !== "idle" && status !== "error"}
                  className="btn-neon w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-white cursor-pointer"
                >
                  {statusLabels[status]}
                </button>

                {status === "error" && error && (
                  <p className="text-sm mt-3 text-center" style={{ color: "var(--neon-pink)" }}>
                    {error}
                  </p>
                )}
              </div>
            ) : (
              /* ── RNG card (after payment) ── */
              <div className="w-full rounded-2xl p-6 animate-fade-in"
                   style={{
                     background: "linear-gradient(145deg, rgba(0,240,255,0.05), rgba(168,85,247,0.05))",
                     border: "1px solid rgba(0,240,255,0.2)",
                   }}>

                {/* Verified banner */}
                <div className="mb-5 p-3 rounded-lg text-center"
                     style={{
                       background: "rgba(0,240,255,0.06)",
                       border: "1px solid rgba(0,240,255,0.15)",
                     }}>
                  <p className="text-xs font-semibold tracking-wide"
                     style={{ color: "var(--neon-cyan)" }}>
                    PAYMENT VERIFIED ON-CHAIN
                  </p>
                  {txSignature && (
                    <a
                      href={`https://solscan.io/tx/${txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono hover:underline"
                      style={{ color: "rgba(0,240,255,0.5)" }}
                    >
                      View tx on Solscan
                    </a>
                  )}
                </div>

                {/* Number display */}
                <div className="text-center mb-6">
                  <div
                    className={`text-8xl font-black font-mono tabular-nums transition-all duration-300 ${
                      generating ? "animate-pulse opacity-30" : ""
                    } ${randomNumber !== null && !generating ? "animate-text-glow" : ""}`}
                    style={{
                      color: generating
                        ? "rgba(0,240,255,0.2)"
                        : randomNumber !== null
                          ? "var(--neon-cyan)"
                          : "rgba(255,255,255,0.1)",
                    }}
                  >
                    {generating
                      ? "..."
                      : randomNumber !== null
                        ? randomNumber
                        : "?"}
                  </div>
                  <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {randomNumber !== null
                      ? "Number between 0 and 1000"
                      : "Click below to generate"}
                  </p>
                </div>

                <button
                  onClick={generateRandomNumber}
                  disabled={generating}
                  className="btn-neon w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-white cursor-pointer"
                >
                  {generating ? "Generating..." : "Generate Random Number"}
                </button>
              </div>
            )}

            {/* ── Info cards ── */}
            <div className="w-full grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              {[
                { label: "SOL", sub: "Payment" },
                { label: "0-1000", sub: "Range" },
                { label: "On-chain", sub: "Verified" },
              ].map((card) => (
                <div
                  key={card.sub}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: "rgba(0,240,255,0.03)",
                    border: "1px solid rgba(0,240,255,0.08)",
                  }}
                >
                  <p className="text-sm font-bold font-mono" style={{ color: "var(--neon-cyan)" }}>
                    {card.label}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider mt-0.5"
                     style={{ color: "rgba(168,85,247,0.5)" }}>
                    {card.sub}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {!connected && (
          <p className="text-xs text-center animate-fade-in" style={{ color: "rgba(255,255,255,0.25)", animationDelay: "0.2s" }}>
            Connect Phantom or Solflare to get started
          </p>
        )}

        {/* Footer */}
        <p className="text-[10px] mt-8" style={{ color: "rgba(255,255,255,0.12)" }}>
          Powered by pump.fun Tokenized Agents
        </p>
      </main>
    </div>
  );
}
