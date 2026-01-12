import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DetailsDisclosure } from "./details-disclosure";

describe("DetailsDisclosure", () => {
  it("summary と項目が表示される", () => {
    const html = renderToStaticMarkup(
      <DetailsDisclosure items={[{ label: "ID", value: "token-123" }]} />
    );

    expect(html).toContain("詳細");
    expect(html).toContain("ID");
    expect(html).toContain("***");
  });

  it("mask=false で値を保持し、子要素を表示できる", () => {
    const html = renderToStaticMarkup(
      <DetailsDisclosure
        items={[{ label: "本文", value: "token expired", mask: false }]}
      >
        <div>補足テキスト</div>
      </DetailsDisclosure>
    );

    expect(html).toContain("token expired");
    expect(html).toContain("補足テキスト");
  });
});
