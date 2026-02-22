/**
 * Generates PWA icons as PNGs using SVG + sharp (or falls back to canvas-free approach).
 * Writes pwa-192x192.png and pwa-512x512.png to /public.
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SVG icon — dark bg, indigo plate with fork and knife
function buildSvg(size) {
    const s = size;
    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.42;
    const inner = s * 0.32;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#13192b"/>
      <stop offset="100%" stop-color="#0a0e17"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#818cf8" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="plateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${s}" height="${s}" rx="${s * 0.22}" fill="url(#bg)"/>

  <!-- Glow -->
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 1.1}" ry="${r * 1.1}" fill="url(#glow)"/>

  <!-- Outer progress ring -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
    stroke="rgba(99,102,241,0.2)" stroke-width="${s * 0.03}"/>
  <!-- Arc ~270deg -->
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
    stroke="url(#plateGrad)" stroke-width="${s * 0.035}"
    stroke-linecap="round"
    stroke-dasharray="${2 * Math.PI * r * 0.78} ${2 * Math.PI * r}"
    transform="rotate(-225 ${cx} ${cy})"/>

  <!-- Plate -->
  <circle cx="${cx}" cy="${cy}" r="${inner}" fill="rgba(99,102,241,0.15)"
    stroke="url(#plateGrad)" stroke-width="${s * 0.025}"/>

  <!-- Fork (left) -->
  <g transform="translate(${cx - s * 0.09}, ${cy - s * 0.18})">
    <!-- Handle -->
    <rect x="${s * 0.005}" y="${s * 0.12}" width="${s * 0.025}" height="${s * 0.2}"
      rx="${s * 0.012}" fill="url(#plateGrad)"/>
    <!-- Tines -->
    <rect x="${-s * 0.01}" y="0" width="${s * 0.01}" height="${s * 0.1}" rx="${s * 0.005}" fill="url(#plateGrad)"/>
    <rect x="${s * 0.007}" y="0" width="${s * 0.01}" height="${s * 0.1}" rx="${s * 0.005}" fill="url(#plateGrad)"/>
    <rect x="${s * 0.025}" y="0" width="${s * 0.01}" height="${s * 0.1}" rx="${s * 0.005}" fill="url(#plateGrad)"/>
  </g>

  <!-- Knife (right) -->
  <g transform="translate(${cx + s * 0.06}, ${cy - s * 0.18})">
    <rect x="0" y="0" width="${s * 0.025}" height="${s * 0.32}"
      rx="${s * 0.012}" fill="url(#plateGrad)"/>
    <!-- Blade curve hint -->
    <ellipse cx="${s * 0.025}" cy="${s * 0.06}" rx="${s * 0.018}" ry="${s * 0.06}"
      fill="rgba(129,140,248,0.5)"/>
  </g>
</svg>`;
}

// Write SVGs first (these work without any additional deps)
const sizes = [192, 512];
for (const size of sizes) {
    const svg = buildSvg(size);
    writeFileSync(join(__dirname, `public/pwa-icon-${size}.svg`), svg, 'utf8');
    console.log(`✓ Wrote public/pwa-icon-${size}.svg`);
}

console.log('\nSVG icons generated. Now converting to PNG with sharp...');

// Try sharp for PNG conversion
try {
    const sharp = (await import('sharp')).default;
    for (const size of sizes) {
        const svg = buildSvg(size);
        await sharp(Buffer.from(svg))
            .png()
            .toFile(join(__dirname, `public/pwa-${size}x${size}.png`));
        console.log(`✓ Wrote public/pwa-${size}x${size}.png`);
    }
} catch (e) {
    console.log('sharp not available, trying @resvg/resvg-js...');
    try {
        const { Resvg } = await import('@resvg/resvg-js');
        for (const size of sizes) {
            const svg = buildSvg(size);
            const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
            const png = resvg.render().asPng();
            writeFileSync(join(__dirname, `public/pwa-${size}x${size}.png`), png);
            console.log(`✓ Wrote public/pwa-${size}x${size}.png`);
        }
    } catch (e2) {
        console.log('No PNG converter found. Installing sharp...');
        console.log('Run: npm install --save-dev sharp');
        console.log('Then: node generate-icons.mjs');
    }
}
