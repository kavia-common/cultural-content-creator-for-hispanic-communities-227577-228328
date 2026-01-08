import "@testing-library/jest-dom";
import { buildCaptionPrompt } from "../services/openaiCaptions";

test("buildCaptionPrompt includes topic, niche, emotion, and strict JSON instruction", () => {
  const prompt = buildCaptionPrompt({
    topic: "Telemedicine access for busy families",
    niche: "telemedicine",
    emotion: "security",
    language: "en",
  });

  expect(prompt).toMatch(/Telemedicine access for busy families/);
  expect(prompt).toMatch(/Niche:/);
  expect(prompt).toMatch(/Brand emotion:/);
  expect(prompt).toMatch(/Return ONLY valid JSON/i);
  expect(prompt).toMatch(/\"captions\":\[/);
});

test("buildCaptionPrompt switches to Spanish instruction when language=es", () => {
  const prompt = buildCaptionPrompt({
    topic: "Acceso a telemedicina",
    niche: "telemedicine",
    emotion: "calm",
    language: "es",
  });

  expect(prompt).toMatch(/Write in Spanish/);
  expect(prompt).toMatch(/Acceso a telemedicina/);
});
