import { useRef, useEffect } from "react";
import gsap from "gsap";

const corpLogo = "/logo-almasa-corp.png";

interface Props { onComplete: () => void; }

export function BootTransition({ onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const container = ref.current!;
    const logo = container.querySelector(".boot-logo") as HTMLImageElement;
    const huellaBox = container.querySelector(".boot-huella") as HTMLDivElement;
    const svgEl = huellaBox.querySelector("svg")!;
    const dotEl = svgEl.querySelector(".dot") as SVGCircleElement;
    const arcEls = [
      svgEl.querySelector(".arc3") as SVGPathElement,
      svgEl.querySelector(".arc2") as SVGPathElement,
      svgEl.querySelector(".arc1") as SVGPathElement,
    ];
    const titleEl = huellaBox.querySelector(".boot-title") as HTMLDivElement;
    const subEl = huellaBox.querySelector(".boot-sub") as HTMLDivElement;

    // Wait for logo image to load
    const img = new Image();
    img.src = corpLogo;
    img.onload = () => {
      const logoW = 320;
      const logoH = Math.round(320 * (img.naturalHeight / img.naturalWidth));
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const logoLeft = cx - logoW / 2;
      const logoTop = cy - logoH / 2;

      // ═══ CREATE FRAGMENTS ═══
      const frags: HTMLDivElement[] = [];
      const sizes = [8, 10, 12, 14];
      for (let y = 0; y < logoH; ) {
        const h = sizes[Math.floor(Math.random() * 4)];
        const rh = Math.min(h, logoH - y);
        for (let x = 0; x < logoW; ) {
          const w = sizes[Math.floor(Math.random() * 4)];
          const rw = Math.min(w, logoW - x);
          const f = document.createElement("div");
          f.style.cssText = `position:fixed;left:${logoLeft + x}px;top:${logoTop + y}px;width:${rw}px;height:${rh}px;background:url('${corpLogo}') -${x}px -${y}px / ${logoW}px ${logoH}px;opacity:0;pointer-events:none;will-change:transform;`;
          container.appendChild(f);
          frags.push(f);
          x += rw;
        }
        y += rh;
      }

      // ═══ ARC TARGET POINTS ═══
      gsap.set(huellaBox, { opacity: 1 });
      gsap.set(svgEl, { opacity: 0 });
      gsap.set(dotEl, { attr: { r: 0 } });

      const svgRect = svgEl.getBoundingClientRect();
      const sx = svgRect.width / 200;
      const sy = svgRect.height / 180;

      const getPoints = (path: SVGPathElement, n: number) => {
        const len = path.getTotalLength();
        return Array.from({ length: n }, (_, i) => {
          const pt = path.getPointAtLength((i / Math.max(n - 1, 1)) * len);
          return {
            x: svgRect.left + pt.x * sx - cx,
            y: svgRect.top + pt.y * sy - cy,
          };
        });
      };

      const n1 = Math.floor(frags.length * 0.2);
      const n2 = Math.floor(frags.length * 0.3);
      const n3 = Math.floor(frags.length * 0.4);
      const pts1 = getPoints(arcEls[0], n1);
      const pts2 = getPoints(arcEls[1], n2);
      const pts3 = getPoints(arcEls[2], n3);
      // Dot points for leftover fragments
      const nDot = frags.length - n1 - n2 - n3;
      const ptsDot = Array.from({ length: nDot }, (_, i) => {
        const a = (i / Math.max(nDot, 1)) * Math.PI * 2;
        return {
          x: svgRect.left + 100 * sx - cx + Math.cos(a) * 3,
          y: svgRect.top + 125 * sy - cy + Math.sin(a) * 3,
        };
      });

      const allPts = [...pts1, ...pts2, ...pts3, ...ptsDot];
      const g1 = n1;
      const g2 = n1 + n2;
      const g3 = n1 + n2 + n3;

      // ═══ PRE-COMPUTE EXPLOSION TARGETS ═══
      const explodeTargets = frags.map(f => {
        const r = f.getBoundingClientRect();
        const angle = Math.atan2(r.top + r.height / 2 - cy, r.left + r.width / 2 - cx)
          + (Math.random() - 0.5) * 0.6;
        const dist = 100 + Math.random() * 200;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rotation: (Math.random() - 0.5) * 360,
        };
      });

      // ═══ PRE-COMPUTE HUELLA TARGETS ═══
      const huellaTargets = frags.map((f, i) => {
        const pt = allPts[i % allPts.length];
        const origLeft = parseFloat(f.style.left);
        const origTop = parseFloat(f.style.top);
        return {
          x: cx + pt.x - origLeft,
          y: cy + pt.y - origTop,
        };
      });

      // ═══ TIMELINE ═══
      const tl = gsap.timeline();

      // ── PASO 1: Logo aparece difuminado (3s) ──
      tl.fromTo(logo,
        { opacity: 0, filter: "blur(30px)" },
        { opacity: 1, filter: "blur(0px)", duration: 3, ease: "power2.inOut" },
      );

      // Pausa — logo visible y quieto
      tl.to({}, { duration: 1.5 });

      // ── PASO 2: Explosión INSTANTÁNEA ──
      const explodeLabel = "explode";
      tl.addLabel(explodeLabel);
      tl.set(logo, { display: "none" }, explodeLabel);
      tl.set(frags, { opacity: 1 }, explodeLabel);

      // ALL fragments explode at the SAME time — no stagger
      frags.forEach((f, i) => {
        tl.to(f, {
          x: explodeTargets[i].x,
          y: explodeTargets[i].y,
          rotation: explodeTargets[i].rotation,
          duration: 0.4,
          ease: "power3.out",
        }, explodeLabel);
      });

      // Float suspended
      tl.to({}, { duration: 0.5 });

      // ── PASO 3: Fragmentos van DIRECTO a formar La Huella ──
      const formLabel = "form";
      tl.addLabel(formLabel);

      frags.forEach((f, i) => {
        // Stagger by wave — overlapping for fluid feel
        let delay = 0;
        if (i < g1) delay = (i / g1) * 0.2;
        else if (i < g2) delay = 0.2 + ((i - g1) / (g2 - g1)) * 0.3;
        else if (i < g3) delay = 0.4 + ((i - g2) / (g3 - g2)) * 0.4;
        else delay = 0.9 + ((i - g3) / Math.max(frags.length - g3, 1)) * 0.2;

        tl.to(f, {
          x: huellaTargets[i].x,
          y: huellaTargets[i].y,
          rotation: 0,
          scale: 0.4,
          opacity: 0.8,
          duration: 2.5,
          ease: "power1.inOut",
        }, formLabel + "+=" + delay.toFixed(4));
      });

      // Crossfade: fragments → clean SVG
      tl.to(frags, { opacity: 0, duration: 0.3, ease: "power1.in" });
      tl.to(svgEl, { opacity: 1, duration: 0.3, ease: "power1.out" }, "<");

      // Dot bounce
      tl.fromTo(dotEl,
        { attr: { r: 0 } },
        { attr: { r: 6 }, duration: 0.3, ease: "back.out(3)" },
      );

      // Title
      tl.fromTo(titleEl,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
        "+=0.2",
      );

      // Subtitle
      tl.fromTo(subEl,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
        "-=0.2",
      );

      // Hold then fade out
      tl.to({}, { duration: 1 });
      tl.to(container, {
        opacity: 0, duration: 0.6, ease: "power2.in",
        onComplete,
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} className="fixed inset-0 bg-white" style={{ zIndex: 50 }}>
      <img
        className="boot-logo"
        src={corpLogo}
        alt=""
        style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)", width: 320, height: "auto",
          opacity: 0, filter: "blur(30px)",
        }}
      />
      <div
        className="boot-huella"
        style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          display: "flex", flexDirection: "column", alignItems: "center",
          opacity: 0,
        }}
      >
        <svg viewBox="0 0 200 180" width="120" height="108" fill="none">
          <g stroke="#c41e3a" strokeWidth="9" strokeLinecap="round" fill="none">
            <path className="arc1" d="M 20 160 C 35 5, 165 5, 180 160" />
            <path className="arc2" d="M 50 160 C 62 38, 138 38, 150 160" />
            <path className="arc3" d="M 80 160 C 88 75, 112 75, 120 160" />
          </g>
          <circle className="dot" cx="100" cy="125" r="6" fill="#c41e3a" />
        </svg>
        <div
          className="boot-title"
          style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 48,
            fontWeight: 600, color: "#c41e3a", letterSpacing: "0.12em",
            marginTop: 16, opacity: 0,
          }}
        >
          ALMASA
        </div>
        <div
          className="boot-sub"
          style={{
            fontFamily: "'Inter Tight', sans-serif", fontSize: 11,
            fontWeight: 500, letterSpacing: "0.18em", color: "#a8a8ae",
            textTransform: "uppercase" as const, marginTop: 8, opacity: 0,
          }}
        >
          Sistema &middot; 1904
        </div>
      </div>
    </div>
  );
}
