import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the sample field, the first reading and the local-only notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Give a loose thought one next move.");
    expect(html).toContain("LOCAL NOTEBOOK · <!-- -->03<!-- --> THOUGHTS");
    expect(html).toContain("Export a decision trail without opening a spreadsheet");
    expect(html).toContain('id="selected-title">Make the last useful view easy to return to');
    expect(html).toContain("No scoring, no fake roadmap.");
    expect(html).toContain("State stays in this browser. No account. No pretend intelligence.");
  });
});
