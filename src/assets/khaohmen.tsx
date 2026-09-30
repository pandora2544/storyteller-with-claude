// asset ของเรื่อง "ปีนเขาเหมนที ชีวิตเปลี่ยน" (projects/khaohmen) — วาดเองทั้งหมด ใช้สีจาก palette (rule 10)
// ไม่ใช้ภาพถ่ายจริง · ไม่มีโลโก้อุทยาน/บริษัททัวร์ · ไม่วาดรูปเทพ · ทะเลหมอกเป็นภาพสัญลักษณ์ (brief/facts)
import React from 'react';
import {AssetDef, rnd, shadeFill} from './core';
import {sk, Pal} from './palette';
import {FONT} from '../theme/tokens';
import {khonKid} from './nakhon';

const vec = (p: Pal) => p.style === 'vector';
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const ink = (p: Pal) => (vec(p) ? '#10213A' : p.ink);
const forest = (p: Pal) =>
  vec(p)
    ? {far: '#123A3A', mid: '#17504A', near: '#1E6B55', moss: '#3FD6A0', soil: '#6B4B35', soilDark: '#4A3526', root: '#3B2A22'}
    : {far: '#7C8A63', mid: '#66764F', near: '#56673F', moss: '#8FA66B', soil: p.coffeeLight, soilDark: p.coffee, root: p.deep};

const Blob: React.FC<{x: number; y: number; r: number; fill: string; seed: number; n?: number; op?: number}> = ({x, y, r, fill, seed, n = 5, op = 1}) => (
  <g opacity={op}>
    {Array.from({length: n}).map((_, i) => (
      <circle key={i} cx={x + (rnd(seed + i) - 0.5) * r * 1.8} cy={y + (rnd(seed + i * 3) - 0.5) * r * 0.8} r={r * (0.55 + rnd(seed + i * 5) * 0.45)} fill={fill} />
    ))}
  </g>
);

/** แถบเมฆนุ่ม ๆ */
const CloudBand: React.FC<{y: number; w: number; fill: string; seed: number; drift?: number; op?: number; r?: number}> = ({y, w, fill, seed, drift = 0, op = 0.9, r = 90}) => (
  <g transform={`translate(${drift},0)`} opacity={op}>
    {Array.from({length: Math.ceil(w / (r * 0.9))}).map((_, i) => (
      <ellipse key={i} cx={i * r * 0.9 + rnd(seed + i) * 30} cy={y + (rnd(seed + i * 7) - 0.5) * 30} rx={r * (0.9 + rnd(seed + i * 3) * 0.5)} ry={r * 0.45} fill={fill} />
    ))}
  </g>
);

// ---------- ทางชันเป็นขั้นบันไดราก พุ่งหายเข้าเมฆ (เต็มเฟรมแนวตั้ง) · metaphor "บันไดไม่มีชานพัก" ----------
export const kmStairs: AssetDef = {
  vb: [1080, 1920],
  draw: ({p, t}) => {
    const F = forest(p);
    const steps = 16;
    const pts = Array.from({length: steps}, (_, i) => {
      const u = i / (steps - 1);
      return {x: 540 + Math.sin(u * 5.2) * (260 * (1 - u)), y: 1920 - u * 1520, w: 520 * (1 - u * 0.82)};
    });
    return (
      <g>
        <rect width="1080" height="1920" fill={vec(p) ? '#0E1A2B' : p.sky1} />
        <rect width="1080" height="700" fill={vec(p) ? '#2B4470' : p.sky2} opacity="0.8" />
        {/* ป่าสองข้าง */}
        <Blob x={80} y={1500} r={260} fill={F.far} seed={2} n={7} />
        <Blob x={1000} y={1450} r={260} fill={F.far} seed={5} n={7} />
        <Blob x={120} y={900} r={200} fill={F.mid} seed={8} n={6} />
        <Blob x={960} y={880} r={200} fill={F.mid} seed={11} n={6} />
        {/* ตัวทาง */}
        <path d={`M${pts.map((q) => `${q.x - q.w / 2},${q.y}`).join(' L')} L${[...pts].reverse().map((q) => `${q.x + q.w / 2},${q.y}`).join(' L')} Z`} fill={F.soil} {...sk(p)} />
        {pts.slice(0, -1).map((q, i) => (
          <g key={i}>
            <path d={`M${q.x - q.w / 2},${q.y - 6} Q${q.x},${q.y - 22} ${q.x + q.w / 2},${q.y - 6}`} stroke={F.root} strokeWidth={Math.max(6, 22 * (1 - i / steps))} fill="none" strokeLinecap="round" />
            <path d={`M${q.x - q.w / 2},${q.y} L${q.x + q.w / 2},${q.y}`} stroke={F.soilDark} strokeWidth={Math.max(3, 10 * (1 - i / steps))} opacity="0.5" />
          </g>
        ))}
        {/* เมฆกลืนปลายทาง */}
        <CloudBand y={420} w={1200} fill={vec(p) ? '#DDE6F2' : p.base} seed={3} drift={Math.sin(t * 0.4) * 30 - 60} op={0.95} r={140} />
        <CloudBand y={560} w={1200} fill={vec(p) ? '#C9D3E6' : p.mid} seed={9} drift={Math.sin(t * 0.3 + 1) * 40 - 80} op={0.8} r={120} />
      </g>
    );
  },
};

