import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type Provider = "anthropic" | "openai";

export function resolveProvider(override?: string | null): Provider {
  const val = (override || process.env.AI_PROVIDER || "anthropic").toLowerCase();
  if (val === "openai") return "openai";
  return "anthropic";
}

export function getModel(provider?: Provider): LanguageModel {
  const p = provider ?? resolveProvider();
  if (p === "openai") {
    const modelId = process.env.OPENAI_MODEL || "gpt-4.1";
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    return openai(modelId);
  }
  const modelId = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return anthropic(modelId);
}

/**
 * Pick a model safely: if the requested provider's key is missing, fall back
 * to the other one if that key exists. Throws if neither is configured.
 */
export function getModelSafe(override?: string | null): {
  model: LanguageModel;
  provider: Provider;
} {
  const wanted = resolveProvider(override);
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  if (!hasAnthropic && !hasOpenAI) {
    throw new Error(
      "No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment."
    );
  }
  const provider: Provider =
    wanted === "anthropic"
      ? hasAnthropic
        ? "anthropic"
        : "openai"
      : hasOpenAI
        ? "openai"
        : "anthropic";
  return { model: getModel(provider), provider };
}
