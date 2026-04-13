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

  // Image generator state
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState("");

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

  async function handleGenerate() {
    if (!prompt.trim() || genLoading) return;

    setGenLoading(true);
    setGenError("");
    setImageUrl("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const { imageUrl: url } = await res.json();
      setImageUrl(url);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenLoading(false);
    }
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
    <div
      className="relative flex flex-col flex-1 items-center justify-center min-h-screen cyber-grid scanlines overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
        style={{ background: "radial-gradient(ellipse, rgba(0,240,255,0.3), transparent 70%)" }}
      />

      <main className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-6 py-16">
        {/* Header */}
        <div className="text-center animate-fade-in">
          <h1
            className="text-7xl font-black tracking-widest font-mono neon-text"
            style={{ color: "var(--neon-cyan)" }}
          >
            NEON
          </h1>
          <p className="mt-3 text-sm tracking-[0.25em] uppercase" style={{ color: "rgba(168,85,247,0.7)" }}>
            AI Image Generator on Solana
          </p>
          <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Pay &middot; Verify on-chain &middot; Generate AI images
          </p>
        </div>

        {/* Wallet */}
        <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <WalletMultiButton />
        </div>

        {connected && publicKey && (
          <>
            {/* Wallet card */}
            <div
              className="w-full rounded-xl p-4 neon-glow animate-fade-in"
              style={{
                animationDelay: "0.15s",
                background: "rgba(0,240,255,0.03)",
                border: "1px solid rgba(0,240,255,0.1)",
              }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(0,240,255,0.5)" }}>
                Connected Wallet
              </p>
              <p className="text-xs font-mono truncate" style={{ color: "rgba(0,240,255,0.7)" }}>
                {publicKey.toBase58()}
              </p>
            </div>

            {status !== "paid" ? (
              /* ── Payment card ── */
              <div
                className="w-full rounded-2xl p-6 animate-fade-in animate-glow-pulse"
                style={{
                  animationDelay: "0.2s",
                  background: "linear-gradient(145deg, rgba(0,240,255,0.04), rgba(168,85,247,0.04))",
                  border: "1px solid rgba(0,240,255,0.15)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "#fff" }}>
                      Unlock NEON
                    </h2>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Generate unlimited AI images
                    </p>
                  </div>
                  <span className="text-3xl font-black font-mono neon-text" style={{ color: "var(--neon-cyan)" }}>
                    0.1
                    <span className="text-base ml-1 font-normal" style={{ color: "rgba(0,240,255,0.6)" }}>
                      SOL
                    </span>
                  </span>
                </div>

                {/* Features list */}
                <div className="mb-5 space-y-2">
                  {["AI-powered image generation (Flux)", "Unlimited prompts after payment", "On-chain verified access"].map(
                    (feat) => (
                      <div key={feat} className="flex items-center gap-2">
                        <span style={{ color: "var(--neon-cyan)" }} className="text-xs">&#x25C8;</span>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                          {feat}
                        </span>
                      </div>
                    ),
                  )}
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
              /* ── Image Generator (after payment) ── */
              <div
                className="w-full rounded-2xl p-6 animate-fade-in"
                style={{
                  background: "linear-gradient(145deg, rgba(0,240,255,0.05), rgba(168,85,247,0.05))",
                  border: "1px solid rgba(0,240,255,0.2)",
                }}
              >
                {/* Verified banner */}
                <div
                  className="mb-5 p-3 rounded-lg text-center"
                  style={{
                    background: "rgba(0,240,255,0.06)",
                    border: "1px solid rgba(0,240,255,0.15)",
                  }}
                >
                  <p className="text-xs font-semibold tracking-wide" style={{ color: "var(--neon-cyan)" }}>
                    PAYMENT VERIFIED — ACCESS GRANTED
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

                {/* Prompt input */}
                <div className="mb-4">
                  <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: "rgba(0,240,255,0.5)" }}>
                    Describe your image
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A cyberpunk cat riding a neon motorcycle through Tokyo at night..."
                    rows={3}
                    className="w-full rounded-lg p-3 text-sm font-mono resize-none focus:outline-none placeholder:text-zinc-600"
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(0,240,255,0.15)",
                      color: "rgba(255,255,255,0.85)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(0,240,255,0.4)";
                      e.target.style.boxShadow = "0 0 10px rgba(0,240,255,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,240,255,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={genLoading || !prompt.trim()}
                  className="btn-neon w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-white cursor-pointer"
                >
                  {genLoading ? "Generating..." : "Generate Image"}
                </button>

                {genError && (
                  <p className="text-sm mt-3 text-center" style={{ color: "var(--neon-pink)" }}>
                    {genError}
                  </p>
                )}

                {/* Loading animation */}
                {genLoading && (
                  <div className="mt-6 flex justify-center">
                    <div
                      className="w-16 h-16 rounded-full animate-spin"
                      style={{
                        border: "2px solid rgba(0,240,255,0.1)",
                        borderTopColor: "var(--neon-cyan)",
                      }}
                    />
                  </div>
                )}

                {/* Generated image */}
                {imageUrl && !genLoading && (
                  <div className="mt-5 animate-fade-in">
                    <div
                      className="rounded-xl overflow-hidden neon-glow-strong"
                      style={{ border: "1px solid rgba(0,240,255,0.2)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={prompt}
                        className="w-full h-auto"
                      />
                    </div>
                    <p className="text-[10px] text-center mt-2 font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                      &quot;{prompt.length > 60 ? prompt.slice(0, 60) + "..." : prompt}&quot;
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Info cards */}
            <div className="w-full grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              {[
                { label: "Flux AI", sub: "Model" },
                { label: "0.1 SOL", sub: "Access" },
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
                  <p
                    className="text-[10px] uppercase tracking-wider mt-0.5"
                    style={{ color: "rgba(168,85,247,0.5)" }}
                  >
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

        <p className="text-[10px] mt-8" style={{ color: "rgba(255,255,255,0.12)" }}>
          Powered by pump.fun Tokenized Agents
        </p>
      </main>
    </div>
  );
}
