# 💎 ScorelyAI: Technical UI/UX Style Guide

---

## 0. Confirmed Decisions (from design Q&A session, 2026-02-22)

| Topic | Decision |
| :--- | :--- |
| **Navigation** | No dedicated nav bar. ScorelyAI logo in top-left on every page acts as a home button (links to `/`). |
| **Score hero display** | Percentage (e.g., `94%`) is the dominant large number. Raw score (`47/50 points`) shown smaller below. |
| **Rename scope** | Visible UI text + browser metadata (`<title>`, description) + README & docs. Backend code NOT renamed. |
| **Homepage content** | Full landing page: Hero → "How it Works" (3 steps) → Features (3 cards) → Bottom CTA. |
| **Logo format** | Inline SVG React component (`ScorelyLogo.tsx`) — diamond icon + SCORELY**AI** wordmark, wrapped in `<Link href="/">`. |

---

**Project:** AI-Driven Report Auditor & Grader  
**Aesthetic:** High-Authority Dark Mode (Executive Tech)  
**Core Principles:** Precision, Authority, and Speed.

---

## 1. Branding & Visual Identity
The name **ScorelyAI** represents the intersection of data-driven results and intelligent feedback.

### 1.1 The Logo Specification
* **Typeface:** `Inter` Semi-Bold.
* **Styling:** All-caps with increased tracking (`tracking-wider`).
* **Color:** Primary Text (**#F8FAFC**) with the "AI" suffix highlighted in DECA Blue (**#0073C1**).
* **Visual Icon:** A minimalist, sharp-edged diamond silhouette placed to the left of the text.
    * *Implementation:* Use a simple SVG path with a `stroke-width` of **1.5** and **0px** corner radius for a "technical" look.

---

## 2. Global Design System

### 2.1 The "Authority" Palette
Avoid pure `#000000` to prevent a "gaming" look. Use deep ink navies for depth.

| Role | Hex Code | Tailwind Utility | Purpose |
| :--- | :--- | :--- | :--- |
| **Canvas** | `#000B14` | `bg-[#000B14]` | Main page background |
| **Surface** | `#00162A` | `bg-[#00162A]` | Cards, Modals, and feedback blocks |
| **Accent** | `#0073C1` | `bg-[#0073C1]` | DECA Blue - Buttons and active states |
| **Border** | `#1E293B` | `border-[#1E293B]` | Structural dividers and card strokes |
| **Text-Primary**| `#F8FAFC` | `text-slate-50` | Main titles and High-contrast data |
| **Text-Muted** | `#94A3B8` | `text-slate-400` | Support text and secondary feedback |

### 2.2 Semantic Scoring (Feedback Colors)
These must be used for the performance bars and score indicators.
* **Exceeds (Green):** `#10B981` (Emerald 500)
* **Meets (Yellow):** `#FBBF24` (Amber 400)
* **Below (Red):** `#EF4444` (Red 500)
* **No Credit (Dark Red):** `#7F1D1D` (Red 900)

---

## 3. Geometry & Typography

### 3.1 Edge Logic (Micro-Radius)
* **Buttons:** `rounded-sm` (**2px**). Sharp, but high-end.
* **Cards/Sections:** `rounded-md` (**4px** max).
* **Inputs:** `rounded-sm` (**2px**).

### 3.2 Typography (The Inter System)
* **Primary Font:** `Inter` (Sans-serif).
* **Logic:**
    * **The Big Number:** `text-8xl font-bold tracking-tighter`.
    * **Headers:** `font-semibold uppercase tracking-wide`.
    * **Feedback Body:** `text-base leading-relaxed text-slate-300`.

---

## 4. Component Architecture

### 4.1 The "Step-by-Step" Loader
When the report is processing, display a vertical checklist of the following steps with a "Pulse" animation on the active item:
1.  **Initializing Audit Engine...**
2.  **Parsing Document Structure...**
3.  **Analyzing Performance Indicators...**
4.  **Cross-Referencing Rubric Standards...**
5.  **Finalizing Quality Insights...**

### 4.2 The Scorer Page (High-Density UI)
* **Hero Section:** Huge centered score (e.g., **94/100**) with the text "Audit Complete."
* **Component Bars:**
    * **Track:** Deep navy background (`#000B14`).
    * **Fill:** Solid color based on score (Green/Yellow/Red).
    * **Interaction:** Entire row is clickable. On click, it slides open (accordion) to reveal a "Deep Dive" feedback block.
* **Feedback Blocks:** Use a slightly lighter background (`#001E35`) and `border-l-2` in the color of the score to separate it from the rest of the page.

---

## 5. Instructions for Claude Code
1.  **Strict Layout:** Use a top-navigation layout. Keep the center content width to a maximum of `max-w-5xl`.
2.  **Transitions:** Use `transition-all duration-300 ease-in-out` for all accordion expansions and button hovers.
3.  **Authority:** Ensure there is enough white space (padding/gap) between data points. Use `gap-12` for major vertical sections.
4.  **No Gradients:** Use solid colors for bars and buttons. Solid colors feel like "Enterprise" / "Authority."