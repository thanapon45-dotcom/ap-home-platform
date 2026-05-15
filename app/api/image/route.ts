import { NextRequest, NextResponse } from "next/server";
import fs   from "fs";
import path from "path";

// ─── Style definitions ───────────────────────────────────────────────────────
const BASE_BY_STYLE: Record<string, string> = {
  "minimal":
    "two-storey modern minimal box house on slim concrete columns, clean flat roof, white textured concrete facade, large floor-to-ceiling windows, restrained elegant simplicity, breeze block accent wall, minimal tropical landscaping",
  "contemporary":
    "two-storey contemporary residence, balanced horizontal geometry, glass and warm wood and stone composition, open terrace with slim steel railing, modern luxury proportions, refined upscale aesthetic",
  "modern tropical":
    "two-storey modern tropical box house on stilts, wide flat overhanging roof for shade, deep semi-outdoor ground-floor living area open to garden, vertical timber louvre screens, warm teak and white concrete, floor-to-ceiling glass, lush tropical greenery — banana leaves, palm trees, ferns — climbing vines on columns",
  "Nordic":
    "two-storey Nordic modern residence, warm timber cladding, clean Scandinavian pitched roof with generous eaves, large windows, cozy and elegant, surrounded by light foliage",
  "Luxury":
    "grand two-storey luxury modern residence, marble and stone facade, tall glass curtain walls, dramatic cantilevered roof, manicured formal garden, prestigious refined aesthetic",
  "Loft":
    "two-storey industrial loft residence, exposed concrete and weathered steel frame, oversized factory-style windows, flat roof, raw urban-luxury aesthetic, interior visible",
};

const STYLE_TO_RENDER: Record<string, string> = {
  "Modern Minimal":  "minimal",
  "Nordic":          "Nordic",
  "Luxury":          "Luxury",
  "Contemporary":    "contemporary",
  "Loft":            "Loft",
  "Tropical Modern": "modern tropical",
};

const NEGATIVE_RULES =
  "absolutely no Thai traditional architecture, no Thai roof, no Thai gable, no temple roofline, no curved ornamental roof, no traditional Asian house silhouette, no cartoon, no fantasy, no people as main focus, no watermark, no title text, no caption text, no logo";

// ─── Style-specific building descriptions ────────────────────────────────────
const STYLE_BUILDING: Record<string, {
  heroElement: string;
  volumes: string;
  accent1Label: string;
  accent1Desc: string;
  accent3Label: string;
  accent3Desc: string;
}> = {
  "Contemporary": {
    heroElement: "dramatic flat cantilever roof extending 3 metres beyond the facade",
    volumes: `LEFT VOLUME — MAIN HOUSE, TWO STOREYS:
The cantilever flat roof is the hero. It extends boldly 3 metres out. SOFFIT UNDERSIDE: warm teak timber planks — COLOUR ACCENT ONE. Deep 2B shadow where soffit meets facade. Double-height floor-to-ceiling glass curtain wall below, slim black steel grid. Upper level: wide horizontal windows, glass balustrade balcony, white plaster walls.

CENTRE VOLUME — ENTRANCE BLOCK:
Stone cladding accent wall, bold cross-hatch texture. Tall timber entrance door. Terraced approach: four levels of wide flat stone steps, low shrubs planted between each level — COLOUR ACCENT THREE.

RIGHT VOLUME — SECONDARY LIVING WING, SINGLE STOREY:
Lower flat-roof garage. White roller door. Partially cropped at frame right.`,
    accent1Label: "Cantilever soffit underside",
    accent1Desc: "warm teak timber brown — rich, fully saturated coloured pencil across full soffit area",
    accent3Label: "Shrubs between entrance steps",
    accent3Desc: "faint grey-green — subtle, lightly applied",
  },

  "Nordic": {
    heroElement: "steeply pitched gabled roof with deep generous timber eaves",
    volumes: `LEFT VOLUME — MAIN HOUSE, TWO STOREYS:
The pitched gabled roof is the hero element — steep Nordic profile, deep generous eaves extending well beyond the facade. UPPER FACADE: warm honey-brown timber cladding on the full upper storey — COLOUR ACCENT ONE. Lower storey: natural stone base plinth, light grey pencil cross-hatching. Large picture windows: two wide openings on upper level, floor-to-ceiling glass on ground level, slim black frames. Interior glow visible — COLOUR ACCENT TWO.

CENTRE VOLUME — COVERED ENTRY PORCH:
Low-pitched canopy over the entrance, slim timber posts. Solid timber front door. Three wide flat stone steps rising to entrance, low ground-cover shrubs at base — COLOUR ACCENT THREE.

RIGHT VOLUME — SECONDARY LIVING WING, SINGLE STOREY:
Lower flat or gently pitched roof. White roller door. Partially cropped at frame right. Lighter pencil strokes, reads as receding.`,
    accent1Label: "Upper facade timber cladding",
    accent1Desc: "warm honey-brown horizontal timber boards — rich saturated coloured pencil on full upper storey",
    accent3Label: "Ground-cover shrubs at entrance",
    accent3Desc: "faint grey-green — very lightly applied",
  },

  "Luxury": {
    heroElement: "grand dramatic cantilevered roof with marble stone facade and pool terrace",
    volumes: `LEFT VOLUME — GRAND MAIN HOUSE, TWO STOREYS:
Grand cantilevered flat roof is the hero — extends 4 metres, razor-thin edge with heavy dark contour. FACADE: premium marble or travertine stone cladding — COLOUR ACCENT ONE (warm cream/ivory stone tone). Tall glass curtain wall: double-height floor-to-ceiling glass, slim bronze/dark metal frames. Upper level: wide panoramic windows, open stone terrace with slim steel railing. Interior glow — COLOUR ACCENT TWO.

CENTRE VOLUME — FORMAL ENTRANCE:
Tall stone feature wall. Grand entrance canopy on slim steel columns. Wide stone approach steps — four levels, manicured low hedges — COLOUR ACCENT THREE.

RIGHT VOLUME — SECONDARY LIVING WING, SINGLE STOREY:
Premium garage, clean flat roof. Dark roller door or hidden door. Partially cropped at frame right.`,
    accent1Label: "Stone/marble facade cladding",
    accent1Desc: "warm cream/ivory travertine stone — soft warm tone, coloured pencil on facade panels",
    accent3Label: "Manicured formal hedges",
    accent3Desc: "faint grey-green — very subtle, trimmed formal shapes",
  },

  "Modern Minimal": {
    heroElement: "ultra-clean flat roof with zero overhang and pure white smooth concrete facade",
    volumes: `LEFT VOLUME — MAIN HOUSE, TWO STOREYS:
Flat roof with minimal overhang — pure clean edge, no cantilever. White smooth stucco/concrete facade. Deep-set recessed windows: two on upper level set 200mm into wall, creating strong shadow lines. Ground level: wide floor-to-ceiling sliding glass panel, slim black frame. One slim timber accent door or panel — COLOUR ACCENT ONE. Interior glow — COLOUR ACCENT TWO.

CENTRE VOLUME — MINIMAL ENTRANCE:
Flush concrete entrance wall. Timber pivot door. Three clean flat stone steps. Slim low hedge — COLOUR ACCENT THREE.

RIGHT VOLUME — SECONDARY LIVING WING, SINGLE STOREY:
Clean flat-roof garage. Flush white roller door. Partially cropped at frame right.`,
    accent1Label: "Timber entrance door or accent panel",
    accent1Desc: "warm teak brown — single focal accent, coloured pencil",
    accent3Label: "Low trimmed hedge at entrance",
    accent3Desc: "faint grey-green — minimal, barely perceptible",
  },

  "Loft": {
    heroElement: "flat industrial roof with exposed concrete walls and oversized factory-style steel-framed windows",
    volumes: `LEFT VOLUME — MAIN HOUSE, TWO STOREYS:
Flat industrial roof — bold dark pencil edge. RAW CONCRETE facade: cross-hatched texture throughout. EXPOSED STEEL BEAMS at roof and floor slab edges — COLOUR ACCENT ONE (warm rust-brown). Oversized factory-style windows: multiple steel-framed panes arranged in grid, large steel I-beam frame visible. Interior glow — COLOUR ACCENT TWO.

CENTRE VOLUME — INDUSTRIAL ENTRANCE:
Concrete entrance wall with raw texture. Heavy steel-framed door. Flat concrete approach steps. Minimal ground-level plants — COLOUR ACCENT THREE.

RIGHT VOLUME — SECONDARY LIVING WING, SINGLE STOREY:
Industrial flat roof. Exposed concrete walls. Large roll-up metal door. Partially cropped at frame right.`,
    accent1Label: "Exposed steel beams and structural frames",
    accent1Desc: "warm rust-brown weathered steel — coloured pencil on visible structural elements",
    accent3Label: "Ground-level minimal plants",
    accent3Desc: "faint grey-green — very sparse, industrial setting",
  },

  "Tropical Modern": {
    heroElement: "wide deep-overhanging flat roof for shade with vertical timber louvre screens",
    volumes: `LEFT VOLUME — MAIN HOUSE, TWO STOREYS:
Wide flat roof with 2-metre overhang for sun shading. UPPER FACADE: full-height vertical timber louvre screens — COLOUR ACCENT ONE (warm teak brown). Open semi-outdoor ground floor: slim concrete columns, deep shaded terrace. Floor-to-ceiling sliding glass behind the louvres. Interior glow — COLOUR ACCENT TWO.

CENTRE VOLUME — ENTRANCE BLOCK:
Concrete column entrance frame. Timber pivot door. Low raised platform steps. Low ground-cover shrubs — COLOUR ACCENT THREE.

RIGHT VOLUME — SECONDARY LIVING WING, SINGLE STOREY:
Flat roof, white walls. Roller door. Partially cropped at frame right.`,
    accent1Label: "Vertical timber louvre screens on upper facade",
    accent1Desc: "warm teak brown — strong consistent tone on louvre panels",
    accent3Label: "Ground-cover shrubs at base",
    accent3Desc: "faint grey-green — lightly applied",
  },
};