// ---------- ภูเขาทรงพีระมิดมีป่าเป็นชั้น · props.glow (ยอดเรืองแสง ไม่มีรูปเทพ) ----------
export const kmMountain: AssetDef = {
  vb: [900, 800],
  draw: ({p, t, props, uid}) => {
    const F = forest(p);
    const g = props.glow ? 0.5 + 0.25 * Math.sin(t * 2) : 0;
    return (
      <g>
        {g > 0 && <circle cx="450" cy="120" r="220" fill={`url(#glow-${uid})`} opacity={g} />}
        <path d="M450,70 L860,780 L40,780 Z" fill={F.near} {...sk(p)} />
        <path d="M450,70 L860,780 L450,780 Z" fill={shadeFill(p, uid, F.mid)} opacity="0.7" />
        <path d="M450,70 L540,230 L360,230 Z" fill={vec(p) ? '#8A9BB3' : p.shade} />
        {Array.from({length: 26}).map((_, i) => {
          const u = 0.3 + rnd(i) * 0.65;
          const half = u * 410;
          return <circle key={i} cx={450 + (rnd(i + 9) - 0.5) * 2 * half * 0.85} cy={70 + u * 710} r={18 + rnd(i + 3) * 18} fill={i % 3 ? F.mid : F.far} />;
        })}
        <CloudBand y={420} w={900} fill={vec(p) ? '#F4F1EA' : p.base} seed={4} drift={Math.sin(t * 0.5) * 20} op={0.55} r={70} />
      </g>
    );
  },
};

// ---------- แผนที่ภาคใต้แบบสัญลักษณ์ (ไม่ใช่แผนที่จริงตามมาตราส่วน) + หมุด ----------
export const kmMapSouth: AssetDef = {
  vb: [700, 1000],
  draw: ({p, t}) => {
    const land = vec(p) ? '#2E6B5A' : p.green;
    const sea = vec(p) ? '#1C4F85' : p.sea;
    const drop = ease((t - 0.2) / 0.5);
    return (
      <g>
        <rect width="700" height="1000" rx="30" fill={sea} opacity="0.35" />
        <path d="M300,40 C360,60 380,160 360,260 C350,330 420,380 440,470 C470,590 420,660 460,760 C490,840 520,900 470,960 C420,920 380,860 350,780 C300,660 250,600 260,480 C270,380 220,300 240,200 C250,120 260,60 300,40 Z" fill={land} {...sk(p)} />
        <g transform={`translate(0,${(1 - drop) * -120})`} opacity={drop}>
          <path d="M405,520 C405,470 445,440 470,440 C495,440 535,470 535,520 C535,570 470,630 470,630 C470,630 405,570 405,520 Z" fill={vec(p) ? '#FF5A4A' : p.red} {...sk(p)} />
          <circle cx="470" cy="515" r="22" fill="#FBF6EC" />
        </g>
        <text x="560" y="690" fontFamily={FONT.body} fontWeight={600} fontSize="40" fill={vec(p) ? '#FBF6EC' : p.ink}>นครศรีฯ</text>
      </g>
    );
  },
};

