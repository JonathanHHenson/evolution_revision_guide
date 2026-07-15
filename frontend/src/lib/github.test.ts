import { describe, expect, it } from "vitest"

import { githubFileUrl } from "./github"

describe("GitHub file links", () => {
  it("links repository Markdown to the main branch", () => {
    expect(githubFileUrl("lessons/01-history-of-thought/README.md")).toBe(
      "https://github.com/JonathanHHenson/evolution_revision_guide/blob/main/lessons/01-history-of-thought/README.md",
    )
  })
})
