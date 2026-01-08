import "@testing-library/jest-dom";
import {
  validateForFacebook,
  validateForWhatsApp,
} from "../services/channelValidation";

test("WhatsApp validation passes for short text-only content", () => {
  const res = validateForWhatsApp({ body: "Hola" });
  expect(res.ok).toBe(true);
  expect(res.issues).toHaveLength(0);
});

test("WhatsApp validation fails when text exceeds max length", () => {
  const long = "a".repeat(4097);
  const res = validateForWhatsApp({ body: long });
  expect(res.ok).toBe(false);
  expect(
    res.issues.some((i) => i.code === "text.tooLong" && i.severity === "error"),
  ).toBe(true);
});

test("Facebook validation fails when caption exceeds max length", () => {
  const long = "a".repeat(2201);
  const res = validateForFacebook({ body: long });
  expect(res.ok).toBe(false);
  expect(res.issues.some((i) => i.code === "text.tooLong")).toBe(true);
});

test("Validation fails for unsupported media type", () => {
  const res = validateForWhatsApp({
    body: "hello",
    media: { type: "image", mimeType: "image/gif", fileSizeBytes: 1000 },
  });
  expect(res.ok).toBe(false);
  expect(
    res.issues.some(
      (i) => i.code === "media.unsupportedType" && i.severity === "error",
    ),
  ).toBe(true);
});

test("Validation fails for file size too large when fileSizeBytes provided", () => {
  const res = validateForWhatsApp({
    body: "hello",
    media: {
      type: "image",
      mimeType: "image/jpeg",
      fileSizeBytes: 16 * 1024 * 1024 + 1,
    },
  });
  expect(res.ok).toBe(false);
  expect(
    res.issues.some((i) => i.code === "media.fileTooLarge" && i.severity === "error"),
  ).toBe(true);
});

test("Video duration warning only appears when durationSeconds provided and over limit", () => {
  const res = validateForWhatsApp({
    body: "hello",
    media: {
      type: "video",
      mimeType: "video/mp4",
      fileSizeBytes: 1000,
      durationSeconds: 61,
    },
  });
  expect(res.ok).toBe(true); // warning does not fail validation
  expect(
    res.issues.some(
      (i) => i.code === "video.tooLong" && i.severity === "warning",
    ),
  ).toBe(true);
});