// ---------- ป้ายชื่อที่หดลง: เขาพระสุเมรุ → เขาเมรุ → เขาเหมน (collage) ----------
export const kmNames: AssetDef = {
  vb: [820, 760],
  draw: ({p, t}) => {
    const names = ['เขาพระสุเมรุ', 'เขาเมรุ', 'เขาเหมน'];
    const red = vec(p) ? '#FF5A4A' : p.red;
    return (
      <g>
        {names.map((n, i) => {
          const show = ease((t - i * 0.55) / 0.35);
          const strike = i < 2 ? clamp01((t - i * 0.55 - 0.4) / 0.25) : 0;
          const y = 90 + i * 230;
          const rot = [-4, 3, -2][i];
          return (
            <g key={i} opacity={show} transform={`translate(${60 + i * 40},${y}) rotate(${rot})`}>
              <rect width="620" height="170" rx="8" fill={vec(p) ? '#F2E8D5' : p.base} {...sk(p)} />
              <text x="310" y="112" textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize={i === 2 ? 96 : 84} fill={ink(p)}>{n}</text>
              {strike > 0 && <path d={`M40,90 L${40 + 540 * strike},80`} stroke={red} strokeWidth="14" strokeLinecap="round" />}
              {i === 2 && show > 0.9 && <ellipse cx="310" cy="85" rx="300" ry="95" fill="none" stroke={red} strokeWidth="10" opacity={clamp01((t - 1.6) / 0.3)} />}
            </g>
          );
        })}
      </g>
    );
  },
};

// ---------- แผนที่เส้นทางบนกระดาษ: จุดเริ่ม "499" → ยอด (เส้นประขึ้นทีละส่วน) ----------
export const kmTrailMap: AssetDef = {
  vb: [700, 900],
  draw: ({p, t}) => {
    const k = ease(t / 1.4);
    const red = vec(p) ? '#FF5A4A' : p.red;
    return (
      <g>
        <rect x="20" y="20" width="660" height="860" rx="14" fill={vec(p) ? '#F2E8D5' : p.base} {...sk(p)} transform="rotate(-2 350 450)" />
        {Array.from({length: 6}).map((_, i) => (
          <path key={i} d={`M80,${200 + i * 110} Q350,${160 + i * 110} 620,${210 + i * 110}`} stroke={vec(p) ? '#C9B79A' : p.shade} strokeWidth="3" fill="none" opacity="0.6" />
        ))}
        <path d="M200,780 C260,700 180,640 260,560 C340,480 300,420 380,360 C450,300 420,220 470,160" stroke={red} strokeWidth="10" fill="none" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - k} opacity="0.9" />
        <circle cx="200" cy="780" r="22" fill={ink(p)} />
        <text x="240" y="800" fontFamily={FONT.display} fontWeight={700} fontSize="48" fill={ink(p)}>499</text>
        <path d="M470,110 L520,190 L420,190 Z" fill={ink(p)} opacity={k} />
      </g>
    );
  },
};

// ---------- กราฟความชัน (สัญลักษณ์ ไม่มีสเกล) · เส้นพุ่งขึ้นเกือบตลอด ช่วงราบสั้นมาก · props.full = วาดเต็มทันที ----------
export const kmProfile: AssetDef = {
  vb: [900, 620],
  draw: ({p, t, props}) => {
    const k = props.full ? 1 : ease(t / 1.6);
    const pts: [number, number][] = [[40, 560], [150, 470], [190, 462], [300, 380], [420, 290], [450, 284], [560, 200], [680, 120], [760, 70], [860, 50]];
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
    const col = vec(p) ? '#FFC94A' : p.gold;
    return (
      <g>
        <path d="M40,580 L860,580" stroke={vec(p) ? '#FBF6EC' : p.ink} strokeWidth="4" opacity="0.4" />
        <path d={`${d} L860,580 L40,580 Z`} fill={col} opacity={0.15 * k} />
        <path d={d} stroke={col} strokeWidth="12" fill="none" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - k} />
        {k > 0.98 && <path d="M820,20 L860,50 L820,80" stroke={col} strokeWidth="8" fill="none" />}
        {[[150, 470], [420, 290]].map(([x, y], i) => (
          <circle key={i} cx={x + 20} cy={y - 4} r="12" fill={vec(p) ? '#3FD6A0' : p.green} opacity={k > (x / 860) ? 1 : 0} />
        ))}
      </g>
    );
  },
};