// ─── Prompt builders ─────────────────────────────────────────────────────────

// Style base descriptions (mirrors what n8n's AI generates as image_style_base)
const FINNHOUSES_STYLE_BASE: Record<string, string> = {
  "contemporary":    "premium contemporary two-storey residence, flat cantilever roof, floor-to-ceiling glass curtain wall with dark steel frames, warm amber interior glow and furniture silhouettes visible through glass, stone and concrete facade, secondary lower wing extending to the right — wide multi-level stone terrace steps in foreground with low ornamental shrubs planted between each level, small cloud-pruned garden trees flanking the steps, narrow reflecting pool at base of steps, one tall deciduous tree left background one right",
  "nordic":          "Nordic Scandinavian two-storey residence, steeply pitched gabled roof with deep overhanging timber eaves, warm honey timber cladding upper storey, natural stone base, large picture windows with warm amber interior glow visible, secondary lower wing to the right — wide stepped stone approach in foreground with ground-cover planting, small ornamental birch trees flanking entrance, tall slender deciduous trees framing both sides",
  "luxury":          "grand luxury two-storey modern residence, soaring marble and travertine stone facade, razor-thin cantilevered flat roof, double-height glass curtain wall with warm amber interior glow, secondary wing to the right — grand multi-level formal stone terrace in foreground with sculpted hedge planters, ornamental trees flanking approach, long narrow reflecting pool at foreground base, tall deciduous trees framing both sides",
  "minimal":         "modern minimal two-storey residence, pure flat roof zero overhang, smooth white stucco facade, deep-set recessed windows, single warm timber pivot door, warm amber interior glow through glass panels, lower secondary wing to the right — clean stone approach steps in foreground with very minimal low planting, single small cloud-pruned tree left, bare-branch trees framing both sides",
  "loft":            "industrial loft two-storey residence, exposed raw concrete walls, weathered steel frame visible, oversized factory windows with warm amber interior glow, flat roof, lower secondary structure to the right — wide concrete steps in foreground with sparse industrial planting, ornamental grasses, deciduous trees both sides",
  "modern_tropical": "tropical modern two-storey residence on slender concrete columns, wide deep overhanging flat shade roof, full-height vertical timber louvre screens, open semi-outdoor ground floor, warm amber interior glow visible, lower secondary living wing to the right — wide multi-level stone terrace steps in foreground with low compact ornamental shrubs between each level, small cloud-pruned garden trees flanking the steps, narrow reflecting pool at base of steps, tall deciduous trees both sides with full leaf canopy — NO palm trees, NO banana leaves, NO tropical plants",
};

