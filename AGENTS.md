# Agent guide

## Project purpose

This repository turns Gutsick Gibbon's livestream course with Will Duffy into a
revision-friendly guide to evolution and deep time. The aim is faithful,
traceable teaching material: a reader should be able to understand Erika's
explanation, revise it in manageable sections, and jump to the exact place in
the livestream where the point was made.

This is not a generic evolution textbook, a transcript dump, or a debate recap.
Do not silently add claims because they are scientifically reasonable. When a
note says that Erika or Will argued, asked, accepted, or answered something,
that statement must be recoverable from the relevant video or caption track.

## Non-negotiable editorial rules

1. **Ground course content in the recording.** Work from the complete video and
   its caption track. Paraphrase accurately; check the audio when a caption is
   garbled or a precise name, quotation, number, or citation matters.
2. **Put timestamps beside the material they support.** Use links such as
   `[1:23:40](https://www.youtube.com/watch?v=9uQWss3w8x0&t=5020s)`. Do not collect
   a block of unexplained timestamps at the top of a note. The visible time and
   the `t=` value must describe the same instant, use the lesson's video ID, and
   fall within the recording.
3. **Explain rather than merely enumerate.** Define the idea, reconstruct
   Erika's reasoning, connect evidence to the claim it tests, state important
   qualifications, and give the examples used in the lesson. Add detail only
   when the recording or a clearly labelled external source supports it.
4. **Keep files focused, not skeletal.** A file should cover one coherent part
   of a lesson in enough depth to revise it without constantly opening another
   summary. Use informative headings, short paragraphs, tables for exact
   comparisons, and active-recall prompts. Do not create duplicate “expanded,”
   “more detailed,” chronological-walkthrough, source-trail, or evidence-map
   notes; improve the existing topic note instead.
5. **Separate voices and evidence.** Make it clear whether a point is Will's
   opening claim, Will's question, Erika's answer, the guide's synthesis, or
   external further reading. Do not present a guide inference as Erika's words.
6. **Exclude audience Q&A.** `will-duffy-qa.md` covers questions Will asks Erika
   and Erika's replies. Stop before the end-of-stream superchat or audience-Q&A
   segment identified in the lesson README.
7. **Use real, local visuals.** Images must be frames from the livestream or
   downloaded from a traceable external source. Do not use AI-generated images,
   placeholders, hotlinked remote embeds, or a central catch-all asset folder.
   Store each image in `lessons/<lesson>/images/`, insert it next to the relevant
   explanation, add useful alt text, and immediately state its creator/source,
   licence or public-domain status, and any crop or conversion.
8. **Use diagrams where relationships need them.** Mermaid is appropriate for
   branching, nested classification, multi-stage processes, and converging
   evidence. Keep diagrams compact and scientifically accurate; do not add a
   diagram that merely repeats a two-item sentence.
9. **Cite external material in context.** Prefer the paper, dataset, museum,
   university, professional society, or government source. Link a secondary
   overview when it genuinely helps a learner. If the lesson names a source
   unclearly, report the known details and the uncertainty instead of guessing.
10. **Treat dates and future plans as changeable.** Recheck the channel, playlist,
    and Erika's latest public schedule statements before editing `ROADMAP.md`.
    Label a future date as announced, estimated, or unknown; never turn a cadence
    inference into a promise.

## Repository structure

```text
README.md                 project entry point and study routes
ROADMAP.md                recorded lessons and cautiously stated future plan
GLOSSARY.md               comprehensive definitions and distinctions
APPENDIX.md               technical reference tables, methods and notation
AGENTS.md                 editorial and maintenance contract
lessons/<nn-topic>/       complete notes for one livestream
  README.md               lesson map, scope, runtime and audience-Q&A cutoff
  00-wills-opening.md     Will's presentation before Erika's lesson
  01-*.md, 02-*.md, ...   detailed topic notes in teaching order
  will-duffy-qa.md        Will–Erika teaching exchange only
  images/                 locally stored, credited lesson visuals
docs/                     cross-course synthesis and study aids
  case-studies/           concise lineage comparisons across lesson notes
  revision/               glossary, checklist and active-recall support
sources/                  video catalogue, caption index and further reading
frontend/                 static Markdown browser, link checks and site styling
.github/workflows/         GitHub Pages validation and deployment
```

The lesson folders are the detailed source-facing layer. `docs/` should help a
reader connect ideas across lessons, not compete with or copy whole lesson
files. `sources/` is the audit and discovery layer. The root README is a clear
front door; it should not become a second textbook. `GLOSSARY.md` defines terms
across the whole course, while `APPENDIX.md` holds reusable technical reference
material that would disrupt the teaching flow if repeated in every lesson. The
`frontend/` discovers repository Markdown and local media at build time; do not
copy lesson prose or images into it as a second source of truth.

## Ground-truth hierarchy

Use sources in this order when reconstructing the course:

1. the livestream audio and on-screen material;
2. the complete YouTube caption track as a searchable index;
3. links or bibliographic details explicitly given by Erika or Will;
4. primary scientific literature and authoritative institutional references;
5. high-quality secondary explanations, clearly identified as further reading.

