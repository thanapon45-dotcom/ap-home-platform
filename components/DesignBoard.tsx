"use client";
import { useRef, useCallback } from "react";

// ─── Annotation callouts per style ──────────────────────────────────────────
// dotX / dotY are ratios (0–1) of the IMAGE zone
const ANNOTATIONS: Record<
  string,
  { label: string; desc: string; dotX: number; dotY: number; side: "left" | "right" }[]
> = {
  "Modern Minimal": [
    { label: "flat roof edge",          desc: "crisp minimal overhang",      dotX: 0.55, dotY: 0.10, side: "right" },
    { label: "floor-to-ceiling glass",  desc: "maximizes natural light",     dotX: 0.75, dotY: 0.30, side: "right" },
    { label: "white stucco cladding",   desc: "smooth rendered finish",      dotX: 0.80, dotY: 0.52, side: "right" },
    { label: "recessed window frame",   desc: "clean geometric cut",         dotX: 0.22, dotY: 0.30, side: "left" },
    { label: "cantilevered entrance",   desc: "elevated concrete slab",      dotX: 0.18, dotY: 0.55, side: "left" },
    { label: "minimal landscaping",     desc: "trimmed hedge + lawn",        dotX: 0.38, dotY: 0.78, side: "left" },
  ],
  "Tropical Modern": [
    { label: "deep overhanging roof",   desc: "shades from tropical sun",    dotX: 0.55, dotY: 0.08, side: "right" },
    { label: "timber louvre screen",    desc: "filtered light + privacy",    dotX: 0.74, dotY: 0.26, side: "right" },
    { label: "glass sliding door",      desc: "indoor-outdoor connection",   dotX: 0.78, dotY: 0.50, side: "right" },
    { label: "vertical timber cladding",desc: "warm natural material",       dotX: 0.20, dotY: 0.28, side: "left" },
    { label: "open shaded terrace",     desc: "semi-outdoor living zone",    dotX: 0.16, dotY: 0.52, side: "left" },
    { label: "tropical landscaping",    desc: "lush greenery integration",   dotX: 0.36, dotY: 0.78, side: "left" },
  ],
  "Contemporary": [
    { label: "cantilevered roof plane", desc: "bold horizontal gesture",     dotX: 0.55, dotY: 0.09, side: "right" },
    { label: "stone + glass facade",    desc: "luxury material palette",     dotX: 0.76, dotY: 0.27, side: "right" },
    { label: "frameless glass panel",   desc: "seamless transparency",       dotX: 0.80, dotY: 0.50, side: "right" },
    { label: "stone wall cladding",     desc: "textured natural stone",      dotX: 0.20, dotY: 0.30, side: "left" },
    { label: "open terrace balcony",    desc: "elevated outdoor space",      dotX: 0.18, dotY: 0.52, side: "left" },
    { label: "formal driveway",         desc: "paved stone approach",        dotX: 0.40, dotY: 0.78, side: "left" },
  ],
  "Nordic": [
    { label: "pitched roof profile",    desc: "Scandinavian form language",  dotX: 0.52, dotY: 0.08, side: "right" },
    { label: "warm timber cladding",    desc: "natural wood facade",         dotX: 0.74, dotY: 0.27, side: "right" },
    { label: "large window opening",    desc: "maximizes winter daylight",   dotX: 0.78, dotY: 0.49, side: "right" },
    { label: "deep timber eaves",       desc: "generous roof overhang",      dotX: 0.24, dotY: 0.27, side: "left" },
    { label: "covered entry porch",     desc: "sheltered transition zone",   dotX: 0.18, dotY: 0.54, side: "left" },
    { label: "natural stone base",      desc: "grounded foundation detail",  dotX: 0.38, dotY: 0.78, side: "left" },
  ],
  "Luxury": [
    { label: "grand cantilevered roof", desc: "dramatic architectural gesture", dotX: 0.55, dotY: 0.08, side: "right" },
    { label: "marble stone cladding",   desc: "premium natural stone",          dotX: 0.76, dotY: 0.26, side: "right" },
    { label: "glass curtain wall",      desc: "full-height transparency",        dotX: 0.80, dotY: 0.50, side: "right" },
    { label: "steel + glass canopy",    desc: "refined entrance element",        dotX: 0.20, dotY: 0.28, side: "left" },
    { label: "pool terrace",            desc: "outdoor luxury amenity",          dotX: 0.18, dotY: 0.52, side: "left" },
    { label: "manicured garden",        desc: "formal landscape design",         dotX: 0.40, dotY: 0.78, side: "left" },
  ],
  "Loft": [
    { label: "flat industrial roof",    desc: "minimal roof profile",        dotX: 0.52, dotY: 0.08, side: "right" },
    { label: "exposed concrete wall",   desc: "raw structural finish",       dotX: 0.76, dotY: 0.26, side: "right" },
    { label: "factory-style window",    desc: "large steel-frame glazing",   dotX: 0.78, dotY: 0.49, side: "right" },
    { label: "weathered steel beam",    desc: "exposed structural element",  dotX: 0.20, dotY: 0.28, side: "left" },
    { label: "double-height void",      desc: "loft space + mezzanine",      dotX: 0.18, dotY: 0.52, side: "left" },
    { label: "industrial paving",       desc: "concrete + aggregate floor",  dotX: 0.38, dotY: 0.78, side: "left" },
  ],
};

