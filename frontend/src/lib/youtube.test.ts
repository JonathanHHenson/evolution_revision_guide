import { describe, expect, it } from "vitest"

import { parseYouTubeUrl } from "./youtube"

describe("YouTube timestamp links", () => {
  it("parses the repository's numeric-second watch links", () => {
    expect(parseYouTubeUrl("https://www.youtube.com/watch?v=9uQWss3w8x0&t=5020s")).toEqual({
      videoId: "9uQWss3w8x0",
      startSeconds: 5020,
      originalUrl: "https://www.youtube.com/watch?v=9uQWss3w8x0&t=5020s",
    })
  })

  it("supports compact, colon, short, and live YouTube URLs", () => {
    expect(parseYouTubeUrl("https://youtu.be/9uQWss3w8x0?t=1h23m40s")?.startSeconds).toBe(5020)
    expect(parseYouTubeUrl("https://youtube.com/live/9uQWss3w8x0?t=1:23:40")?.startSeconds).toBe(5020)
  })

  it("does not intercept unrelated links", () => {
    expect(parseYouTubeUrl("https://example.com/watch?v=9uQWss3w8x0&t=20s")).toBeNull()
    expect(parseYouTubeUrl("not a URL")).toBeNull()
  })

})