// ─── 2-Step Concept Prompt (short, focused — mirrors n8n's image_style_base approach) ──────
// Used when `concept` is pre-generated by Claude on the client before calling this API.
// ~120 words vs 400+ words in the full prompts — reduces token waste, sharpens signal.
function buildPromptConcept(concept: string, style: string): string {
  const key = style.toLowerCase().replace(/[\s-]/g, "_");

  const ARCH: Record<string, string> = {
    "contemporary":    "flat cantilever roof extending 3m, floor-to-ceiling glass curtain wall, dark steel grid, layered stone + teak facade",
    "nordic":          "steep gabled roof with deep overhanging timber eaves, honey-brown timber upper storey, natural stone plinth base, large picture windows",
    "luxury":          "razor-thin cantilevered flat roof, marble/travertine stone facade, double-height glass curtain wall, grand formal approach",
    "minimal":         "zero-overhang flat roof, smooth white stucco facade, deep-set recessed windows, single warm timber pivot door",
    "loft":            "exposed raw concrete walls, visible structural steel frame, oversized multi-pane factory windows, flat industrial roof",
    "modern_tropical": "wide 2m flat shade roof on slim concrete columns, full-height vertical teak louvre screens, open semi-outdoor ground floor",
  };

  const CAM: Record<string, string> = {
    "contemporary":    "three-quarter front · afternoon golden hour · long shadow under cantilever soffit is the hero shadow",
    "nordic":          "slight frontal showing full gable height · soft diffused morning light · warm interior glow is dominant warmth",
    "luxury":          "three-quarter · camera low angled slightly upward · late afternoon · dramatic long shadows · monumental feeling",
    "minimal":         "straight frontal perfectly centred · crisp midday light · deep shadow only in recessed window reveals · vast white areas",
    "loft":            "three-quarter · overcast flat light · raw concrete board-form texture · industrial atmosphere",
    "modern_tropical": "wide three-quarter slightly further back · midday · deep shadow zone under overhang is hero shadow · louvre stripe shadows on glass",
  };

  const ACCENT: Record<string, string> = {
    "contemporary":    "teak brown on soffit underside · amber interior glow · faint grey-green shrubs",
    "nordic":          "honey-brown timber cladding upper storey (dominant) · amber hygge glow through windows (prominent) · barely-there grey-green",
    "luxury":          "ivory/cream travertine stone panels · strong amber double-height interior glow · faint grey-green formal hedges",
    "minimal":         "single warm teak pivot door only · very subtle amber glow — NO other colour whatsoever",
    "loft":            "rust-brown on exposed steel beams · amber factory window glow · sparse grey-green ground planting",
    "modern_tropical": "teak louvre vertical bands (dominant) · amber glow behind louvres · barely-perceptible grey-green foliage",
  };

  const label  = key === "modern_tropical" ? "Modern Tropical" : key === "minimal" ? "Modern Minimal" : style.charAt(0).toUpperCase() + style.slice(1);
  const arch   = ARCH[key]   ?? ARCH["contemporary"];
  const cam    = CAM[key]    ?? CAM["contemporary"];
  const accent = ACCENT[key] ?? ACCENT["contemporary"];

  return `Premium architectural pencil sketch · Finnhouses brand · ${label} style.

Visual concept: ${concept}

Architecture: two-storey ${label} house — ${arch}. Lower secondary living wing on right side, same modern style.
Camera: street level 25–30m · ${cam} · full building visible · white paper sky · horizontal landscape
Foreground: multi-level stone terrace steps + low ornamental shrubs between levels + narrow reflecting pool
Colour: ${accent} · ALL other areas = graphite pencil on white paper only
Interior: warm amber glow through glass · furniture silhouettes (sofa, pendant lamp)
Trees: one tall deciduous left · one right · graphite + barely-perceptible grey-green canopy

NO palm trees · NO coloured walls · NO Thai roof · NO text · NO watermark · NO blue sky · NO close-up crop`;
}