const DEFAULT_ANN = ANNOTATIONS["Contemporary"];

// ─── Technical SVG Drawing components ───────────────────────────────────────

function StructuralFrame() {
  return (
    <svg viewBox="0 0 110 110" width="100%" height="100%">
      <g stroke="#2a2a2a" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* Bottom face */}
        <polygon points="55,82 18,63 55,44 92,63" />
        {/* Top face */}
        <polygon points="55,38 18,19 55,0 92,19" />
        {/* Vertical edges */}
        <line x1="55" y1="82" x2="55" y2="38" />
        <line x1="18" y1="63" x2="18" y2="19" />
        <line x1="92" y1="63" x2="92" y2="19" />
        {/* Floor slab line */}
        <line x1="18" y1="41" x2="92" y2="41" strokeDasharray="3,2" strokeWidth="0.8" />
        <line x1="55" y1="44" x2="55" y2="0"   strokeDasharray="3,2" strokeWidth="0.8" />
        {/* Corner dots */}
        {([[55,82],[18,63],[92,63],[55,38],[18,19],[92,19],[55,0]] as [number,number][]).map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="2" fill="#2a2a2a" />
        ))}
      </g>
      <text x="55" y="99" textAnchor="middle" fontSize="8" fontFamily="Arial" fill="#3a3a3a">structure diagram</text>
    </svg>
  );
}

function SectionSketch() {
  return (
    <svg viewBox="0 0 110 110" width="100%" height="100%">
      <g stroke="#2a2a2a" fill="none" strokeLinecap="round">
        {/* Ground line */}
        <line x1="5"  y1="88" x2="105" y2="88" strokeWidth="1.8" />
        {/* Outer walls */}
        <line x1="15" y1="88" x2="15"  y2="8"  strokeWidth="2.2" />
        <line x1="95" y1="88" x2="95"  y2="8"  strokeWidth="2.2" />
        {/* Roof */}
        <line x1="12" y1="8"  x2="98"  y2="8"  strokeWidth="2"   />
        {/* Floor slab (mid level) */}
        <line x1="15" y1="50" x2="95"  y2="50" strokeWidth="1.8" />
        {/* Slab hatch */}
        {[0,5,10,15,20,25,30,35,40].map(x => (
          <line key={x} x1={15+x*2} y1="50" x2={15+x*2+3} y2="44" strokeWidth="0.5" stroke="#666" />
        ))}
        {/* Staircase */}
        <polyline points="58,50 58,60 48,60 48,68 38,68 38,76 28,76 28,88"
                  strokeWidth="1" strokeDasharray="2,1.5" />
        {/* Interior partition */}
        <line x1="62" y1="88" x2="62" y2="50" strokeWidth="0.9" strokeDasharray="3,2" />
        {/* Ground floor open */}
        <line x1="15" y1="72" x2="32" y2="72" strokeWidth="1.5" stroke="white" />
        {/* Human silhouette */}
        <circle cx="78" cy="66" r="3"   strokeWidth="1" />
        <line   x1="78" y1="69" x2="78" y2="80" strokeWidth="1" />
        <line   x1="78" y1="72" x2="73" y2="76" strokeWidth="0.9" />
        <line   x1="78" y1="72" x2="83" y2="76" strokeWidth="0.9" />
        <line   x1="78" y1="80" x2="74" y2="87" strokeWidth="0.9" />
        <line   x1="78" y1="80" x2="82" y2="87" strokeWidth="0.9" />
        {/* Section arrow */}
        <line x1="5" y1="48" x2="5" y2="90" strokeWidth="1" stroke="#555" />
        <line x1="2" y1="51" x2="5" y2="47" strokeWidth="0.8" stroke="#555" />
        <line x1="8" y1="51" x2="5" y2="47" strokeWidth="0.8" stroke="#555" />
      </g>
      <text x="55" y="100" textAnchor="middle" fontSize="8" fontFamily="Arial" fill="#3a3a3a">section sketch</text>
    </svg>
  );
}

