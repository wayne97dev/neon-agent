import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export async function POST(req: NextRequest) {
  try {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN not configured" },
        { status: 500 },
      );
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 },
      );
    }

    const replicate = new Replicate({ auth: apiToken });

    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: {
        prompt: prompt.trim(),
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "webp",
        output_quality: 90,
      },
    });

    // Replicate SDK v1+ returns FileOutput[] objects, not URL strings.
    // Normalize: extract a URL from either shape.
    const items = Array.isArray(output) ? output : [output];
    if (items.length === 0) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const first = items[0];
    let imageUrl: string;

    if (typeof first === "string") {
      // Legacy string URL
      imageUrl = first;
    } else if (first && typeof (first as { url?: () => URL | string }).url === "function") {
      // FileOutput object — .url() returns a URL object or string
      const u = (first as { url: () => URL | string }).url();
      imageUrl = u instanceof URL ? u.toString() : String(u);
    } else {
      // Fallback: try toString
      imageUrl = String(first);
    }

    if (!imageUrl || !imageUrl.startsWith("http")) {
      console.error("Invalid image URL from Replicate:", first);
      return NextResponse.json(
        { error: "Invalid image URL returned from model" },
        { status: 500 },
      );
    }

    return NextResponse.json({ imageUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("Generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
