import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the security simulation dashboard header", () => {
  render(<App />);
  const heading = screen.getByRole("heading", {
    name: /security simulation control panel/i,
  });
  expect(heading).toBeInTheDocument();
});