function FacadeDetail() {
  return (
    <svg viewBox="0 0 110 110" width="100%" height="100%">
      <g stroke="#2a2a2a" fill="none" strokeLinecap="round">
        {/* Outer finish layer */}
        <rect x="14" y="12" width="10" height="72" strokeWidth="1" fill="#ddd8ce" />
        {/* Label tick */}
        <line x1="4" y1="20" x2="14" y2="20" strokeWidth="0.7" stroke="#555" />
        <text x="2" y="19" fontSize="5.5" fontFamily="Arial" fill="#444">outer</text>

        {/* Structural concrete — hatched */}
        <rect x="24" y="12" width="26" height="72" strokeWidth="1.6" />
        {Array.from({length: 16}).map((_,i) => (
          <line key={i}
            x1={24}      y1={12 + i*4.5}
            x2={24+26}   y2={12 + i*4.5 + 5}
            strokeWidth="0.4" stroke="#888"
          />
        ))}

        {/* Air gap */}
        <rect x="50" y="12" width="7" height="72" strokeWidth="0.8" strokeDasharray="3,2" />

        {/* Interior finish */}
        <rect x="57" y="12" width="10" height="72" strokeWidth="1" fill="#ece7df" />
        {/* Label tick */}
        <line x1="67" y1="20" x2="77" y2="20" strokeWidth="0.7" stroke="#555" />
        <text x="78" y="19" fontSize="5.5" fontFamily="Arial" fill="#444">inner</text>

        {/* Window slot cut-out */}
        <rect x="14" y="34" width="53" height="22" strokeWidth="1.2"
              fill="rgba(160,210,230,0.35)" stroke="#3a7ab5" />
        <line x1="37" y1="34" x2="37" y2="56" strokeWidth="0.8" stroke="#3a7ab5" />

        {/* Top dimension tick */}
        <line x1="14" y1="5" x2="67" y2="5" strokeWidth="0.8" stroke="#555" />
        <line x1="14" y1="3" x2="14" y2="7" strokeWidth="0.8" stroke="#555" />
        <line x1="67" y1="3" x2="67" y2="7" strokeWidth="0.8" stroke="#555" />
        <text x="40" y="4" textAnchor="middle" fontSize="5" fontFamily="Arial" fill="#555">wall assembly</text>
      </g>
      <text x="55" y="100" textAnchor="middle" fontSize="8" fontFamily="Arial" fill="#3a3a3a">facade detail</text>
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  imageUrl: string;
  style: string;
  topic?: string;
}

const BOARD_W   = 600;
const IMAGE_H   = 580;
const TECH_H    = 200;
const GRID_SIZE = 18;

export default function DesignBoard({ imageUrl, style, topic }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const anns = ANNOTATIONS[style] ?? DEFAULT_ANN;

  // ── Download via html2canvas ──────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!boardRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(boardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#f2ede5",
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `design-board-${style.toLowerCase().replace(/\s+/g, "-")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (e) {
      console.error("Export failed:", e);
    }
  }, [style]);

  return (
    <div>
      {/* ── Board ── */}
      <div
        ref={boardRef}
        style={{
          width: BOARD_W,
          background: "#f2ede5",
          position: "relative",
          fontFamily: "Arial, sans-serif",
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
        }}
      >
        {/* ── Upper: image zone ── */}
        <div style={{ position: "relative", height: IMAGE_H, overflow: "hidden" }}>

          {/* Blueprint grid */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 2 }}
          >
            <defs>
              <pattern id="bgrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                  fill="none" stroke="#6a9cc0" strokeWidth="0.35" opacity="0.55"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#bgrid)" />
          </svg>

          {/* Building illustration */}
          <img
            src={imageUrl}
            alt="Architecture"
            style={{
              width: "100%", height: IMAGE_H,
              objectFit: "cover", display: "block",
              position: "relative", zIndex: 1,
            }}
          />

          {/* Annotation callouts */}
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 3 }}
          >
            {anns.map((ann, i) => {
              const dotX = ann.dotX * BOARD_W;
              const dotY = ann.dotY * IMAGE_H;
              const endX  = ann.side === "left" ? 6 : BOARD_W - 6;
              const textX = ann.side === "left" ? 8 : BOARD_W - 8;
              const anchor = ann.side === "left" ? "start" : "end";
              return (
                <g key={i}>
                  {/* Dot on building */}
                  <circle cx={dotX} cy={dotY} r={3} fill="#111" />
                  {/* Leader line */}
                  <line
                    x1={dotX} y1={dotY} x2={endX} y2={dotY}
                    stroke="#111" strokeWidth={0.75}
                  />
                  {/* Label */}
                  <text
                    x={textX} y={dotY - 6}
                    fontSize={9} fontFamily="Arial" fontWeight="700"
                    fill="#111" textAnchor={anchor}
                  >
                    {ann.label}
                  </text>
                  {/* Description */}
                  <text
                    x={textX} y={dotY + 6}
                    fontSize={7.5} fontFamily="Arial"
                    fill="#444" textAnchor={anchor}
                  >
                    {ann.desc}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Lower: technical drawings ── */}
        <div
          style={{
            height: TECH_H,
            background: "#ebe5dc",
            borderTop: "1.5px solid #8a9aaa",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            position: "relative",
          }}
        >
          {/* Dense grid for lower panel */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <pattern id="tgrid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                <path
                  d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                  fill="none" stroke="#6a9cc0" strokeWidth="0.5" opacity="0.75"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tgrid)" />
            <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="#8a9aaa" strokeWidth="1" />
            <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="#8a9aaa" strokeWidth="1" />
          </svg>

          {/* Drawing 1 */}
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
            <StructuralFrame />
          </div>
          {/* Drawing 2 */}
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
            <SectionSketch />
          </div>
          {/* Drawing 3 */}
          <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
            <FacadeDetail />
          </div>
        </div>
      </div>

      {/* ── Download button ── */}
      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <button
          onClick={handleDownload}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ⬇️ Download Design Board
        </button>
      </div>
    </div>
  );
}
