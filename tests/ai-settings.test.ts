import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReviewGenerationPrompt,
  DEFAULT_REVIEW_SYSTEM_PROMPT,
  mergeAiGenerationSettingsWithEnv,
  normalizeAiSettingsInput,
} from "@/lib/ai-settings";

describe("AI generation settings helpers", () => {
  it("merges saved review models and prompt over environment defaults", () => {
    const settings = mergeAiGenerationSettingsWithEnv(
      {
        anthropicModel: " claude-sonnet-4-6 ",
        openaiModel: " gpt-4.1-mini ",
        reviewSystemPrompt: " Custom Verdict review prompt ",
      },
      {
        ANTHROPIC_MODEL: "claude-env",
        OPENAI_MODEL: "gpt-env",
      },
    );

    assert.equal(settings.anthropicModel, "claude-sonnet-4-6");
    assert.equal(settings.openaiModel, "gpt-4.1-mini");
    assert.equal(settings.reviewSystemPrompt, "Custom Verdict review prompt");
  });

  it("falls back to environment/defaults when saved values are blank", () => {
    const settings = mergeAiGenerationSettingsWithEnv(
      {
        anthropicModel: "",
        openaiModel: "",
        reviewSystemPrompt: "",
      },
      {
        ANTHROPIC_MODEL: "claude-env",
        OPENAI_MODEL: "gpt-env",
      },
    );

    assert.equal(settings.anthropicModel, "claude-env");
    assert.equal(settings.openaiModel, "gpt-env");
    assert.equal(settings.reviewSystemPrompt, DEFAULT_REVIEW_SYSTEM_PROMPT);
  });

  it("normalizes admin input without allowing an empty prompt", () => {
    const input = normalizeAiSettingsInput({
      anthropicModel: " claude-3-5-sonnet-latest ",
      openaiModel: " ",
      reviewSystemPrompt: " ",
    });

    assert.equal(input.anthropicModel, "claude-3-5-sonnet-latest");
    assert.equal(input.openaiModel, null);
    assert.equal(input.reviewSystemPrompt, DEFAULT_REVIEW_SYSTEM_PROMPT);
  });

  it("builds the user prompt with product details and editor notes", () => {
    const prompt = buildReviewGenerationPrompt({
      productName: "Test Product",
      categorySlug: "cat-litter",
      amazonUrl: "https://amazon.ca/dp/example",
      notes: "Focus on odor control.",
    });

    assert.match(prompt, /Product: Test Product/);
    assert.match(prompt, /Category slug: cat-litter/);
    assert.match(prompt, /Amazon URL: https:\/\/amazon.ca\/dp\/example/);
    assert.match(prompt, /Editor notes: Focus on odor control\./);
  });
});
