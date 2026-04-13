import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getPumpAgent, getCurrencyMint } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const { userWallet, amount, memo, startTime, endTime } = await req.json();

    if (!userWallet || memo === undefined) {
      return NextResponse.json(
        { error: "userWallet and invoice params required" },
        { status: 400 },
      );
    }

    const agent = getPumpAgent();
    const currencyMint = getCurrencyMint();

    // validateInvoicePayment expects number types for numeric fields
    const invoiceParams = {
      user: new PublicKey(userWallet),
      currencyMint,
      amount: Number(amount),
      memo: Number(memo),
      startTime: Number(startTime),
      endTime: Number(endTime),
    };

    // Retry up to 10 times — transaction may still be confirming
    let verified = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      verified = await agent.validateInvoicePayment(invoiceParams);
      if (verified) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    return NextResponse.json({ verified });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment verify error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
