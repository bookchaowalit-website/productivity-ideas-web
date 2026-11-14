import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page on the App shell", () => {
  const html = renderToString(<Home />);

  it("renders the sample ideas with stage pills, dates and the local-only note", () => {
    expect(html).toContain('class="as"');
    expect(html).toContain("Make the last useful view easy to return to");
    expect(html).toContain("Export a decision trail without opening a spreadsheet");
    expect(html).toMatch(/data-tone="green"[^>]*>Testing</);
    expect(html).toMatch(/data-tone="amber"[^>]*>Shaping</);
    expect(html).toContain("18 Aug 2026");
    expect(html).toContain("Saved in this browser only.");
    expect(html).not.toMatch(/IDEA \/ FIELD|VISIBLE|Place in field/);
  });

  it("shows the lists with counts and All ideas as current", () => {
    expect(html).toMatch(/aria-current="true"[^>]*><span>All ideas<\/span><span class="as-count">3<\/span>/);
    expect(html).toMatch(/Parked<\/span><span class="as-count">0<\/span>/);
  });
});