// Mirror n8n's exact prompt structure — produces the same style as blog images
function buildPromptN8nMirror(topic: string, style: string): string {
  const key       = style.toLowerCase().replace(/[\s-]/g, "_");
  const styleBase = FINNHOUSES_STYLE_BASE[key] ?? FINNHOUSES_STYLE_BASE["contemporary"];
  const styleLabel =
    key === "modern_tropical" ? "Modern Tropical" :
    key === "minimal"         ? "Modern Minimal"  :
    style.charAt(0).toUpperCase() + style.slice(1);

  const topicLine = topic ? `Content topic: ${topic}` : "";

  // ── Style-specific camera, light, shadow ──────────────────────────────────
  const STYLE_CAM: Record<string, string> = {
    "contemporary":
      "Three-quarter front perspective · camera at kerb height · 25–30m distance · AFTERNOON GOLDEN HOUR: low sun from left, long horizontal shadow cast by cantilever soffit underside — this shadow line is the HERO SHADOW of this sketch. The cantilever creates a bold dark band across the top of the facade.",
    "nordic":
      "Gentle frontal or very slight three-quarter · eye level showing full gable height · 25–30m · SOFT DIFFUSED MORNING LIGHT: gentle, even, no harsh shadows — gable symmetry and roofline read clearly against white sky. The warm interior glow through large windows is the dominant focal warmth.",
    "luxury":
      "Three-quarter front · camera LOW — angled gently upward to emphasise grandeur and monumental scale · 25–30m · LATE AFTERNOON GOLDEN LIGHT: dramatic long shadows, cantilever casts bold dark line on facade below, stone facade catches warm late-day glow. Everything conveys opulence.",
    "minimal":
      "Straight frontal perspective · perfectly centred · eye level · 25–30m · CRISP MIDDAY LIGHT: bright, sharp, high contrast. The only shadows are the deep dark recesses of the set-back windows — these are the HERO SHADOWS. Vast white areas of facade and sky dominate. Composition is spare.",
    "loft":
      "Three-quarter front · eye level · 25–30m · OVERCAST OR LATE AFTERNOON FLAT LIGHT: even illumination reveals raw concrete board-form texture across the full facade. Exposed steel beams catch a slight warm highlight. Urban industrial atmosphere — no dramatic highlights or shadows.",
    "modern_tropical":
      "Wide three-quarter front · camera slightly further back (28–32m) to capture full depth of roof overhang · MIDDAY BRIGHT: the strong DEEP SHADOW ZONE beneath the wide flat overhang is the HERO SHADOW — a broad dark band contrasting with the bright sky above. Vertical louvre screens cast parallel stripe shadows on the glass behind them.",
  };

  // ── Style-specific mood / atmosphere ─────────────────────────────────────
  const STYLE_MOOD: Record<string, string> = {
    "contemporary":    "Confident and refined — the sketch should feel like a premium property developer's presentation board. Balanced prestige.",
    "nordic":          "Cozy warmth (hygge) and calm natural elegance — Scandinavian understatement. The sketch should feel inviting and serene.",
    "luxury":          "Grand, prestigious, monumental — the sketch should make the viewer feel the building is larger and more impressive than expected.",
    "minimal":         "Meditative and zen — beauty in emptiness and restraint. The sketch should feel like it has REMOVED everything unnecessary. White paper is part of the composition.",
    "loft":            "Raw urban-luxury — the sketch should feel like an architect's honest study of industrial materials elevated to residential use.",
    "modern_tropical": "Breezy relaxed luxury, climate-responsive — the sketch should convey that this house breathes, stays cool, and feels perfectly suited for Thailand.",
  };

  // ── Style-specific colour accents (all within graphite monochrome) ────────
  const STYLE_ACCENTS: Record<string, string> = {
    "contemporary":
      "COLOUR ACCENTS — exactly three, everything else graphite or white paper:\n1. Warm teak-brown on cantilever soffit underside — rich fully saturated coloured pencil across full soffit area\n2. Warm amber glow through interior glass — soft luminous light, furniture silhouettes visible\n3. Very faint grey-green on ornamental shrubs between terrace steps — subtle, lightly applied",
    "nordic":
      "COLOUR ACCENTS — exactly three, everything else graphite or white paper:\n1. Warm honey-brown horizontal timber boards on full upper storey — rich consistent colour, strongest accent\n2. Warm amber glow through interior windows — PROMINENT, hygge warmth is the emotional core\n3. Barely-perceptible grey-green on base ground-cover plants — almost invisible, just a hint",
    "luxury":
      "COLOUR ACCENTS — exactly three, everything else graphite or white paper:\n1. Warm cream/ivory travertine stone on facade panels — soft warm tone, coloured pencil on cladding\n2. Warm amber glow through double-height glass — STRONGEST of all styles, luminous interior\n3. Very faint grey-green on formal sculpted hedges — subtle, trimmed formal shapes",
    "minimal":
      "COLOUR ACCENTS — exactly two only, everything else graphite and white paper:\n1. Single warm teak pivot door — one precise focal accent, nothing else on the facade\n2. Very subtle amber glow through glass — barely perceptible, present but not prominent\nNO third accent — zero green planting colour. Maximum restraint.",
    "loft":
      "COLOUR ACCENTS — exactly three, everything else graphite or white paper:\n1. Warm rust-brown on exposed steel beams and structural frame elements — visible structural members only\n2. Warm amber glow through oversized factory-style windows\n3. Very sparse faint grey-green on minimal ground-level planting",
    "modern_tropical":
      "COLOUR ACCENTS — exactly three, everything else graphite or white paper:\n1. Warm teak-brown on full-height vertical louvre screens — strong consistent vertical bands, dominant accent\n2. Warm amber glow through glass behind louvres — visible in the shaded zone\n3. Barely-perceptible grey-green on ornamental trees and foreground shrubs",
  };

  // ── Style-specific foreground treatment ───────────────────────────────────
  const STYLE_FOREGROUND: Record<string, string> = {
    "contemporary":    "Multi-level stone terrace steps (4 levels) with low ornamental shrubs between each level · narrow reflecting pool at base of steps",
    "nordic":          "Three wide flat stone steps · very low ground-cover planting at base · simple and restrained, Nordic minimalism in the garden",
    "luxury":          "Grand multi-level formal stone terrace (4–5 wide levels) · sculpted manicured hedges in planters at each level · long narrow formal reflecting pool at base",
    "minimal":         "Two or three clean flat stone steps only · single small cloud-pruned tree on LEFT side only · vast empty ground plane, mostly white paper",
    "loft":            "Flat concrete approach with one or two concrete steps · sparse ornamental grasses in concrete planters · minimal industrial planting",
    "modern_tropical": "Wide multi-level stone terrace steps (3–4 levels) with low compact shrubs between levels · small cloud-pruned ornamental trees flanking · narrow pool at base",
  };

  const camLight   = STYLE_CAM[key]        ?? STYLE_CAM["contemporary"];
  const mood       = STYLE_MOOD[key]       ?? STYLE_MOOD["contemporary"];
  const accents    = STYLE_ACCENTS[key]    ?? STYLE_ACCENTS["contemporary"];
  const foreground = STYLE_FOREGROUND[key] ?? STYLE_FOREGROUND["contemporary"];

  return `Create a premium architectural pencil sketch presentation board for the Finnhouses brand.

Selected style: ${styleLabel}
${topicLine}

MOOD: ${mood}

PRESENTATION BOARD LAYOUT:
This is an architect's studio presentation board — NOT a plain sketch on blank paper.
BACKGROUND: faint architectural blueprint drawings fill the entire background behind the main sketch — multiple full elevation views and section drawings in pale blue-gray pencil lines on off-white paper. These blueprint drawings are clearly visible as a background layer. The main perspective sketch of the house sits prominently in front of this blueprint background.
CORNER DETAILS: small loose pencil elevation or section thumbnail sketches in the upper-left and upper-right corners of the board, smaller than the main image.

MAIN SKETCH REQUIREMENTS:
- premium hand-rendered architectural pencil sketch, refined ink linework with precise hatching
- must feel like an architect's concept presentation board for a high-end Thai real estate developer
- FULL BUILDING visible from foundation to roofline — two-storey main volume + lower secondary living wing on right side
- small ornamental deciduous trees framing both sides — fine branch strokes, graphite only
- INTERIOR through glass: warm amber glow, furniture silhouettes (sofa, pendant lamp, low table) faintly visible
- wide landscape composition — horizontal format 16:9

CAMERA AND LIGHT:
${camLight}

FOREGROUND:
${foreground}

${accents}

NEGATIVE CONSTRAINTS (CRITICAL):
- NO Thai style architecture, NO Thai roof, NO temple roof, NO curved ornamental roof
- NO traditional Asian house, NO cartoon, NO fantasy house
- NO close-up, NO zoomed-in crop — must show COMPLETE building with foreground
- NO coloured walls or coloured facade — graphite monochrome only (except the 3 accents above)
- NO bare winter trees — trees must have summer leaf canopy
- NO palm trees — NO banana leaves — NO bamboo — NO tropical plants (ALL styles)
- NO blue sky, NO clouds — upper area shows blueprint drawings background only
- NO visible text labels, NO dimensions, NO annotations, NO watermark, NO logo

Architectural direction:
${styleBase}

FINAL RULE:
Output must look like a professional architectural studio presentation board — pencil sketch of the ${styleLabel} house layered over faint blueprint drawings background, with small elevation thumbnails in corners. Suitable as a premium featured image for a luxury Thai real-estate article.`;
}

