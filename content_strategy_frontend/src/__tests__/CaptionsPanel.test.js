import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import "../i18n/i18n";
import CaptionsPanel from "../components/captions/CaptionsPanel";

test("CaptionsPanel shows empty state when idle and no captions", () => {
  render(<CaptionsPanel title="Captions" status="idle" captions={[]} />);
  expect(screen.getByText(/variations/i)).toBeInTheDocument();
});

test("CaptionsPanel shows loading placeholders when loading", () => {
  render(<CaptionsPanel title="Captions" status="loading" captions={[]} />);
  expect(screen.getAllByText(/Drafting caption/i).length).toBeGreaterThan(0);
});

test("CaptionsPanel allows editing and saving a caption", async () => {
  const user = userEvent.setup();
  const onEditCaption = jest.fn();

  render(
    <CaptionsPanel
      title="Captions"
      status="success"
      captions={[
        {
          id: "1",
          text: "Long text",
          variationType: "long",
          language: "en",
          emotion: "security",
        },
        {
          id: "2",
          text: "Short text",
          variationType: "short",
          language: "en",
          emotion: "security",
        },
        {
          id: "3",
          text: "Question text?",
          variationType: "question",
          language: "en",
          emotion: "security",
        },
      ]}
      onEditCaption={onEditCaption}
    />,
  );

  const textarea = screen.getByDisplayValue("Short text");
  await user.clear(textarea);
  await user.type(textarea, "Updated short text");

  await user.click(screen.getAllByRole("button", { name: /save edit/i })[0]);
  expect(onEditCaption).toHaveBeenCalled();
});
