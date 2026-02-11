import { createCanvas } from "canvas";
import crypto from "crypto";

/**
 * Generate a realistic handwritten-style signature image (PNG base64).
 *
 * Goals:
 * - Looks like a real signature (script text + flourish), not just waves.
 * - Deterministic per name (same name → same signature).
 * - Works well when scaled down in pdfmake (render hi-res, then downscale).
 */
export const generateSignatureImage = (name) => {
  try {
    const safeName = String(name || "").trim() || "Signature";

    // Render at a higher resolution for better quality in PDFs (downscaled by pdfmake)
    const width = 640;
    const height = 220;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Set transparent background
    ctx.clearRect(0, 0, width, height);

    // -------- seeded RNG (deterministic per name) --------
    const nameHash = crypto.createHash("md5").update(safeName).digest("hex");
    const seedA = parseInt(nameHash.substring(0, 8), 16) >>> 0;
    const seedB = parseInt(nameHash.substring(8, 16), 16) >>> 0;
    const seedC = parseInt(nameHash.substring(16, 24), 16) >>> 0;

    const mulberry32 = (a) => {
      return () => {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const rng = mulberry32(seedA ^ seedB ^ seedC);
    const rand = (min, max) => min + (max - min) * rng();

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // -------- ink style (pen-like) --------
    const ink = {
      color: "rgba(5, 12, 25, 0.90)", // slightly bluish-black like ballpoint
      shadow: "rgba(0, 0, 0, 0.14)",
    };
    ctx.strokeStyle = ink.color;
    ctx.fillStyle = ink.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = ink.shadow;
    ctx.shadowBlur = 0.8;
    ctx.shadowOffsetX = 0.4;
    ctx.shadowOffsetY = 0.6;

    // Layout
    const marginX = 26;
    const baselineY = Math.round(height * 0.62 + rand(-6, 6));
    const slant = rand(-0.10, -0.04); // slightly leaning forward

    // Build a signature display name (signatures rarely include middle names fully)
    const parts = safeName.split(/\s+/).filter(Boolean);
    const displayName =
      parts.length >= 2 ? `${parts[0]} ${parts[parts.length - 1]}` : safeName;

    // Choose a script font. On Windows this usually resolves nicely; elsewhere it will fall back.
    const baseSize = clamp(120 - displayName.length * 2.8, 66, 110);
    const fontList = [
      "Segoe Script",
      "Brush Script MT",
      "Lucida Handwriting",
      "Comic Sans MS",
      "cursive",
    ]
      .map((f) => `'${f}'`)
      .join(", ");

    // Draw the signature text with small per-letter jitter to mimic handwriting
    ctx.save();
    ctx.translate(marginX, baselineY);
    ctx.transform(1, 0, slant, 1, 0, 0);

    ctx.font = `${Math.round(baseSize)}px ${fontList}`;
    ctx.textBaseline = "alphabetic";

    // Fit to canvas width (avoid overflow)
    const maxTextWidth = width - marginX * 2;
    const measured = ctx.measureText(displayName).width || 1;
    const scaleX = clamp(maxTextWidth / measured, 0.80, 1.05);
    ctx.scale(scaleX, 1);

    let x = 0;
    for (const ch of displayName) {
      const jitterX = rand(-0.7, 0.9);
      const jitterY = rand(-1.4, 1.2);
      const rot = rand(-0.015, 0.015);
      const pressure = rand(0.8, 1.25); // simulates pen pressure

      ctx.save();
      ctx.translate(x + jitterX, jitterY);
      ctx.rotate(rot);
      ctx.lineWidth = 1.6 * pressure;
      ctx.globalAlpha = 0.98;

      // A light stroke + fill tends to look more "inked" than fill alone
      ctx.strokeText(ch, 0, 0);
      ctx.fillText(ch, 0, 0);
      ctx.restore();

      // Advance cursor with slight spacing randomness
      const w = ctx.measureText(ch).width || 10;
      x += w + rand(-0.9, 1.1);
    }
    ctx.restore();

    // Add an underline flourish (common in signatures)
    const underlineY = baselineY + Math.round(baseSize * 0.20) + rand(2, 7);
    const startX = marginX + width * rand(0.20, 0.33);
    const endX = width - marginX - width * rand(0.04, 0.08);
    const midX = (startX + endX) / 2;

    ctx.beginPath();
    ctx.lineWidth = rand(2.0, 2.8);
    ctx.moveTo(startX, underlineY);
    ctx.quadraticCurveTo(
      midX,
      underlineY + rand(-14, -6),
      endX,
      underlineY + rand(-2, 3)
    );
    // Tail flick
    ctx.quadraticCurveTo(
      endX + rand(10, 22),
      underlineY + rand(-18, -6),
      endX + rand(20, 40),
      underlineY + rand(-6, 12)
    );
    ctx.stroke();

    // Small terminal loop near the end (adds realism)
    ctx.beginPath();
    ctx.lineWidth = rand(1.7, 2.3);
    const loopCx = endX + rand(6, 16);
    const loopCy = underlineY + rand(-10, -2);
    const loopR = rand(6, 10);
    ctx.ellipse(loopCx, loopCy, loopR * 1.2, loopR, rand(-0.6, 0.6), 0, Math.PI * 2);
    ctx.stroke();

    // Convert to base64 PNG
    const buffer = canvas.toBuffer("image/png");
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error generating signature image:", error);
    return null;
  }
};