// ---------- น้องคอนนักเดินป่า: น้องคอน + เป้หลัง (+ ไฟฉายคาดหัว props.lamp) · props.expr ส่งต่อให้น้องคอน ----------
export const kmHiker: AssetDef = {
  vb: [320, 480],
  draw: (a) => {
    const {p, props, t} = a;
    const pack = vec(p) ? {body: '#C9553B', dark: '#8E3E28', strap: '#FFC94A'} : {body: p.red, dark: p.deep, strap: p.gold};
    return (
      <g>
        {/* เป้อยู่หลังตัว */}
        <g transform={`translate(0,${Math.sin(t * 2.2) * 3})`}>
          <rect x="60" y="220" width="90" height="150" rx="24" fill={pack.body} {...sk(p)} />
          <rect x="70" y="200" width="70" height="40" rx="14" fill={pack.dark} />
          <rect x="72" y="300" width="66" height="44" rx="10" fill={pack.dark} opacity="0.7" />
        </g>
        {khonKid.draw(a)}
        <path d="M118,236 L140,330" stroke={pack.strap} strokeWidth="8" strokeLinecap="round" />
        {props.lamp && (
          <g>
            <rect x="96" y="118" width="128" height="14" rx="7" fill={ink(p)} />
            <circle cx="160" cy="118" r="14" fill="#FFF6DA" />
            <path d="M170,110 L320,40 L320,200 Z" fill="#FFF6DA" opacity={0.25 + 0.1 * Math.sin(t * 6)} />
          </g>
        )}
      </g>
    );
  },
};

// ---------- สมเสร็จ (เดินด้านข้าง ขาวดำ หน้าใจดี) ----------
export const kmTapir: AssetDef = {
  vb: [720, 440],
  draw: ({p, t}) => {
    const dark = vec(p) ? '#1B1F2A' : p.ink;
    const light = vec(p) ? '#EDEAE2' : p.base;
    const w = Math.sin(t * 5);
    return (
      <g transform={`translate(${Math.sin(t * 0.6) * 10},0)`}>
        <ellipse cx="360" cy="420" rx="300" ry="14" fill="#000" opacity="0.2" />
        {[[190, -w], [300, w], [470, -w], [560, w]].map(([x, ph], i) => (
          <rect key={i} x={x} y="290" width="48" height="120" rx="16" fill={dark} transform={`rotate(${ph * 8} ${x + 24} 290)`} />
        ))}
        <ellipse cx="380" cy="250" rx="250" ry="120" fill={dark} {...sk(p)} />
        {/* ช่วงกลางลำตัวสีขาว */}
        <path d="M330,140 C430,120 520,140 560,190 C590,240 590,300 540,340 C470,370 380,360 330,340 Z" fill={light} {...sk(p)} />
        <ellipse cx="150" cy="235" rx="95" ry="80" fill={dark} {...sk(p)} />
        <path d="M70,230 Q30,250 40,300 Q60,300 70,270 Z" fill={dark} />
        <circle cx="130" cy="215" r="9" fill="#FBF6EC" />
        <ellipse cx="180" cy="165" rx="20" ry="30" fill={dark} />
      </g>
    );
  },
};

// ---------- ทาก + กากบาท "แทบไม่มีทาก" ----------
export const kmLeechX: AssetDef = {
  vb: [460, 340],
  draw: ({p, t}) => {
    const x = ease((t - 0.3) / 0.35);
    const red = vec(p) ? '#FF5A4A' : p.red;
    return (
      <g>
        <path d="M80,220 C140,120 240,260 300,170 C340,110 380,150 390,190" stroke={vec(p) ? '#4A3526' : p.coffee} strokeWidth="46" strokeLinecap="round" fill="none" />
        <circle cx="390" cy="190" r="10" fill={ink(p)} />
        <g opacity={x}>
          <path d={`M60,60 L${60 + 340 * x},${60 + 240 * x}`} stroke={red} strokeWidth="26" strokeLinecap="round" />
          <path d={`M400,60 L${400 - 340 * x},${60 + 240 * x}`} stroke={red} strokeWidth="26" strokeLinecap="round" />
        </g>
      </g>
    );
  },
};

