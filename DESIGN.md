# Ideas — design

Since 2026-11-14 this app uses the shared App shell (`APP-SHELL.md`): stage lists in the
sidebar (pills on phones), search, a composer with a Stage segmented control, idea rows with
stage pills (Seed grey, Shaping amber, Testing green, Parked grey), and remove with undo.
The earlier "Idea Field" theme below is kept for history.

---

---
name: Idea Field
description: A black-and-white signal instrument for moving loose thoughts one step forward.
colors:
  black: "#080808"
  black-soft: "#111111"
  white: "#f7f7f2"
  white-soft: "#d8d8d0"
  line: "#454545"
  muted: "#b8b8b0"
  signal-lime: "#d6ff38"
  signal-ink: "#101500"
  danger-coral: "#ff9276"
typography:
  display:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "clamp(3.2rem, 8vw, 6.6rem)"
    fontWeight: 560
    lineHeight: 0.88
    letterSpacing: "-0.085em"
  body:
    fontFamily: "Archivo, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  data:
    fontFamily: "DM Mono, SFMono-Regular, Consolas, monospace"
    fontSize: "0.65rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  pill: "999px"
spacing:
  frame: "1220px"
  section: "86px"
  content: "20px"
components:
  active-signal:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.pill}"
    padding: "7px 11px"
---

# Design System: Idea Field

## Overview

**Creative North Star: “The data-sublime field, made useful.”**

Idea Field borrows the disciplined density of barcode columns and data lattices, then puts it to work on a human task: keeping a rough idea visible until it has a next move. Pure black and warm white make the field feel like an instrument. Lime is reserved for an active signal, a current state, or the action that places a thought. The page uses a capture bay, an index, and a reading surface instead of a grid of generic cards.

## Rules

- One black field, one warm white reading layer, one lime signal.
- Dense mono labels are for state and measurement; prose stays in the sans voice.
- Rows are the content structure. Avoid rounded containers, shadows, and KPI walls.
- A selected idea gains a quiet dark surface and lime signal bars; state is never communicated by color alone.
- Motion is limited to the first field reveal and the current reading change, with a reduced-motion fallback.
