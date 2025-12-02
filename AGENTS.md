# Sremska School Site Agents & Developer Guide

## Project Overview
This is the static website for Sremska School, built with Eleventy (11ty).
**Stack:** Node.js, Eleventy, Nunjucks, Markdown, CSS/JS bundling.

## Setup & Development
- **Install dependencies:** `npm install`
- **Run dev server:** `npm start` (or `npx @11ty/eleventy --serve`)
- **Build for production:** `npm run build`

## Architecture

### Directory Structure
- `content/`: Source content (Markdown, Nunjucks templates).
- `_includes/`: Reusable layouts and partials.
- `_data/`: Global data files.
- `public/`: Static assets passed through to root.
- `eleventy.config.js`: Main configuration file.

### Key Patterns
- **Image Optimization:** Uses `eleventy-img` via shortcodes (e.g., `thumbnail`).
- **Bundling:** CSS and JS are bundled using Eleventy bundles output to `dist`.
- **Navigation:** Uses `eleventy-navigation` plugin.
- **RSS:** Generates Atom feed at `/rss/feed.xml`.

## Testing
- **Build Verification:** Ensure `npm run build` completes without errors.
- **Linting:** (If applicable, verify HTML structure/validity).

## Code Style
- **Templates:** Use Nunjucks (`.njk`) for logic and layouts.
- **Images:** Always use the `thumbnail` shortcode or optimized image handling for media.
- **Structure:** Keep content logic in frontmatter or `11tydata.js` files.

## Agents in this repo
- **planning-agent**: Creates detailed implementation plans and content structures.
- **implementation-agent**: Implements features, templates, and fixes.
- **review-agent**: Reviews changes for correctness, accessibility, and style.