function buildPromptOpenAI(topic: string, style: string, styleBase: string): string {
  const renderStyle = STYLE_TO_RENDER[style] ?? "contemporary";
  const bld = STYLE_BUILDING[
    style === "Modern Minimal"  ? "Modern Minimal"  :
    style === "Nordic"          ? "Nordic"          :
    style === "Luxury"          ? "Luxury"          :
    style === "Loft"            ? "Loft"            :
    style === "Tropical Modern" ? "Tropical Modern" :
    "Contemporary"
  ];

  return `Premium architectural pencil sketch illustration. Finn Houses brand style.
HOUSE STYLE: ${style}. CONTENT TOPIC: ${topic}.

THIS IS THE FINN HOUSES BRAND VISUAL IDENTITY:
Hand-drawn architect's sketch on PURE BRIGHT WHITE paper — crisp clean white, not cream, not off-white. Mixed pencil weight — medium strokes for building outlines, light HB for wall shading, fine lines for glass and interior detail. Tonal range: white highlights → light-grey HB walls → moderate dark graphite in deep shadows only. Lines are confident but airy — not heavy or dense. Exactly three colour accents (listed below). Everything else is graphite pencil or white paper.

THIS SKETCH SHOWS A ${style.toUpperCase()} STYLE HOUSE — the architecture, proportions, roof form, and materials must clearly match the ${style} style. The hero element is: ${bld.heroElement}.

CAMERA:
Three-quarter perspective from street level, camera at kerb height tilted gently upward. Grand monumental feeling. White paper sky in upper frame.

BUILDING VOLUMES — ALL THREE MUST APPEAR:

${bld.volumes}

BACKGROUND (FAR LEFT):
Faint secondary building far behind trees — very light pencil lines, neighbourhood depth only.

INTERIOR THROUGH GLASS:
Ground floor: modern sofa, lounge chair, coffee table, framed artwork, pendant lamp. Warm amber cream light glowing softly — COLOUR ACCENT TWO.
Upper floor: reading chair, artwork on wall, pendant lamp, warm glow.

PENCIL TECHNIQUE:
Medium outlines on building silhouette. Light-to-medium hatching on walls — parallel diagonal strokes, spaced apart. Moderate cross-hatching in deep shadow zones. Perspective driveway lines converging to vanishing point. Ground plane with very light hatching. Overall linework density 15% lighter than typical — airy and spacious feel.

TREES — BROAD LEAF DECIDUOUS ONLY, ZERO PALM TREES:
Left: one large deciduous tree in foreground, one smaller mid-distance. Right: one tall broad-canopy deciduous tree. All trees: grey graphite only with subtle 5% grey-green tint on foliage. Fine branch strokes. Trees frame building without overpowering.

GROUND PLANE:
Grass and ground cover: faint 5% grey-green tint — just enough to distinguish from white paper.

COLOUR SUMMARY — ONLY THESE THREE, EVERYTHING ELSE IS GRAPHITE OR WHITE PAPER:
1. ${bld.accent1Label}: ${bld.accent1Desc}
2. Interior glow through glass: warm cream/amber — soft, luminous
3. ${bld.accent3Label}: ${bld.accent3Desc}

NO TEXT — NO LETTERS — NO NUMBERS — NO THAI TEXT — NO LABELS — NO WATERMARK. COMPLETELY TEXT-FREE.

FORBIDDEN: palm trees — tropical plants — banana leaves — coloured facade — coloured walls — coloured sky — coloured trees — wet ground reflection — border frame — red marks — annotation lines — Thai roof — cartoon proportions — flat illustration style.`;
}

// Clean illustration only — for Ideogram (text generation is unreliable, DesignBoard adds overlays)
function buildPromptIdeogram(topic: string, style: string, styleBase: string): string {
  return `Architectural watercolor illustration of a modern tropical house. Portrait format, no text.

ARCHITECTURAL STYLE: ${styleBase}
CONTEXT: ${topic}

BUILDING — FRONT ELEVATION:
Contemporary tropical box house elevated on slim concrete columns (piloti style).
Ground floor: fully open or semi-outdoor — exposed concrete columns, breeze block accent wall, visible interior with wooden dining table, shelving, plants inside.
Upper floor: private volume with timber louvre screens, large windows, warm wood facade details.
Lightweight flat roof with slight overhang for shade.

MATERIALS:
Exposed grey concrete columns and slabs. White textured concrete walls. Warm teak timber screens and louvres. Breeze block wall detail (grid of square openings). Large glass sliding doors. All materials honest and visible — no rendering, no paint.

VEGETATION:
Tall lush tropical trees in expressive watercolor on both sides — leaves overlapping the building. Climbing vines on columns. Dense shrubs at ground level. Warm tropical greens — emerald, olive, lime. Vegetation feels organic and lush, not manicured.

STYLE:
Architectural illustration mixing precise ink line drawing + loose watercolor washes.
Building: sharp pencil/ink linework defines structure.
Vegetation: loose gestural watercolor brushstrokes.
Background: off-white paper texture, very faint pencil construction lines.
Overall feeling: architect's hand-crafted concept sketch.

ABSOLUTE RULES — CRITICAL:
- ZERO text anywhere — no letters, no numbers, no annotations, no labels, no handwriting
- NO reversed text, NO garbled text, NO text of any kind
- NO technical drawings (added separately)
- NO annotation callout lines (added separately)
- NO Thai text, NO logos, NO watermarks
- ${NEGATIVE_RULES}

OUTPUT: A clean, beautiful architectural illustration of the building + vegetation only. Completely text-free.`;
}

// ─── OpenAI text-to-image ─────────────────────────────────────────────────────
// Tries gpt-image-1 first (requires org verification), falls back to dall-e-3
async function generateOpenAI(prompt: string, apiKey: string) {
  // Try gpt-image-1 first
  const res1 = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1536x1024", quality: "high" }),
  });
  const data1 = await res1.json();
  if (res1.ok && data1.data?.[0]) {
    const item = data1.data[0];
    return item.url ?? `data:image/png;base64,${item.b64_json}`;
  }

  // Fallback: dall-e-3 (stable, no org verification needed)
  // size: "1792x1024" = landscape — forces wide composition, shows full house + landscaping
  console.log("[Image API] gpt-image-1 failed, falling back to dall-e-3:", data1.error?.message);
  const res2 = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1792x1024", quality: "hd" }),
  });
  const data2 = await res2.json();
  if (!res2.ok || !data2.data?.[0]) throw new Error(data2.error?.message ?? "OpenAI generation failed");
  return data2.data[0].url as string;
}

// ─── OpenAI Images Edit API (with reference image) ────────────────────────────
async function generateOpenAIEdit(prompt: string, referenceBase64: string, apiKey: string) {
  // Strip data URL prefix if present
  const base64Data = referenceBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer     = Buffer.from(base64Data, "base64");
  const blob       = new Blob([buffer], { type: "image/png" });
  const file       = new File([blob], "reference.png", { type: "image/png" });

  const form = new FormData();
  form.append("model",   "gpt-image-1");
  form.append("prompt",  prompt);
  form.append("n",       "1");
  form.append("size",    "1536x1024");
  form.append("quality", "high");
  form.append("image[]", file);   // reference image — gpt-image-1 edit endpoint

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}` },
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.data?.[0]) throw new Error(data.error?.message ?? "OpenAI edit failed");
  const item = data.data[0];
  return item.url ?? `data:image/png;base64,${item.b64_json}`;
}

// ─── Gemini Image Generation ──────────────────────────────────────────────────
// Step 1: auto-discover models that support generateContent from ListModels API
// Step 2: try each candidate until one produces an image
const GEMINI_MODELS_FALLBACK = [
  "gemini-2.5-flash-preview-image-generation",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash-exp",
];

async function listGeminiImageCandidates(apiKey: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`
    );
    if (!res.ok) return GEMINI_MODELS_FALLBACK;
    const data = await res.json();
    const all: Array<{ name: string; supportedGenerationMethods?: string[] }> =
      data.models ?? [];

    // Keep only models that support generateContent
    const candidates = all
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace("models/", ""));

    // Sort: image-specific models first, then 2.5, then others
    candidates.sort((a, b) => {
      const score = (s: string) =>
        s.includes("image") ? 0 : s.includes("2.5") ? 1 : s.includes("flash") ? 2 : 3;
      return score(a) - score(b);
    });

    return candidates.length > 0 ? candidates : GEMINI_MODELS_FALLBACK;
  } catch {
    return GEMINI_MODELS_FALLBACK;
  }
}