// ---------- ดอกไม้ป่า + กล้วยไม้รองเท้านารี (ภาพสัญลักษณ์ ใช้แบบ collage) ----------
export const kmFlowers: AssetDef = {
  vb: [760, 560],
  draw: ({p, t}) => {
    const pink = vec(p) ? '#F28FB0' : '#D98C9A';
    const yel = vec(p) ? '#FFC94A' : p.gold;
    const sway = Math.sin(t * 1.5) * 3;
    return (
      <g>
        {/* ดอกป่าแฉก */}
        <g transform={`translate(210,260) rotate(${sway})`}>
          <path d="M0,0 L0,260" stroke={p.greenDark} strokeWidth="10" />
          {Array.from({length: 7}).map((_, i) => (
            <ellipse key={i} cx="0" cy="-90" rx="36" ry="90" fill={pink} transform={`rotate(${i * (360 / 7)})`} {...sk(p, 0.6)} />
          ))}
          <circle r="42" fill={yel} {...sk(p)} />
        </g>
        {/* รองเท้านารี */}
        <g transform={`translate(540,250) rotate(${-sway})`}>
          <path d="M0,40 L0,280" stroke={p.greenDark} strokeWidth="10" />
          <ellipse cx="-110" cy="0" rx="120" ry="30" fill={vec(p) ? '#B8C77A' : p.green} transform="rotate(-20 -110 0)" {...sk(p, 0.6)} />
          <ellipse cx="110" cy="0" rx="120" ry="30" fill={vec(p) ? '#B8C77A' : p.green} transform="rotate(20 110 0)" {...sk(p, 0.6)} />
          <path d="M-40,-150 C-10,-190 10,-190 40,-150 L20,-40 L-20,-40 Z" fill={vec(p) ? '#EDE3C8' : p.base} {...sk(p)} />
          <path d="M-70,10 C-70,-60 70,-60 70,10 C70,90 -70,90 -70,10 Z" fill={vec(p) ? '#A8563E' : p.coffeeLight} {...sk(p)} />
        </g>
        <path d="M0,540 L760,540" stroke={p.greenDark} strokeWidth="14" />
      </g>
    );
  },
};

// ---------- เปลผูกระหว่างต้นไม้บนสันเขา · props.night ----------
export const kmHammock: AssetDef = {
  vb: [1000, 720],
  draw: ({p, t, props}) => {
    const F = forest(p);
    const s = Math.sin(t * 1.2) * 8;
    const cloth = vec(p) ? '#FF6B4A' : p.red;
    return (
      <g>
        <rect x="80" y="40" width="70" height="680" fill={F.root} {...sk(p)} />
        <rect x="850" y="60" width="70" height="660" fill={F.root} {...sk(p)} />
        <Blob x={115} y={60} r={150} fill={F.mid} seed={2} n={5} />
        <Blob x={885} y={80} r={150} fill={F.mid} seed={6} n={5} />
        <path d={`M150,300 Q500,${520 + s} 850,300`} stroke={ink(p)} strokeWidth="6" fill="none" />
        <path d={`M200,330 Q500,${560 + s} 800,330 Q500,${470 + s} 200,330 Z`} fill={cloth} {...sk(p)} />
        {props.night && <circle cx="500" cy={440 + s} r="46" fill={vec(p) ? '#FFE6A6' : p.glow} opacity="0.35" />}
        <path d="M0,700 Q500,600 1000,700 L1000,720 L0,720 Z" fill={F.far} />
      </g>
    );
  },
};

// ---------- ไอคอน ✕ ไฟฟ้า ✕ ห้องน้ำ ----------
export const kmNoIcons: AssetDef = {
  vb: [840, 380],
  draw: ({p, t}) => {
    const red = vec(p) ? '#FF5A4A' : p.red;
    const col = vec(p) ? '#FBF6EC' : p.ink;
    const x = (i: number) => ease((t - 0.3 - i * 0.3) / 0.3);
    return (
      <g>
        {/* หลอดไฟ */}
        <g transform="translate(210,190)">
          <circle cx="0" cy="-30" r="90" fill="none" stroke={col} strokeWidth="16" />
          <rect x="-40" y="60" width="80" height="60" rx="10" fill={col} />
          <path d={`M-120,-130 L${-120 + 240 * x(0)},${-130 + 260 * x(0)}`} stroke={red} strokeWidth="22" strokeLinecap="round" />
        </g>
        {/* ห้องน้ำ (ไอคอนโถ) */}
        <g transform="translate(630,190)">
          <rect x="-70" y="-130" width="80" height="110" rx="12" fill="none" stroke={col} strokeWidth="16" />
          <path d="M-90,-10 L90,-10 C90,70 40,110 -20,110 L-50,110 C-80,90 -90,50 -90,-10 Z" fill="none" stroke={col} strokeWidth="16" />
          <path d={`M-130,-140 L${-130 + 260 * x(1)},${-140 + 270 * x(1)}`} stroke={red} strokeWidth="22" strokeLinecap="round" />
        </g>
      </g>
    );
  },
};

