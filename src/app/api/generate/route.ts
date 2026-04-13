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

    // Flux returns an array of file URLs
    const images = output as string[];
    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 },
      );
    }

    return NextResponse.json({ imageUrl: images[0] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Generation failed";
    console.error("Generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