async function generateGemini(prompt: string, apiKey: string) {
  const models = await listGeminiImageCandidates(apiKey);
  const errors: string[] = [];

  for (const modelName of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        errors.push(`[${modelName}] ${data.error?.message ?? res.status}`);
        continue;
      }

      // Extract inline image from response
      const parts: Array<{ inlineData?: { mimeType: string; data: string } }> =
        data.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p) => p.inlineData);
      if (!imgPart?.inlineData) {
        errors.push(`[${modelName}] no image in response`);
        continue;
      }

      const { mimeType, data: b64 } = imgPart.inlineData;
      console.log(`[Gemini] success with model: ${modelName}`);
      return `data:${mimeType};base64,${b64}`;

    } catch (e) {
      errors.push(`[${modelName}] ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  throw new Error(errors.slice(0, 5).join(" | ") || "Gemini: no suitable model found");
}

// ─── Gemini-specific prompt — style-first, clean, no rigid templates ──────────
// Keys match the lowercase/underscore values sent from the frontend STYLES array
const GEMINI_STYLE_ESSENCE: Record<string, string> = {
  "contemporary":    "contemporary modern house — dramatic flat cantilever roof extending 3 metres, floor-to-ceiling glass curtain wall, warm teak timber soffit, layered stone and timber facade, clean strong horizontal lines, refined upscale proportions",
  "nordic":          "Nordic Scandinavian house — steeply pitched gabled roof with deep overhanging timber eaves, warm honey-brown horizontal timber cladding on upper storey, natural stone base plinth, large wide-frame Scandinavian picture windows, cozy hygge character",
  "luxury":          "luxury grand modern residence — soaring marble and travertine stone facade, dramatic cantilevered flat roof with razor-thin edge, double-height glass curtain wall with dark metal frames, manicured formal garden with sculpted hedges, prestigious five-star aesthetic",
  "minimal":         "modern minimal house — pure clean flat roof with zero overhang, smooth white stucco concrete facade, deep-set recessed windows creating strong shadow lines, single warm timber pivot door as the only accent, absolute geometric serenity",
  "loft":            "industrial loft residence — exposed raw board-formed concrete walls, visible weathered steel structural frame, oversized multi-pane steel factory windows, clean flat roof, raw urban-luxury character",
  "modern_tropical": "tropical modern house — wide deep flat shade roof on slender concrete columns, full-height vertical timber louvre privacy screens, open semi-outdoor living ground floor, warm teak against white concrete, lush layered greenery framing the facade",
};

// Display labels for the style rule line
const GEMINI_STYLE_LABEL: Record<string, string> = {
  "contemporary":    "Contemporary Modern",
  "nordic":          "Nordic Scandinavian",
  "luxury":          "Luxury Modern",
  "minimal":         "Modern Minimal",
  "loft":            "Industrial Loft",
  "modern_tropical": "Tropical Modern",
};

function buildPromptGemini(style: string, topic?: string): string {
  const key   = style.toLowerCase().replace(/[\s-]/g, "_");
  const label = GEMINI_STYLE_LABEL[key] ?? style;
  const topicLine = topic ? `Context: Facebook post about "${topic}".` : "";

  // Architecture essences — structural description only, no color adjectives that trigger color rendering
  const archEssence: Record<string, string> = {
    "contemporary":    "two-storey contemporary residence — dramatic flat cantilever roof extending 3m beyond facade, floor-to-ceiling glass curtain wall with dark steel grid, layered stone and timber facade, strong horizontal lines, premium proportions",
    "nordic":          "two-storey Nordic Scandinavian residence — steeply pitched gabled roof with deep overhanging timber eaves, large Scandinavian picture windows, upper storey timber cladding, natural stone base plinth, cozy character",
    "luxury":          "grand two-storey luxury modern residence — soaring stone and marble facade, razor-thin cantilevered flat roof, double-height glass curtain wall, manicured formal garden approach, prestigious aesthetic",
    "minimal":         "two-storey modern minimal residence — ultra-clean flat roof with zero overhang, smooth stucco concrete facade, deep-set recessed windows, single timber pivot door, pure geometric serenity",
    "loft":            "two-storey industrial loft residence — exposed raw board-formed concrete walls, visible structural steel frame, oversized multi-pane factory-style steel windows, clean flat roof, urban character",
    "modern_tropical": "two-storey modern residence — wide deep flat roof on slender concrete columns, full-height vertical timber louvre screens, open semi-outdoor ground floor behind louvres, clean concrete and timber, generous shade",
  };

  const arch = archEssence[key] ?? archEssence["contemporary"];

  // Style-specific camera + light + shadow
  const styleCamera: Record<string, string> = {
    "contemporary":    "Three-quarter front · camera at kerb height · 25–30m · AFTERNOON GOLDEN HOUR: low sun from left, long horizontal shadow under cantilever soffit — bold dark band across the top of the facade is the HERO SHADOW",
    "nordic":          "Gentle frontal or slight 3/4 · eye level showing full gable height · 25–30m · SOFT MORNING LIGHT: gentle, diffused, no harsh lines — warm interior glow through large windows is the dominant warmth",
    "luxury":          "Three-quarter front · camera LOW angled slightly upward · 25–30m · LATE AFTERNOON: dramatic long shadows, cantilever casts bold dark shadow on facade, monumental feeling",
    "minimal":         "Straight frontal · perfectly centred · eye level · 25–30m · CRISP MIDDAY LIGHT: bright and sharp — deep shadow in recessed window reveals is the ONLY shadow detail, vast white paper dominates",
    "loft":            "Three-quarter front · eye level · 25–30m · OVERCAST FLAT LIGHT: even illumination shows raw concrete board-form texture clearly, warm rust on steel beams",
    "modern_tropical": "Wide three-quarter front · slightly further back 28–32m · MIDDAY BRIGHT: deep shadow zone under overhang is the HERO SHADOW — vertical louvre stripes cast shadow lines on glass behind",
  };

  // Style-specific color accents
  const styleAccents: Record<string, string> = {
    "contemporary":    "COLOR: (1) warm teak-brown on cantilever soffit underside; (2) warm amber interior glow through glass; (3) very faint grey-green on shrubs. All else = graphite.",
    "nordic":          "COLOR: (1) warm honey-brown horizontal timber boards on upper storey — strongest accent; (2) warm amber glow through windows — prominent hygge warmth; (3) barely-perceptible grey-green ground cover. All else = graphite.",
    "luxury":          "COLOR: (1) warm cream/ivory stone on facade; (2) strong amber glow through double-height glass — most luminous interior of all styles; (3) faint grey-green on formal hedges. All else = graphite.",
    "minimal":         "COLOR: (1) single warm teak pivot door ONLY — one precise accent; (2) very subtle amber glow (barely visible); NO third accent — maximum restraint. All else = graphite and white paper.",
    "loft":            "COLOR: (1) warm rust-brown on exposed steel beams; (2) amber glow through factory windows; (3) sparse faint grey-green ground planting. All else = graphite.",
    "modern_tropical": "COLOR: (1) warm teak-brown on full-height vertical louvre screens — strong vertical bands; (2) amber glow through glass behind louvres; (3) barely-perceptible grey-green on ornamental trees. All else = graphite.",
  };

  // Style-specific foreground
  const styleForeground: Record<string, string> = {
    "contemporary":    "Multi-level stone terrace steps (4 levels) with ornamental shrubs between each level · reflecting pool at base",
    "nordic":          "Three wide flat stone steps · very low ground-cover planting at base — simple, restrained, Nordic",
    "luxury":          "Grand multi-level formal stone terrace (4–5 levels) · sculpted manicured hedges · long formal reflecting pool",
    "minimal":         "Two or three clean flat stone steps ONLY · single small cloud-pruned tree LEFT side only · vast empty ground plane — white paper",
    "loft":            "Flat concrete approach · one or two concrete steps · sparse ornamental grasses in concrete planters",
    "modern_tropical": "Wide multi-level stone terrace steps (3–4 levels) · low compact shrubs between levels · narrow pool at base",
  };

  const camLight   = styleCamera[key]    ?? styleCamera["contemporary"];
  const accents    = styleAccents[key]   ?? styleAccents["contemporary"];
  const foreground = styleForeground[key] ?? styleForeground["contemporary"];

  return `Create a premium architectural pencil sketch illustration for Finnhouses brand.

STYLE: ${label} house
${topicLine}
Architecture: ${arch}

━━━ RENDERING STYLE — NON-NEGOTIABLE ━━━
THIS IS A BLACK-AND-WHITE PENCIL SKETCH ON WHITE PAPER.
NOT a watercolor painting. NOT a colored illustration. NOT a photo-realistic image.

Pencil technique:
• Refined ink linework defining building edges and window frames
• Light-to-medium graphite hatching on walls (parallel diagonal strokes)
• Cross-hatching only in deep shadow zones (roof underside, window reveals)
• All strokes are graphite grey — zero color except the accents listed below

━━━ SKY — ABSOLUTE RULE ━━━
THE SKY IS WHITE PAPER ONLY. NOTHING ELSE.
• ZERO blue in the sky area — ZERO clouds — ZERO sky wash — ZERO gradient
• Upper 15% of frame = pure white or off-white paper — completely empty

━━━ CAMERA AND LIGHT ━━━
${camLight}
• FULL BUILDING visible from foundation to roofline — NOT cropped, NOT zoomed in
• Foreground in lower 25% of frame

━━━ FOREGROUND ━━━
${foreground}
• Ground plane = light graphite pencil hatching — NO green grass color

━━━ ${accents}

━━━ TREES ━━━
• One tall deciduous broadleaf tree LEFT, one RIGHT — summer full-leaf canopy
• Trees in graphite ONLY with barely-perceptible faint grey-green hint
• NO palm trees — NO banana leaves — NO bamboo — NO tropical plants

━━━ SECONDARY WING ━━━
• RIGHT side: lower secondary living wing, single storey — same modern style
• Partially visible, receding into frame right

━━━ ABSOLUTELY FORBIDDEN ━━━
• NO blue sky — NO clouds — NO sky color of any kind
• NO colored walls — NO colored facade — NO colored roof — NO colored ground
• NO palm trees — NO banana leaves — NO bamboo — NO tropical plants
• NO watercolor painting style — pencil sketch ONLY
• NO Thai traditional roof — NO temple roof — NO ornamental curved roof
• NO text — NO numbers — NO logo — NO watermark
• NO close-up — full building must be visible in wide shot

FINAL OUTPUT:
Premium hand-drawn architectural pencil sketch · horizontal format · graphite monochrome · white paper sky · ${label} style with its distinctive camera angle, light, and shadow character clearly expressed.`;
}

// ─── Ideogram v2 (with optional style reference) ─────────────────────────────
async function generateIdeogram(
  prompt: string,
  referenceBase64: string | null,
  apiKey: string
) {
  const imageRequest: Record<string, unknown> = {
    prompt,
    aspect_ratio: "ASPECT_2_3",
    model:        "V_2",
    style_type:   "DESIGN",
  };

  // Attach style reference if provided
  if (referenceBase64) {
    // Ideogram accepts data URL in style_reference_images
    imageRequest.style_reference_images  = [{ url: referenceBase64 }];
    imageRequest.style_reference_weight  = 0.82;
  }

  const res = await fetch("https://api.ideogram.ai/generate", {
    method:  "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body:    JSON.stringify({ image_request: imageRequest }),
  });
  const data = await res.json();
  if (!res.ok || !data.data?.[0]) {
    console.error("[Ideogram] Error:", JSON.stringify(data));
    throw new Error(data.error?.message ?? data.detail ?? "Ideogram generation failed");
  }
  return data.data[0].url as string;
}

// ─── Finnhouses Brand Reference Image ────────────────────────────────────────
// Cached base64 of finnhouses-sketch-6.png (style reference for openai-edit)
let _finnhousesRefCache: string | null = null;

async function loadFinnhousesReference(): Promise<string> {
  if (_finnhousesRefCache) return _finnhousesRefCache;

  // Read directly from filesystem — public/ is available at process.cwd()/public/
  const imgPath = path.join(process.cwd(), "public", "finnhouses-sketch-6.png");
  if (!fs.existsSync(imgPath)) {
    throw new Error(`[Finnhouses ref] file not found at ${imgPath}`);
  }
  const buffer = fs.readFileSync(imgPath);
  const b64    = buffer.toString("base64");
  _finnhousesRefCache = `data:image/png;base64,${b64}`;
  console.log("[Finnhouses ref] loaded from filesystem, size:", b64.length);
  return _finnhousesRefCache;
}

// ─── Finnhouses dynamic prompt builder ────────────────────────────────────────
// Keyword-dense format optimised for gpt-image-1 edit API.
// Reference image anchors the visual style (blueprint board + monochrome);
// prompt drives the architecture variant + topic.

const FINNHOUSES_ARCH: Record<string, string> = {
  contemporary:    "two-storey contemporary luxury residence, dramatic flat cantilever roof extending 3m, floor-to-ceiling glass curtain wall, black aluminum frame details, natural stone and concrete facade",
  minimal:         "two-storey modern minimal residence, ultra-clean flat roof zero overhang, smooth white stucco facade, deep-set recessed windows, single timber pivot door",
  nordic:          "two-storey Nordic Scandinavian residence, steeply pitched gabled roof with deep overhanging timber eaves, honey-brown horizontal timber cladding upper storey, large picture windows",
  luxury:          "grand two-storey luxury modern residence, soaring marble and travertine stone facade, razor-thin cantilevered flat roof, double-height glass curtain wall, prestigious monumental scale",
  loft:            "two-storey industrial loft residence, exposed raw board-formed concrete walls, visible structural steel frame, oversized multi-pane factory-style steel windows, flat roof",
  modern_tropical: "two-storey modern tropical luxury house, large cantilever roof, full-height vertical timber louvre screens on upper facade, open semi-outdoor ground floor on slender concrete columns, generous shade",
};

const FINNHOUSES_MOOD: Record<string, string> = {
  contemporary:    "refined prestige, confident horizontal lines, balanced luxury",
  minimal:         "meditative calm, beauty in emptiness, zen restraint",
  nordic:          "cozy hygge warmth, Scandinavian natural elegance, serene",
  luxury:          "grand and monumental, opulent five-star, prestigious",
  loft:            "raw urban-luxury, industrial authenticity elevated, honest materials",
  modern_tropical: "breezy relaxed luxury, climate-responsive, cool and shaded",
};

const FINNHOUSES_MATERIAL: Record<string, string> = {
  contemporary:    "natural stone and warm teak wood, concrete, dark steel",
  minimal:         "smooth white stucco concrete, timber pivot door accent",
  nordic:          "honey-brown horizontal timber boards, natural stone base plinth",
  luxury:          "marble and travertine stone, bronze metal frames, grand stone approach",
  loft:            "exposed raw concrete, weathered structural steel, industrial glass",
  modern_tropical: "warm teak timber louvres, white concrete columns, natural stone terrace",
};

function buildPromptFinnhouses(topic: string, style: string): string {
  const key      = style.toLowerCase().replace(/[\s-]/g, "_");
  const arch     = FINNHOUSES_ARCH[key]     ?? FINNHOUSES_ARCH["contemporary"];
  const mood     = FINNHOUSES_MOOD[key]     ?? FINNHOUSES_MOOD["contemporary"];
  const material = FINNHOUSES_MATERIAL[key] ?? FINNHOUSES_MATERIAL["contemporary"];
  const topicCtx = topic ? `architectural concept for "${topic}",` : "";

  return `${arch},
architectural sketch rendering style,
${topicCtx}
clean hand-drawn ink linework, precise pencil hatching,
graphite monochrome on white paper,
blueprint elevation drawings visible in background,
architect's presentation board layout,
cool gray monochrome color palette,
subtle warm wood tone accent on roof soffit only,
${material},
open terrace with wide stone steps in foreground,
luxury car partially visible left side,
tall deciduous trees framing both sides,
lower secondary living wing on the right,
architectural concept presentation board aesthetic,
precise perspective drawing, wide-angle eye-level view,
soft ambient daylight, subtle shadows,
realistic proportions, fine sketch detailing,
premium design visualization, high detail, clean line quality,

Style references: architectural sketch render, conceptual architecture illustration, pen and ink architecture drawing, presentation board, cool gray graphite monochrome
Camera: wide landscape format, eye-level street perspective, 25-30m distance, full building visible, horizontal composition
Mood: ${mood}
Quality: high detail, balanced composition, professional architectural presentation board

NO warm sepia tones, NO amber wash, NO color except subtle wood accent,
NO Thai traditional roof, NO palm trees, NO text labels, NO watermark, NO logo`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const {
    topic,
    style,
    concept        = "",          // pre-generated image concept from Claude (2-step approach)
    model          = "openai",    // "openai" | "gemini" | "openai-edit" | "ideogram" | "finnhouses"
    referenceImage = null,        // base64 data URL, optional
  } = await req.json();

  const renderMode = STYLE_TO_RENDER[style] ?? "contemporary";
  const styleBase  = BASE_BY_STYLE[renderMode] ?? BASE_BY_STYLE["contemporary"];

  // Prompt selection:
  // 1. concept provided → short focused prompt (~120 words) — best quality, mirrors n8n
  // 2. no concept, ideogram → Ideogram-specific prompt
  // 3. no concept, gemini → Gemini-specific prompt
  // 4. no concept, openai → full n8n-mirror prompt
  const prompt = concept
    ? buildPromptConcept(concept, style)
    : model === "ideogram"
      ? buildPromptIdeogram(topic, style, styleBase)
      : model === "gemini"
        ? buildPromptGemini(style, topic)
        : buildPromptN8nMirror(topic, style);

  // Detect OpenAI billing / quota errors — triggers Gemini fallback
  const isBillingError = (msg: string) =>
    msg.toLowerCase().includes("billing") ||
    msg.toLowerCase().includes("hard limit") ||
    msg.toLowerCase().includes("quota") ||
    msg.toLowerCase().includes("insufficient_quota") ||
    msg.toLowerCase().includes("rate limit");

  try {
    let url: string;
    let usedModel = model;

    if (model === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return NextResponse.json({ ok: false, error: "GEMINI_API_KEY not configured" }, { status: 500 });
      url = await generateGemini(prompt, apiKey);

    } else if (model === "ideogram") {
      const apiKey = process.env.IDEOGRAM_API_KEY;
      if (!apiKey) return NextResponse.json({ ok: false, error: "IDEOGRAM_API_KEY not configured" }, { status: 500 });
      url = await generateIdeogram(prompt, referenceImage, apiKey);

    } else if (model === "openai-edit" && referenceImage) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY not configured" }, { status: 500 });
      url = await generateOpenAIEdit(prompt, referenceImage, apiKey);

    } else if (model === "finnhouses") {
      // ── Finnhouses brand mode: use reference image + edit API ──────────────
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY not configured" }, { status: 500 });
      const finnPrompt = buildPromptFinnhouses(topic, style);
      const refImage   = await loadFinnhousesReference();
      console.log("[finnhouses] calling openai-edit with reference image");
      url = await generateOpenAIEdit(finnPrompt, refImage, apiKey);
      usedModel = "finnhouses-edit";

    } else {
      // Default: OpenAI text-to-image — auto-fallback to Gemini on billing/quota error
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY not configured" }, { status: 500 });

      try {
        url = await generateOpenAI(prompt, openaiKey);
      } catch (openaiErr: unknown) {
        const openaiMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
        console.log("[Image API] OpenAI failed:", openaiMsg, "— auto-fallback to Gemini");

        // Auto-fallback: try Gemini for ANY OpenAI failure (billing, quota, permissions, etc.)
        // Uses the same n8n-mirror prompt for best sketch quality
        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) throw new Error(`OpenAI failed (${openaiMsg}) และ GEMINI_API_KEY ยังไม่ได้ตั้งค่า`);
        url = await generateGemini(prompt, geminiKey);
        usedModel = "gemini-fallback";
      }
    }

    return NextResponse.json({ ok: true, url, prompt, model: usedModel });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Image API] Error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