// ---------- ทะเลหมอก: ฟ้ารุ่งเช้า + หมอกหลายชั้น + ยอดเขาอื่นโผล่เป็นเกาะ (เต็มเฟรมแนวตั้ง) · props.sun ----------
export const kmMistSea: AssetDef = {
  vb: [1080, 1920],
  draw: ({p, t, props, uid}) => {
    const sunUp = props.sun === false ? 0 : ease(t / 2.4);
    const mist = vec(p) ? ['#F4F1EA', '#E3E8F0', '#C9D3E6'] : [p.base, p.mid, p.shade];
    const isl = vec(p) ? ['#2B4470', '#22385C', '#1C3350'] : [p.shade, p.deep, p.ink];
    return (
      <g>
        <defs>
          <linearGradient id={`km-sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={vec(p) ? '#1B2A55' : p.sky1} />
            <stop offset="0.45" stopColor={vec(p) ? '#F59A6B' : '#E9B97E'} />
            <stop offset="0.7" stopColor={vec(p) ? '#FFD9A0' : p.glow} />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill={`url(#km-sky-${uid})`} />
        <circle cx="540" cy={900 - sunUp * 260} r="120" fill="#FFE6A6" />
        <circle cx="540" cy={900 - sunUp * 260} r="260" fill={`url(#glow-${uid})`} opacity="0.7" />
        {[[180, 980, 260], [860, 1010, 300], [520, 1050, 180]].map(([x, y, w], i) => (
          <path key={i} d={`M${x - w},${y + 120} L${x},${y - w * 0.5} L${x + w},${y + 120} Z`} fill={isl[i]} />
        ))}
        {mist.map((c, i) => (
          <CloudBand key={i} y={1080 + i * 150} w={1300} fill={c} seed={i * 11 + 3} drift={Math.sin(t * 0.35 + i) * 40 - 110} op={0.95 - i * 0.05} r={170 - i * 15} />
        ))}
        <rect y="1400" width="1080" height="520" fill={mist[2]} />
      </g>
    );
  },
};

// ---------- เมฆฉากหน้า (fg) แนวตั้ง ----------
export const kmCloudsFg: AssetDef = {
  vb: [1080, 1920],
  draw: ({p, t}) => (
    <g>
      <CloudBand y={260} w={1300} fill={vec(p) ? '#F4F1EA' : p.base} seed={21} drift={Math.sin(t * 0.5) * 50 - 100} op={0.75} r={170} />
      <CloudBand y={1700} w={1300} fill={vec(p) ? '#E3E8F0' : p.mid} seed={33} drift={Math.sin(t * 0.4 + 2) * 50 - 100} op={0.8} r={190} />
    </g>
  ),
};

// ---------- เช็กลิสต์ก่อนขึ้นเขา · props.items (สูงสุด 3) ติ๊กทีละข้อ ----------
export const kmChecklist: AssetDef = {
  vb: [820, 640],
  draw: ({p, t, props}) => {
    const items = (props.items as string[]) ?? ['เตรียมร่างกาย', 'ลงทะเบียน', 'ไปกับเจ้าหน้าที่'];
    const green = vec(p) ? '#3FD6A0' : p.green;
    return (
      <g>
        <rect x="20" y="20" width="780" height="600" rx="30" fill={vec(p) ? '#F2E8D5' : p.base} {...sk(p)} />
        {items.slice(0, 3).map((s, i) => {
          const k = ease((t - 0.2 - i * 0.35) / 0.3);
          const y = 150 + i * 170;
          return (
            <g key={i}>
              <rect x="80" y={y - 50} width="100" height="100" rx="18" fill="none" stroke={ink(p)} strokeWidth="10" />
              <path d={`M100,${y} L125,${y + 28} L170,${y - 30}`} stroke={green} strokeWidth="18" fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - k} />
              <text x="220" y={y + 22} fontFamily={FONT.display} fontWeight={700} fontSize="62" fill={ink(p)}>{s}</text>
            </g>
          );
        })}
      </g>
    );
  },
};
