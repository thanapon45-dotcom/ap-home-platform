import { NextRequest, NextResponse } from "next/server";

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

RIGHT VOLUME — GARAGE WING, SINGLE STOREY:
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

RIGHT VOLUME — GARAGE WING, SINGLE STOREY:
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

RIGHT VOLUME — GARAGE WING, SINGLE STOREY:
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

RIGHT VOLUME — GARAGE WING, SINGLE STOREY:
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

RIGHT VOLUME — GARAGE WING, SINGLE STOREY:
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

RIGHT VOLUME — GARAGE WING, SINGLE STOREY:
Flat roof, white walls. Roller door. Partially cropped at frame right.`,
    accent1Label: "Vertical timber louvre screens on upper facade",
    accent1Desc: "warm teak brown — strong consistent tone on louvre panels",
    accent3Label: "Ground-cover shrubs at base",
    accent3Desc: "faint grey-green — lightly applied",
  },
};

// ─── Prompt builders ─────────────────────────────────────────────────────────
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
    body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1024x1024", quality: "high" }),
  });
  const data1 = await res1.json();
  if (res1.ok && data1.data?.[0]) {
    const item = data1.data[0];
    return item.url ?? `data:image/png;base64,${item.b64_json}`;
  }

  // Fallback: dall-e-3 (stable, no org verification needed)
  console.log("[Image API] gpt-image-1 failed, falling back to dall-e-3:", data1.error?.message);
  const res2 = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1792", quality: "hd" }),
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
  form.append("size",    "1024x1536");
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
  // Normalize: accept both "nordic" and "Nordic" etc.
  const key     = style.toLowerCase().replace(/[\s-]/g, "_");
  const essence = GEMINI_STYLE_ESSENCE[key] ?? GEMINI_STYLE_ESSENCE["contemporary"];
  const label   = GEMINI_STYLE_LABEL[key]   ?? style;

  // Contextual hint from FB post keyword
  const topicLine = topic
    ? `Content context: This image supports a Facebook post about "${topic}".`
    : "";

  return `Create a premium architectural sketch featured image for the Finnhouses brand.

Selected style: ${label}
${topicLine}

Architectural description: ${essence}

STRICT REQUIREMENTS:
- premium hand-rendered architectural sketch
- refined ink linework with soft marker or watercolor accents
- must feel like an architect's concept presentation for a high-end developer
- modern architecture only — front or three-quarter front perspective, eye-level camera
- balanced composition with elegant landscaping
- clean white or off-white presentation paper background
- subtle drafting guide lines are acceptable

NEGATIVE CONSTRAINTS (CRITICAL):
- NO Thai style architecture, NO Thai roof, NO temple roof, NO curved ornamental roof
- NO cartoon, NO fantasy house, NO exaggerated ornaments
- NO photo-real people focus
- ZERO visible text, letters, numbers, logos, watermarks

FINAL RULE:
This image must look like a premium architectural sketch for Finnhouses — the ${label} style must be clearly recognisable. Suitable as a featured image for a luxury real-estate post.`;
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

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const {
    topic,
    style,
    model          = "gemini",   // "gemini" | "openai" | "openai-edit" | "ideogram"
    referenceImage = null,        // base64 data URL, optional
  } = await req.json();

  const renderMode = STYLE_TO_RENDER[style] ?? "contemporary";
  const styleBase  = BASE_BY_STYLE[renderMode] ?? BASE_BY_STYLE["contemporary"];
  const prompt     = model === "ideogram"
    ? buildPromptIdeogram(topic, style, styleBase)
    : model === "gemini"
      ? buildPromptGemini(style, topic)
      : buildPromptOpenAI(topic, style, styleBase);

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

    } else {
      // Default: OpenAI text-to-image — auto-fallback to Gemini on billing/quota error
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) return NextResponse.json({ ok: false, error: "OPENAI_API_KEY not configured" }, { status: 500 });

      try {
        url = await generateOpenAI(prompt, openaiKey);
      } catch (openaiErr: unknown) {
        const openaiMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);

        // Auto-fallback: try Gemini when OpenAI billing/quota is exhausted
        if (isBillingError(openaiMsg)) {
          const geminiKey = process.env.GEMINI_API_KEY;
          if (!geminiKey) throw new Error(`OpenAI billing limit reached และ GEMINI_API_KEY ยังไม่ได้ตั้งค่า`);
          console.log("[Image API] OpenAI billing limit — auto-fallback to Gemini");
          url = await generateGemini(prompt, geminiKey);
          usedModel = "gemini-fallback";
        } else {
          throw openaiErr;
        }
      }
    }

    return NextResponse.json({ ok: true, url, prompt, model: usedModel });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Image API] Error:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
