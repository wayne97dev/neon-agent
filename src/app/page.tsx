"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
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
    idle: "UNLOCK — 0.1 SOL",
    creating: "Building transaction...",
    signing: "Approve in wallet...",
    confirming: "Confirming on-chain...",
    verifying: "Verifying payment...",
    paid: "Paid",
    error: "Retry Payment",
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "#000" }}>

      {/* ═══════ HERO BANNER ═══════ */}
      <section className="relative w-full h-[320px] sm:h-[420px] overflow-hidden vignette">
        <Image
          src="/banner.jpg"
          alt="NEON — AI Agent on Solana"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Gradient fade to black at bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,1) 100%)",
          }}
        />
        {/* Top nav */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 sm:px-10 py-5">
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="NEON" fill className="object-contain" />
            </div>
            <span className="font-mono font-black text-lg tracking-widest" style={{ color: "var(--neon-green)" }}>
              $NEON
            </span>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <WalletMultiButton />
          </div>
        </div>
      </section>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="relative z-10 -mt-24 sm:-mt-32 cyber-grid scanlines">

        <div className="max-w-xl mx-auto px-6 pb-20">

          {/* ═══════ HEADER SECTION ═══════ */}
          <div className="text-center animate-fade-in mb-10">
            {/* Floating pill logo */}
            <div className="relative w-28 h-28 mx-auto mb-6 animate-float">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-60"
                style={{ background: "radial-gradient(circle, rgba(74,222,128,0.6), transparent 70%)" }}
              />
              <Image src="/logo.png" alt="NEON pill" fill className="object-contain relative z-10" priority />
            </div>

            <h1
              className="text-6xl sm:text-7xl font-black tracking-widest font-mono animate-text-glow"
              style={{ color: "var(--neon-green)" }}
            >
              NEON
            </h1>
            <p className="mt-3 text-xs sm:text-sm tracking-[0.3em] uppercase font-mono" style={{ color: "rgba(34,211,238,0.8)" }}>
              AI Image Generator
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full"
                 style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--neon-green)", boxShadow: "0 0 8px var(--neon-green)" }} />
              <span className="text-[10px] uppercase tracking-widest font-mono" style={{ color: "rgba(74,222,128,0.9)" }}>
                Powered by Solana
              </span>
            </div>
          </div>

          {connected && publicKey ? (
            <>
              {/* Wallet card */}
              <div
                className="w-full rounded-xl p-4 neon-glow animate-fade-in mb-6"
                style={{
                  animationDelay: "0.15s",
                  background: "rgba(74,222,128,0.03)",
                  border: "1px solid rgba(74,222,128,0.12)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "rgba(74,222,128,0.5)" }}>
                      Connected Wallet
                    </p>
                    <p className="text-xs font-mono truncate max-w-[240px]" style={{ color: "rgba(74,222,128,0.8)" }}>
                      {publicKey.toBase58()}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--neon-green)", boxShadow: "0 0 12px var(--neon-green)" }} />
                </div>
              </div>

              {status !== "paid" ? (
                /* ═══ Payment card ═══ */
                <div
                  className="w-full rounded-2xl p-6 sm:p-8 animate-fade-in animate-glow-pulse"
                  style={{
                    animationDelay: "0.2s",
                    background: "linear-gradient(145deg, rgba(74,222,128,0.05), rgba(34,211,238,0.05))",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(34,211,238,0.6)" }}>
                        Access Pass
                      </p>
                      <h2 className="text-2xl font-bold" style={{ color: "#fff" }}>
                        Unlock $NEON
                      </h2>
                    </div>
                    <div className="text-right">
                      <span className="text-4xl font-black font-mono neon-text" style={{ color: "var(--neon-green)" }}>
                        0.1
                      </span>
                      <span className="block text-xs mt-1 font-mono tracking-wider" style={{ color: "rgba(74,222,128,0.7)" }}>
                        SOL
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mb-6 space-y-2.5">
                    {[
                      "AI image generation (Flux model)",
                      "Unlimited prompts after payment",
                      "On-chain verified — no backend trust",
                      "Auto buyback & burn on each payment",
                    ].map((feat) => (
                      <div key={feat} className="flex items-center gap-3">
                        <span style={{ color: "var(--neon-green)" }} className="text-sm font-mono">&gt;</span>
                        <span className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={status !== "idle" && status !== "error"}
                    className="btn-neon w-full py-4 rounded-xl font-black text-sm tracking-[0.15em] text-black cursor-pointer font-mono"
                  >
                    {statusLabels[status]}
                  </button>

                  {status === "error" && error && (
                    <p className="text-sm mt-3 text-center font-mono" style={{ color: "#ff6b9d" }}>
                      {error}
                    </p>
                  )}
                </div>
              ) : (
                /* ═══ Generator (after payment) ═══ */
                <div
                  className="w-full rounded-2xl p-6 sm:p-8 animate-fade-in"
                  style={{
                    background: "linear-gradient(145deg, rgba(74,222,128,0.06), rgba(34,211,238,0.06))",
                    border: "1px solid rgba(74,222,128,0.25)",
                  }}
                >
                  {/* Verified banner */}
                  <div
                    className="mb-6 p-3 rounded-lg text-center neon-glow"
                    style={{
                      background: "rgba(74,222,128,0.08)",
                      border: "1px solid rgba(74,222,128,0.25)",
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: "var(--neon-green)" }}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <p className="text-xs font-bold tracking-widest font-mono" style={{ color: "var(--neon-green)" }}>
                        ACCESS GRANTED
                      </p>
                    </div>
                    {txSignature && (
                      <a
                        href={`https://solscan.io/tx/${txSignature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono hover:underline"
                        style={{ color: "rgba(74,222,128,0.6)" }}
                      >
                        View tx on Solscan &rarr;
                      </a>
                    )}
                  </div>

                  {/* Prompt input */}
                  <div className="mb-5">
                    <label className="text-[10px] uppercase tracking-widest mb-2 block font-mono" style={{ color: "rgba(74,222,128,0.6)" }}>
                      &gt; Describe your image
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A cyberpunk cat riding a neon motorcycle through Tokyo at night..."
                      rows={3}
                      className="w-full rounded-lg p-3 text-sm font-mono resize-none focus:outline-none placeholder:text-zinc-700 transition-all"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        border: "1px solid rgba(74,222,128,0.2)",
                        color: "rgba(255,255,255,0.9)",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(74,222,128,0.5)";
                        e.target.style.boxShadow = "0 0 15px rgba(74,222,128,0.15)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "rgba(74,222,128,0.2)";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={genLoading || !prompt.trim()}
                    className="btn-neon w-full py-4 rounded-xl font-black text-sm tracking-[0.15em] text-black cursor-pointer font-mono"
                  >
                    {genLoading ? "GENERATING..." : "GENERATE IMAGE"}
                  </button>

                  {genError && (
                    <p className="text-sm mt-3 text-center font-mono" style={{ color: "#ff6b9d" }}>
                      {genError}
                    </p>
                  )}

                  {/* Loading animation */}
                  {genLoading && (
                    <div className="mt-8 flex flex-col items-center gap-3">
                      <div className="relative w-20 h-20">
                        <div
                          className="absolute inset-0 rounded-full animate-spin"
                          style={{
                            border: "2px solid rgba(74,222,128,0.1)",
                            borderTopColor: "var(--neon-green)",
                            borderRightColor: "var(--neon-cyan)",
                          }}
                        />
                        <div className="absolute inset-3 rounded-full animate-spin-slow opacity-50"
                             style={{
                               border: "1px solid rgba(34,211,238,0.2)",
                               borderTopColor: "var(--neon-cyan)",
                             }} />
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-widest animate-pulse" style={{ color: "rgba(74,222,128,0.6)" }}>
                        Synthesizing...
                      </p>
                    </div>
                  )}

                  {/* Generated image */}
                  {imageUrl && !genLoading && (
                    <div className="mt-6 animate-fade-in">
                      <div
                        className="rounded-xl overflow-hidden neon-glow-strong"
                        style={{ border: "1px solid rgba(74,222,128,0.35)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={prompt} className="w-full h-auto block" />
                      </div>
                      <p className="text-[10px] text-center mt-3 font-mono italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                        &quot;{prompt.length > 80 ? prompt.slice(0, 80) + "..." : prompt}&quot;
                      </p>
                      <button
                        onClick={() => { setImageUrl(""); setPrompt(""); }}
                        className="mt-4 w-full py-2.5 rounded-lg font-mono text-xs tracking-widest uppercase transition-all"
                        style={{
                          background: "rgba(74,222,128,0.06)",
                          border: "1px solid rgba(74,222,128,0.2)",
                          color: "rgba(74,222,128,0.8)",
                        }}
                      >
                        Generate Another
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Stats grid ═══ */}
              <div className="w-full grid grid-cols-3 gap-3 mt-6 animate-fade-in" style={{ animationDelay: "0.35s" }}>
                {[
                  { label: "FLUX", sub: "AI Model" },
                  { label: "0.1", sub: "SOL Price" },
                  { label: "100%", sub: "On-chain" },
                ].map((card) => (
                  <div
                    key={card.sub}
                    className="rounded-xl p-3 text-center transition-all hover:scale-105"
                    style={{
                      background: "rgba(74,222,128,0.03)",
                      border: "1px solid rgba(74,222,128,0.1)",
                    }}
                  >
                    <p className="text-base font-black font-mono" style={{ color: "var(--neon-green)" }}>
                      {card.label}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest mt-1" style={{ color: "rgba(34,211,238,0.6)" }}>
                      {card.sub}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <p className="text-sm font-mono mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                &gt; Awaiting wallet connection...
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                Connect Phantom or Solflare to activate the agent
              </p>
            </div>
          )}

          {/* ═══ Footer ═══ */}
          <footer className="mt-16 pt-6 text-center" style={{ borderTop: "1px solid rgba(74,222,128,0.08)" }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="relative w-4 h-4">
                <Image src="/logo.png" alt="" fill className="object-contain opacity-60" />
              </div>
              <p className="text-[10px] font-mono tracking-widest uppercase" style={{ color: "rgba(74,222,128,0.4)" }}>
                $NEON &middot; pump.fun tokenized agent
              </p>
            </div>
            <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.15)" }}>
              On-chain verified &middot; Auto buyback & burn
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
