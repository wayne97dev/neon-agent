import { NextRequest, NextResponse } from "next/server";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getConnection,
  getPumpAgent,
  getCurrencyMint,
  generateInvoiceParams,
} from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { userWallet } = await req.json();
    if (!userWallet) {
      return NextResponse.json({ error: "userWallet required" }, { status: 400 });
    }

    const agent = getPumpAgent();
    const connection = getConnection();
    const currencyMint = getCurrencyMint();
    const userPublicKey = new PublicKey(userWallet);
    const invoiceParams = generateInvoiceParams();

    if (invoiceParams.amount <= 0) {
      return NextResponse.json({ error: "Invalid price amount" }, { status: 500 });
    }

    // buildAcceptPaymentInstructions handles SOL wrapping/unwrapping automatically
    const instructions = await agent.buildAcceptPaymentInstructions({
      user: userPublicKey,
      currencyMint,
      amount: String(invoiceParams.amount),
      memo: String(invoiceParams.memo),
      startTime: String(invoiceParams.startTime),
      endTime: String(invoiceParams.endTime),
    });

    const { blockhash } = await connection.getLatestBlockhash("confirmed");

    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.feePayer = userPublicKey;
    tx.add(...instructions);

    const serializedTx = tx
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return NextResponse.json({
      transaction: serializedTx,
      invoiceParams,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment create error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