Auto-captions are useful but fallible. They commonly damage taxonomic names,
author names, dates, DOI strings, and specialist vocabulary. Never preserve an
obvious caption error simply because it is written in the VTT file.

## Adding a future lesson

### 1. Confirm and capture the source

- Verify that the upload belongs to the Will Duffy teaching series.
- Record its exact YouTube title, video ID, public recording/upload date, and
  runtime. Do not derive a date from a third-party reupload.
- Download the complete English caption track into a working area outside the
  repository. Caption files are source material and are not committed here.
- Watch enough of the recording to identify the start of Will's presentation,
  Erika's lesson, their teaching discussion, and the audience-Q&A cutoff.

### 2. Map the stream before drafting

- Build a timestamped outline from the captions, then check it against the
  video. Identify the main teaching arcs rather than cutting files at arbitrary
  clock intervals.
- Note every source, paper, book, diagram, fossil, organism, experiment, and
  image Erika or Will invokes. Flag uncertain spellings or citations for
  verification.
- Create `lessons/<two-digit-number>-<short-slug>/` using the established file
  contract. Add as many numbered topic notes as the material needs, but no
  parallel summary or “expanded” versions of the same topic.

### 3. Write the lesson package

- In the lesson README, explain the question the lesson answers, give the full
  video link and runtime, state the superchat cutoff, provide a recommended
  study route, and map stream sections to topic files.
- Summarise Will's opening presentation in `00-wills-opening.md`, preserving his
  reasoning and questions without endorsing or caricaturing them.
- Write detailed topic notes in teaching order. Put precise timestamps at the
  claim, example, qualification, or transition they document.
- Build `will-duffy-qa.md` around Will's actual questions and Erika's actual
  replies. Split compound exchanges into revision-friendly questions without
  changing their meaning.
- Add real images inline and compact Mermaid diagrams where they improve
  understanding. Verify every visual credit and every scientific label.
- Finish each topic with a concise recap or active-recall prompts that test
  reasoning, not just vocabulary.

### 4. Integrate it across the repository

- Add the recording to `sources/livestream-catalog.md` and add useful anchors to
  `sources/timestamped-transcript-index.md`.
- Extend `sources/further-reading.md` only with material actually useful for the
  new lesson or for checking a named source.
- Update `ROADMAP.md`, the root README lesson table, `docs/00-course-map.md`, and
  any cross-course or case-study page whose scope genuinely changes.
- Add genuinely new terminology to `GLOSSARY.md` and reusable equations,
  notation, lineage summaries or methods to `APPENDIX.md`. Do not expand either
  file merely to repeat prose already present in the lesson.
- Recalculate published runtime totals and advance every “as of” date together.
- Check all relative paths from the file that contains them; a link working from
  the repository root is not enough.

## Quality gates

Do not call a lesson complete until all of these pass.

### Content and traceability

- Every substantive attribution to Erika or Will has a nearby timestamp.
- Timestamp density follows the ideas: a long paragraph with several distinct
  claims normally needs more than one source point.
- The visible timestamp equals the YouTube `t=` offset, uses the correct video,
  and is within the video's runtime.
- The notes cover the complete teaching portion, including qualifications and
  examples, without drifting into audience superchats.
- Scientific additions beyond the stream are labelled and cited; uncertain
  source identifications remain explicitly uncertain.

### Structure and readability

- All lesson files are linked from that lesson's README and from no misleading
  duplicate navigation page.
- Headings form a useful outline, paragraphs are digestible, and tables are used
  only for real comparisons or mappings.
- Mermaid diagrams render and contain no unsupported relationships.
- Terminology and taxon names are consistent with the glossary and with current
  cited usage.
- New glossary entries are specific enough to revise from, identify important
  confusions, and link back to an appropriate lesson or source.
- Appendix tables and equations state their assumptions, units and limitations;
  they do not present a teaching simplification as a universal rule.

### Links and media

- Every local Markdown link and image path resolves with exact case.
- There are no remote image embeds, broken files, or uncredited images.
- Image files open successfully and are stored beside the lesson that uses them.
- External links go to the intended source, not a search-results page; DOI links
  resolve to the cited paper.

### Repository checks

Run at minimum:

```bash
git diff --check
git status --short
rg -n '!\[[^]]*\]\(https?://' --glob '*.md' .
rg -n 'youtube\.com/watch\?v=[^ )]+&t=[0-9]+s' --glob '*.md' .
npm --prefix frontend test
npm --prefix frontend run build
```

The first two commands catch malformed patches and accidental files. Review the
remote-image search and remove every hit unless it is deliberately showing
Markdown syntax in documentation. The timestamp search is an inventory, not a
substitute for checking labels, offsets, video IDs, and stream durations.

Before committing, run a local-link validator over all Markdown files, inspect
every new image with an image-identification tool, and spot-check several
timestamp links per file against the captions and video. The frontend build
validates exact-case Markdown, folder, image and heading-fragment targets before
producing the Pages artifact. Package only tracked repository content, and keep
unrelated user changes intact.

## Definition of done

A future reader can start at the root README, see what has and has not been
recorded, choose a study route, understand each explanation without guessing at
missing steps, and verify the guide against Erika's lesson at the exact relevant
moment. If any of those paths breaks, the work is not finished.
