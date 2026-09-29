// asset ของเรื่อง "ตำนานตุมปัง ณ วลัยลักษณ์" (projects/tumpang) — วาดเองทั้งหมด ใช้สีจาก palette (rule 10)
// ไม่ใช้ภาพถ่ายโบราณสถานจริง · ไม่มีโลโก้มหาวิทยาลัย · เทวรูป/คนเป็นเงาไม่มีใบหน้า · ทวดตุมปัง (งูจงอางเผือก) หน้าตาใจดี ไม่สยอง (brief)
import React from 'react';
import {AssetDef, rnd, shadeFill} from './core';
import {sk, Pal} from './palette';
import {FONT} from '../theme/tokens';

const vec = (p: Pal) => p.style === 'vector';
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
/** สีป่า: vector = เขียวเข้มกลางคืนนิด ๆ · collage = เขียวหม่นกระดาษ */
const jungle = (p: Pal) =>
  vec(p)
    ? {far: '#123A3A', mid: '#17504A', near: '#1E6B55', light: '#2E8F6A', trunk: '#3B2A22', sky: '#0E1A2B', ray: '#FFE6A6'}
    : {far: '#7C8A63', mid: '#66764F', near: '#56673F', light: '#8FA66B', trunk: '#5E4A33', sky: '#E4D6B8', ray: '#F7E7B9'};
const brick = (p: Pal) => (vec(p) ? {face: '#C4623F', top: '#DE8A5E', dark: '#8E3E28', mortar: '#E9C9A6', moss: '#3FD6A0'} : {face: '#B86A48', top: '#CC8A66', dark: '#7A4630', mortar: '#EADCBF', moss: '#8FA66B'});
const snake = (p: Pal) => (vec(p) ? {body: '#F4F1EA', belly: '#FFF8E6', shade: '#C9D3E6', eye: '#FFC94A', glow: '#FFE6A6'} : {body: '#F2E8D5', belly: '#FBF6EC', shade: '#DCCBAA', eye: '#D9A441', glow: '#F7E7B9'});

/** กลุ่มพุ่มไม้กลม ๆ (ใช้ซ้ำหลายชั้น) */
const Canopy: React.FC<{x: number; y: number; r: number; fill: string; seed: number; n?: number; sway?: number}> = ({x, y, r, fill, seed, n = 5, sway = 0}) => (
  <g transform={`translate(${sway},0)`}>
    {Array.from({length: n}).map((_, i) => (
      <circle key={i} cx={x + (rnd(seed + i) - 0.5) * r * 1.8} cy={y + (rnd(seed + i * 3) - 0.5) * r * 0.9} r={r * (0.55 + rnd(seed + i * 5) * 0.45)} fill={fill} />
    ))}
  </g>
);

// ---------- ป่าไกล (ฉากหลังแนวตั้ง, cover) — ชั้นต้นไม้สูงมืด + ลำแสงลอด ----------
export const tpForestFar: AssetDef = {
  vb: [1080, 1920],
  draw: ({p, t}) => {
    const J = jungle(p);
    return (
      <g>
        <rect width="1080" height="1920" fill={J.sky} />
        {[0, 1, 2].map((k) => (
          <polygon key={k} points={`${300 + k * 220},0 ${380 + k * 220},0 ${620 + k * 160},1920 ${420 + k * 160},1920`} fill={J.ray} opacity={0.07 + 0.03 * Math.sin(t * 0.8 + k)} />
        ))}
        {Array.from({length: 9}).map((_, i) => (
          <rect key={i} x={i * 130 - 20 + rnd(i) * 40} y="300" width={26 + rnd(i + 9) * 20} height="1620" fill={J.far} opacity="0.9" />
        ))}
        {Array.from({length: 8}).map((_, i) => (
          <Canopy key={i} x={i * 150} y={260 + rnd(i) * 220} r={170} fill={J.far} seed={i * 11} n={6} />
        ))}
        <rect y="1500" width="1080" height="420" fill={J.far} />
        {Array.from({length: 7}).map((_, i) => (
          <Canopy key={`b${i}`} x={i * 170} y={1520} r={150} fill={J.mid} seed={40 + i * 7} n={5} />
        ))}
      </g>
    );
  },
};

// ---------- ป่าชั้นกลาง: ลำต้น + พุ่มใหญ่ เว้นช่องกลางให้เห็นฉากหลัง ----------
export const tpForestMid: AssetDef = {
  vb: [1300, 1700],
  draw: ({p, t}) => {
    const J = jungle(p);
    const s = Math.sin(t * 1.1) * 6;
    return (
      <g>
        {[
          [90, 60],
          [300, 34],
          [1000, 40],
          [1210, 64],
        ].map(([x, w], i) => (
          <path key={i} d={`M${x - w / 2},1700 L${x - w / 3},200 L${x + w / 3},200 L${x + w / 2},1700 Z`} fill={J.trunk} {...sk(p)} />
        ))}
        <path d="M300,700 Q420,640 470,560" stroke={J.trunk} strokeWidth="16" fill="none" />
        <path d="M1000,820 Q880,760 840,660" stroke={J.trunk} strokeWidth="16" fill="none" />
        <Canopy x={140} y={250} r={230} fill={J.mid} seed={3} n={7} sway={s} />
        <Canopy x={1160} y={300} r={240} fill={J.mid} seed={9} n={7} sway={-s} />
        <Canopy x={420} y={520} r={140} fill={J.near} seed={21} n={5} sway={s * 0.6} />
        <Canopy x={880} y={620} r={150} fill={J.near} seed={27} n={5} sway={-s * 0.6} />
        <Canopy x={120} y={1500} r={260} fill={J.near} seed={33} n={7} />
        <Canopy x={1180} y={1480} r={260} fill={J.near} seed={37} n={7} />
        {/* ไม้เลื้อย */}
        {[250, 1060].map((x, i) => (
          <path key={i} d={`M${x},180 q${30 + i * 10},260 -10,520 q-30,200 20,380`} stroke={J.light} strokeWidth="6" fill="none" opacity="0.7" />
        ))}
      </g>
    );
  },
};

// ---------- ใบไม้ฉากหน้าแนวตั้ง (fg) — ใบใหญ่มุมบนและมุมล่าง เว้นกลางจอ ----------
export const tpLeavesFg: AssetDef = {
  vb: [1080, 1920],
  draw: ({p, t}) => {
    const leaf = (x: number, y: number, r: number, s: number, i: number) => (
      <g key={i} transform={`translate(${x},${y}) rotate(${r + Math.sin(t * 0.9 + i) * 5}) scale(${s})`}>
        <path d="M0,0 C70,-95 250,-95 340,0 C250,95 70,95 0,0 Z" fill={i % 2 ? p.greenDark : p.green} {...sk(p)} />
        <path d="M12,0 L330,0" stroke={p.greenDark} strokeWidth="7" opacity="0.6" />
      </g>
    );
    return (
      <g>
        {[
          [-40, 60, 20, 1.3],
          [-30, 260, -10, 1.1],
          [1120, 90, 160, 1.3],
          [1120, 320, 195, 1.0],
          [-60, 1780, -25, 1.4],
          [60, 1900, -60, 1.1],
          [1140, 1760, 205, 1.4],
          [1040, 1920, 240, 1.0],
        ].map(([x, y, r, s], i) => leaf(x, y, r, s, i))}
      </g>
    );
  },
};

// ---------- ตึกมหาลัย (เงาเรียบ ๆ ไม่มีโลโก้ ไม่ใช่อาคารจริงหลังใด) ----------
export const tpCampus: AssetDef = {
  vb: [900, 420],
  draw: ({p}) => {
    const c = vec(p) ? {wall: '#3C5A8C', dark: '#22385C', win: '#FFE6A6'} : {wall: p.mid, dark: p.shade, win: p.glow};
    return (
      <g>
        <rect x="80" y="140" width="740" height="280" fill={c.wall} {...sk(p)} />
        <rect x="330" y="60" width="240" height="360" fill={c.dark} {...sk(p)} />
        <path d="M60,140 L840,140 L820,110 L80,110 Z" fill={c.dark} />
        {Array.from({length: 18}).map((_, i) => (
          <rect key={i} x={120 + (i % 9) * 76 + (i % 9 > 3 ? 60 : 0)} y={180 + Math.floor(i / 9) * 90} width="36" height="46" fill={c.win} opacity={rnd(i) > 0.35 ? 0.85 : 0.25} />
        ))}
        {Array.from({length: 6}).map((_, i) => (
          <rect key={`t${i}`} x={370 + (i % 2) * 90} y={100 + Math.floor(i / 2) * 90} width="60" height="50" fill={c.win} opacity="0.7" />
        ))}
      </g>
    );
  },
};

/** ก้อนอิฐแถว ๆ (ใช้ในซากโบราณสถาน) */
const BrickRows: React.FC<{p: Pal; x: number; y: number; w: number; rows: number; seed: number; bw?: number; bh?: number; ragged?: number}> = ({p, x, y, w, rows, seed, bw = 60, bh = 26, ragged = 0}) => {
  const B = brick(p);
  const out: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? bw / 2 : 0;
    const cut = ragged ? Math.floor(rnd(seed + r) * ragged) : 0;
    for (let c = -1; c * bw < w; c++) {
      const bx = x + c * bw + off;
      if (bx < x - 1 || bx + bw > x + w - cut * bw + 1) continue;
      out.push(<rect key={`${r}-${c}`} x={bx + 2} y={y + r * bh + 2} width={bw - 4} height={bh - 4} rx="3" fill={(r + c) % 3 ? B.face : B.dark} opacity={0.92} />);
    }
  }
  return <g>{out}</g>;
};

// ---------- ซากฐานอาคารก่ออิฐ (ฐานยกพื้น + บันได + ผนังพัง + มอส) ----------
export const tpBrickRuin: AssetDef = {
  vb: [1200, 720],
  draw: ({p, uid}) => {
    const B = brick(p);
    return (
      <g>
        <ellipse cx="600" cy="690" rx="560" ry="30" fill="#000" opacity="0.2" />
        {/* ฐาน */}
        <path d="M80,470 L1120,470 L1080,680 L120,680 Z" fill={B.mortar} {...sk(p)} />
        <BrickRows p={p} x={110} y={480} w={980} rows={7} seed={2} />
        <path d="M80,470 L1120,470 L1100,440 L100,440 Z" fill={B.top} {...sk(p)} />
        {/* บันไดหน้า */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={500 - i * 14} y={560 + i * 30} width={200 + i * 28} height="30" fill={i % 2 ? B.top : B.face} {...sk(p, 0.6)} />
        ))}
        {/* ผนังที่เหลือ — ขอบบนหักไม่เท่ากัน */}
        <g>
          <path d="M150,440 L150,250 L190,230 L230,270 L270,210 L320,240 L320,440 Z" fill={B.mortar} {...sk(p)} />
          <BrickRows p={p} x={150} y={250} w={170} rows={7} seed={5} ragged={2} />
          <path d="M860,440 L860,300 L900,280 L950,320 L990,260 L1050,290 L1050,440 Z" fill={B.mortar} {...sk(p)} />
          <BrickRows p={p} x={860} y={300} w={190} rows={5} seed={8} ragged={2} />
        </g>
        <path d="M150,440 L320,440 L320,420 L150,420 Z" fill={shadeFill(p, uid, B.dark)} opacity="0.5" />
        {/* มอส + หญ้า */}
        {Array.from({length: 14}).map((_, i) => (
          <ellipse key={i} cx={120 + rnd(i) * 960} cy={440 + rnd(i + 3) * 30} rx={30 + rnd(i + 5) * 40} ry="12" fill={B.moss} opacity={vec(p) ? 0.55 : 0.7} />
        ))}
        {Array.from({length: 22}).map((_, i) => (
          <path key={`g${i}`} d={`M${100 + i * 46},684 l${-8 + rnd(i) * 6},-${24 + rnd(i + 2) * 30} M${108 + i * 46},684 l${6},-${18 + rnd(i + 4) * 26}`} stroke={p.greenDark} strokeWidth="5" strokeLinecap="round" />
        ))}
      </g>
    );
  },
};

// ---------- ขอบอิฐโผล่จากดิน/ใบไม้ (ช็อตตั้งคำถาม) ----------
export const tpBrickEdge: AssetDef = {
  vb: [800, 360],
  draw: ({p}) => {
    const B = brick(p);
    const J = jungle(p);
    return (
      <g>
        <path d="M0,360 L0,230 Q400,190 800,240 L800,360 Z" fill={vec(p) ? '#2A1E14' : p.deep} />
        <path d="M160,250 L160,120 L220,100 L260,140 L310,90 L380,120 L420,100 L470,130 L520,110 L600,150 L640,250 Z" fill={B.mortar} {...sk(p)} />
        <BrickRows p={p} x={160} y={120} w={480} rows={5} seed={12} ragged={3} />
        <Canopy x={120} y={240} r={120} fill={J.near} seed={2} n={4} />
        <Canopy x={700} y={250} r={120} fill={J.near} seed={6} n={4} />
      </g>
    );
  },
};

// ---------- ทวดตุมปัง: งูจงอางเผือก ขดตัว แผ่แม่เบี้ยนิด ๆ ตาเรืองนุ่ม (ไม่มีเขี้ยว ไม่สยอง) ----------
// props.glow (default true)
export const tpCobra: AssetDef = {
  vb: [700, 820],
  draw: ({p, t, props, uid}) => {
    const S = snake(p);
    const bob = Math.sin(t * 1.6) * 8;
    const tongue = (t * 1.3) % 2 < 0.25;
    return (
      <g>
        {props.glow !== false && <ellipse cx="350" cy="330" rx="330" ry="330" fill={`url(#glow-${uid})`} opacity="0.45" />}
        <ellipse cx="350" cy="790" rx="280" ry="24" fill="#000" opacity="0.2" />
        {/* ขด */}
        <ellipse cx="350" cy="700" rx="270" ry="90" fill={S.shade} {...sk(p)} />
        <ellipse cx="350" cy="680" rx="250" ry="80" fill={S.body} {...sk(p)} />
        <ellipse cx="350" cy="630" rx="190" ry="62" fill={S.shade} {...sk(p)} />
        <ellipse cx="350" cy="612" rx="175" ry="56" fill={S.body} {...sk(p)} />
        {/* ลำตัวยกขึ้น */}
        <g transform={`translate(0,${bob})`}>
          <path d="M300,600 C290,500 330,430 350,360 C370,430 410,500 400,600 Z" fill={S.body} {...sk(p)} />
          <path d="M335,590 C330,500 345,440 350,380 C355,440 370,500 365,590 Z" fill={S.belly} />
          {/* แม่เบี้ย */}
          <path d="M350,160 C240,170 210,260 240,360 C270,420 330,430 350,430 C370,430 430,420 460,360 C490,260 460,170 350,160 Z" fill={S.body} {...sk(p)} />
          <path d="M350,200 C290,210 275,270 290,340 C305,390 335,400 350,400 C365,400 395,390 410,340 C425,270 410,210 350,200 Z" fill={S.belly} />
          {Array.from({length: 4}).map((_, i) => (
            <path key={i} d={`M${300 + i * 0},${250 + i * 38} Q350,${262 + i * 38} 400,${250 + i * 38}`} stroke={S.shade} strokeWidth="5" fill="none" opacity="0.6" />
          ))}
          {/* หัว */}
          <ellipse cx="350" cy="150" rx="70" ry="56" fill={S.body} {...sk(p)} />
          <ellipse cx="350" cy="176" rx="46" ry="26" fill={S.belly} />
          {/* ตาใจดี — ปิดครึ่งแบบยิ้ม */}
          {[318, 382].map((cx, i) => (
            <g key={i}>
              <circle cx={cx} cy="138" r="13" fill={S.eye} />
              <path d={`M${cx - 14},136 Q${cx},${126} ${cx + 14},136`} stroke={vec(p) ? '#10213A' : p.ink} strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>
          ))}
          {tongue && <path d="M350,196 L350,228 M350,228 L338,242 M350,228 L362,242" stroke={p.red} strokeWidth="5" strokeLinecap="round" />}
        </g>
      </g>
    );
  },
};

// ---------- หางงูขาวเลื้อย (S-curve เคลื่อนเป็นคลื่น) ----------
export const tpCobraTail: AssetDef = {
  vb: [900, 260],
  draw: ({p, t}) => {
    const S = snake(p);
    const ph = t * 4;
    const pts = Array.from({length: 24}, (_, i) => {
      const x = 40 + i * 36;
      const y = 130 + Math.sin(ph - i * 0.45) * 50 * (0.3 + i / 24);
      return [x, y];
    });
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
    return (
      <g>
        <path d={d} stroke={S.shade} strokeWidth="58" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(4,8)" opacity="0.6" />
        <path d={d} stroke={S.body} strokeWidth="52" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={d} stroke={S.belly} strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.8" />
      </g>
    );
  },
};

/** เทวรูปแบบเงา ไม่มีใบหน้า — part: full | top | bottom */
const StatueShape: React.FC<{p: Pal; part: 'full' | 'top' | 'bottom'; x?: number; y?: number; s?: number}> = ({p, part, x = 0, y = 0, s = 1}) => {
  const stone = vec(p) ? {body: '#8C93A6', dark: '#5B6378', light: '#B7BECC'} : {body: p.mid, dark: p.shade, light: p.base};
  const top = (
    <g>
      <path d="M200,20 L180,70 L220,70 Z" fill={stone.dark} />
      <ellipse cx="200" cy="100" rx="42" ry="48" fill={stone.body} {...sk(p)} />
      <path d="M130,160 Q200,130 270,160 L260,250 L140,250 Z" fill={stone.body} {...sk(p)} />
      <path d="M140,170 L100,240 L118,250 L150,190 Z M260,170 L300,240 L282,250 L250,190 Z" fill={stone.dark} />
      <path d="M150,180 Q200,196 250,180" stroke={stone.light} strokeWidth="6" fill="none" />
    </g>
  );
  const bottom = (
    <g>
      <path d="M140,250 L260,250 L270,380 L130,380 Z" fill={stone.body} {...sk(p)} />
      <path d="M150,300 L250,300 M146,340 L254,340" stroke={stone.dark} strokeWidth="6" />
      <rect x="110" y="380" width="180" height="40" rx="6" fill={stone.dark} {...sk(p)} />
    </g>
  );
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      {part !== 'bottom' && top}
      {part !== 'top' && bottom}
      {part !== 'full' && <path d={part === 'top' ? 'M140,250 L165,236 L185,256 L210,238 L235,258 L260,250' : 'M140,250 L165,264 L185,244 L210,262 L235,242 L260,250'} stroke={vec(p) ? '#10213A' : p.ink} strokeWidth="5" fill="none" />}
    </g>
  );
};

// ---------- เทวรูปครึ่งท่อน (collage ช็อตหัก) — props.part: top | bottom ----------
export const tpStatueHalf: AssetDef = {
  vb: [400, 440],
  draw: ({p, props}) => <StatueShape p={p} part={(props.part as 'top' | 'bottom') ?? 'top'} />,
};

// ---------- ช้างเดินแบกเทวรูป (ด้านข้าง) ----------
export const tpElephant: AssetDef = {
  vb: [900, 760],
  draw: ({p, t, uid}) => {
    const el = vec(p) ? {body: '#7E8799', dark: '#5B6378', ear: '#6C7486', cloth: '#FF5A4A', trim: '#FFC94A'} : {body: p.mid, dark: p.shade, ear: p.shade, cloth: p.red, trim: p.gold};
    const w = Math.sin(t * 5);
    const leg = (x: number, ph: number, back = false) => (
      <path key={x} d={`M${x},520 L${x + ph * 16},700 L${x + 56 + ph * 16},700 L${x + 56},520 Z`} fill={back ? el.dark : el.body} {...sk(p)} />
    );
    return (
      <g transform={`translate(0,${Math.abs(w) * -6})`}>
        <ellipse cx="450" cy="712" rx="340" ry="20" fill="#000" opacity="0.2" />
        {leg(250, -w, true)}
        {leg(560, w, true)}
        <ellipse cx="450" cy="450" rx="300" ry="190" fill={el.body} {...sk(p)} />
        <path d="M180,470 Q450,560 720,470" stroke={el.dark} strokeWidth="10" fill="none" opacity="0.5" />
        {leg(200, w)}
        {leg(620, -w)}
        {/* หัว + งวง + หู */}
        <circle cx="770" cy="380" r="130" fill={el.body} {...sk(p)} />
        <path d="M680,300 Q610,380 660,500 Q720,520 740,440 Z" fill={el.ear} {...sk(p)} />
        <path d={`M860,420 Q900,540 ${860 + Math.sin(t * 2) * 20},650 L${830 + Math.sin(t * 2) * 20},650 Q860,540 820,440 Z`} fill={el.body} {...sk(p)} />
        <circle cx="800" cy="350" r="10" fill={vec(p) ? '#10213A' : p.ink} />
        <path d="M850,450 Q880,470 870,500" stroke="#FBF6EC" strokeWidth="12" strokeLinecap="round" fill="none" />
        {/* ผ้าหลังช้าง */}
        <path d="M300,280 L620,280 L640,420 L280,420 Z" fill={el.cloth} {...sk(p)} />
        <path d="M280,410 L640,410" stroke={el.trim} strokeWidth="10" />
        {/* เทวรูปบนหลัง */}
        <StatueShape p={p} part="full" x={306} y={-18} s={0.72} />
        <path d="M330,290 L330,260 M600,290 L600,260" stroke={shadeFill(p, uid, el.dark)} strokeWidth="6" />
      </g>
    );
  },
};

// ---------- ป้ายไม้ (มีข้อความในตัวป้าย) — props.text ----------
export const tpSign: AssetDef = {
  vb: [720, 560],
  draw: ({p, props}) => {
    const wood = vec(p) ? {face: '#A86B45', dark: '#6B3E26', text: '#FBF6EC'} : {face: p.coffeeLight, dark: p.coffee, text: p.base};
    const text = (props.text as string) ?? 'วัดตุมปัง (ร้าง)';
    return (
      <g>
        <rect x="330" y="220" width="60" height="340" fill={wood.dark} {...sk(p)} />
        <path d="M40,40 L680,20 L700,250 L20,270 Z" fill={wood.face} {...sk(p)} />
        {[80, 140, 200].map((y, i) => (
          <path key={i} d={`M50,${y} Q360,${y - 14} 680,${y - 10}`} stroke={wood.dark} strokeWidth="4" fill="none" opacity="0.35" />
        ))}
        <text x="360" y="170" textAnchor="middle" fontFamily={FONT.display} fontWeight={700} fontSize="80" fill={wood.text}>
          {text}
        </text>
        {[60, 640].map((x, i) => (
          <circle key={i} cx={x} cy={i ? 44 : 60} r="10" fill={wood.dark} />
        ))}
      </g>
    );
  },
};

// ---------- ป่ามุมบน (top-down) สำหรับช็อตหลงป่า ----------
export const tpForestTop: AssetDef = {
  vb: [1080, 1920],
  draw: ({p}) => {
    const J = jungle(p);
    return (
      <g>
        <rect width="1080" height="1920" fill={J.far} />
        {Array.from({length: 46}).map((_, i) => (
          <circle key={i} cx={rnd(i) * 1080} cy={rnd(i + 99) * 1920} r={90 + rnd(i + 7) * 110} fill={i % 3 ? J.mid : J.near} />
        ))}
        {/* ลานว่างกลางป่า */}
        <ellipse cx="540" cy="900" rx="330" ry="330" fill={vec(p) ? '#2A4A3A' : '#A89A70'} />
        {Array.from({length: 14}).map((_, i) => (
          <circle key={`h${i}`} cx={540 + Math.cos(i) * (340 + rnd(i) * 60)} cy={900 + Math.sin(i) * (340 + rnd(i) * 60)} r={80 + rnd(i + 4) * 40} fill={J.near} />
        ))}
      </g>
    );
  },
};

// ---------- คนขโมยเดินหลง (เงา ไม่มีหน้า ถือห่อผ้า) — เดินวนเป็นวงกลม ----------
export const tpThief: AssetDef = {
  vb: [260, 360],
  draw: ({p, t}) => {
    const ink = vec(p) ? '#0E1A2B' : p.ink;
    const step = Math.sin(t * 8) * 10;
    return (
      <g transform={`translate(${Math.cos(t * 1.4) * 60},${Math.sin(t * 1.4) * 30})`}>
        <circle cx="120" cy="60" r="36" fill={ink} />
        <path d="M90,100 L150,100 L160,230 L80,230 Z" fill={ink} />
        <path d={`M95,230 L${85 + step},340 M145,230 L${155 - step},340`} stroke={ink} strokeWidth="22" strokeLinecap="round" />
        <path d="M150,120 L200,170" stroke={ink} strokeWidth="18" strokeLinecap="round" />
        <circle cx="212" cy="190" r="34" fill={vec(p) ? '#FFC94A' : p.gold} />
        <path d="M200,160 L224,160" stroke={ink} strokeWidth="6" />
        {/* เครื่องหมาย ? เหนือหัว */}
        <text x="170" y="20" fontFamily={FONT.display} fontWeight={700} fontSize="64" fill={vec(p) ? '#FBF6EC' : p.ink}>?</text>
      </g>
    );
  },
};

// ---------- ดินมุมบน (cover) สำหรับช็อตผังขุดค้น ----------
export const tpSoilTop: AssetDef = {
  vb: [1080, 1920],
  draw: ({p}) => (
    <g>
      <rect width="1080" height="1920" fill={vec(p) ? '#4A3526' : p.shade} />
      {Array.from({length: 120}).map((_, i) => (
        <circle key={i} cx={rnd(i) * 1080} cy={rnd(i + 300) * 1920} r={3 + rnd(i + 5) * 10} fill={vec(p) ? '#6B4B35' : p.deep} opacity="0.5" />
      ))}
      {/* เส้นกริดขุดค้น */}
      {Array.from({length: 12}).map((_, i) => (
        <line key={`v${i}`} x1={i * 100 + 40} y1="0" x2={i * 100 + 40} y2="1920" stroke="#FBF6EC" strokeWidth="2" opacity="0.15" strokeDasharray="12 10" />
      ))}
      {Array.from({length: 20}).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 100 + 20} x2="1080" y2={i * 100 + 20} stroke="#FBF6EC" strokeWidth="2" opacity="0.15" strokeDasharray="12 10" />
      ))}
    </g>
  ),
};

// ---------- ผังโบราณสถานมุมบน: อาคาร 4 หลัง + กำแพงแก้ว + สระ 2 สระ (ขึ้นทีละส่วนตามเวลา) ----------
export const tpSitePlan: AssetDef = {
  vb: [900, 1100],
  draw: ({p, t}) => {
    const B = brick(p);
    const water = vec(p) ? {w: '#2E7FC0', d: '#1C4F85'} : {w: p.sea, d: p.seaDark};
    const k = (i: number) => ease((t - 0.1 - i * 0.18) / 0.4);
    const bld: [number, number, number, number][] = [
      [180, 190, 220, 170],
      [500, 170, 200, 200],
      [200, 470, 190, 190],
      [500, 480, 220, 160],
    ];
    const wall = ease((t - 0.9) / 0.5);
    const pond = ease((t - 1.2) / 0.5);
    return (
      <g>
        {bld.map(([x, y, w, h], i) => (
          <g key={i} transform={`translate(${x + w / 2},${y + h / 2}) scale(${k(i)}) translate(${-x - w / 2},${-y - h / 2})`} opacity={k(i)}>
            <rect x={x} y={y} width={w} height={h} fill={B.mortar} {...sk(p)} />
            <BrickRows p={p} x={x + 8} y={y + 8} w={w - 16} rows={Math.floor((h - 16) / 26)} seed={i * 13} bw={44} />
            <rect x={x} y={y} width={w} height={h} fill="none" stroke={B.dark} strokeWidth="8" />
          </g>
        ))}
        <rect x="120" y="120" width="660" height="590" fill="none" stroke={B.top} strokeWidth="18" strokeDasharray={`${2500 * wall} 2500`} rx="8" />
        {[0, 1].map((i) => (
          <g key={`p${i}`} opacity={pond}>
            <rect x={140 + i * 340} y="800" width={280} height={220 * pond} rx="10" fill={water.w} {...sk(p)} />
            <path d={`M${170 + i * 340},860 q30,-14 60,0 t60,0 t60,0`} stroke={water.d} strokeWidth="6" fill="none" opacity="0.7" />
          </g>
        ))}
      </g>
    );
  },
};

// ---------- ไอคอนอาคารอิฐ (ใช้ใน data unit) ----------
export const tpBrickHall: AssetDef = {
  vb: [200, 170],
  draw: ({p}) => {
    const B = brick(p);
    return (
      <g>
        <path d="M20,60 L100,10 L180,60 Z" fill={B.dark} {...sk(p)} />
        <rect x="30" y="60" width="140" height="100" fill={B.mortar} {...sk(p)} />
        <BrickRows p={p} x={34} y={64} w={132} rows={3} seed={4} bw={33} bh={31} />
        <rect x="84" y="100" width="32" height="60" fill={vec(p) ? '#2A1E14' : p.ink} />
      </g>
    );
  },
};

// ---------- อิฐก้อนเดียว (ช็อตวัดอายุ) ----------
export const tpBrick: AssetDef = {
  vb: [520, 300],
  draw: ({p, t, uid}) => {
    const B = brick(p);
    const scan = ((t * 0.9) % 1) * 360;
    return (
      <g>
        <ellipse cx="260" cy="280" rx="230" ry="16" fill="#000" opacity="0.2" />
        <path d="M40,110 L360,60 L480,110 L160,170 Z" fill={B.top} {...sk(p)} />
        <path d="M40,110 L160,170 L160,260 L40,200 Z" fill={shadeFill(p, uid, B.dark)} {...sk(p)} />
        <path d="M160,170 L480,110 L480,200 L160,260 Z" fill={B.face} {...sk(p)} />
        {Array.from({length: 10}).map((_, i) => (
          <circle key={i} cx={200 + rnd(i) * 250} cy={150 + rnd(i + 3) * 80} r={3 + rnd(i + 6) * 4} fill={B.dark} opacity="0.5" />
        ))}
        {/* แถบสแกนวัดอายุ */}
        <rect x={40 + scan} y="40" width="10" height="240" fill={vec(p) ? '#3FD6A0' : p.green} opacity="0.55" />
      </g>
    );
  },
};

// ---------- ของบูชา: พวงมาลัย + เทียน + ธูป ----------
export const tpOffering: AssetDef = {
  vb: [640, 460],
  draw: ({p, t, uid}) => {
    const flame = (x: number, i: number) => (
      <g key={i}>
        <ellipse cx={x} cy={110 + Math.sin(t * 9 + i) * 3} rx="16" ry="30" fill={vec(p) ? '#FFC94A' : p.gold} />
        <ellipse cx={x} cy={118} rx="7" ry="14" fill="#FFF8E6" />
      </g>
    );
    return (
      <g>
        <ellipse cx="320" cy="300" rx="260" ry="200" fill={`url(#glow-${uid})`} opacity="0.5" />
        <rect x="80" y="380" width="480" height="60" rx="10" fill={vec(p) ? '#6B3E26' : p.coffee} {...sk(p)} />
        {[160, 480].map((x, i) => (
          <g key={i}>
            <rect x={x - 18} y="150" width="36" height="230" fill={vec(p) ? '#F4F1EA' : p.base} {...sk(p)} />
            {flame(x, i)}
          </g>
        ))}
        {[280, 320, 360].map((x, i) => (
          <g key={`i${i}`}>
            <path d={`M${x},380 L${x + (i - 1) * 12},210`} stroke={vec(p) ? '#C9553B' : p.red} strokeWidth="6" />
            <path d={`M${x + (i - 1) * 12},205 q${10 + Math.sin(t * 2 + i) * 10},-40 0,-80 q-12,-30 4,-60`} stroke="#FBF6EC" strokeWidth="4" fill="none" opacity="0.4" />
          </g>
        ))}
        {/* พวงมาลัย */}
        <path d="M120,300 Q320,440 520,300" stroke={vec(p) ? '#F4F1EA' : p.base} strokeWidth="26" fill="none" strokeLinecap="round" />
        {Array.from({length: 11}).map((_, i) => {
          const u = i / 10;
          const x = 120 + u * 400;
          const y = 300 + Math.sin(u * Math.PI) * 70;
          return <circle key={`f${i}`} cx={x} cy={y} r="16" fill={i % 3 ? '#FBF6EC' : (vec(p) ? '#FF5A4A' : p.red)} />;
        })}
      </g>
    );
  },
};

// ---------- บ้านเก่ามีงูขาวขดหน้าประตู (metaphor "บ้านเก่าที่ยังมีเจ้าของ") ----------
export const tpOldHouse: AssetDef = {
  vb: [900, 820],
  draw: ({p, t}) => {
    const wood = vec(p) ? {wall: '#A86B45', dark: '#6B3E26', roof: '#8E3E28', win: '#FFE6A6'} : {wall: p.coffeeLight, dark: p.coffee, roof: p.red, win: p.glow};
    const S = snake(p);
    return (
      <g>
        <path d="M60,330 L450,60 L840,330 Z" fill={wood.roof} {...sk(p)} />
        <path d="M380,110 L450,20 L520,110" stroke={wood.roof} strokeWidth="18" fill="none" />
        <rect x="140" y="330" width="620" height="330" fill={wood.wall} {...sk(p)} />
        {Array.from({length: 11}).map((_, i) => (
          <line key={i} x1={170 + i * 56} y1="340" x2={170 + i * 56} y2="650" stroke={wood.dark} strokeWidth="4" opacity="0.4" />
        ))}
        {[210, 590].map((x, i) => (
          <rect key={i} x={x} y="400" width="100" height="110" fill={wood.win} opacity={0.6 + 0.3 * Math.sin(t * 1.5 + i)} {...sk(p)} />
        ))}
        <rect x="380" y="430" width="140" height="230" fill={wood.dark} {...sk(p)} />
        {/* เสาใต้ถุน */}
        {[170, 330, 570, 730].map((x, i) => (
          <rect key={`c${i}`} x={x} y="660" width="30" height="130" fill={wood.dark} />
        ))}
        <rect x="120" y="650" width="660" height="20" fill={wood.dark} />
        {/* งูขาวขดที่บันไดหน้าประตู */}
        <g transform={`translate(450,700) scale(0.9)`}>
          <ellipse cx="0" cy="60" rx="110" ry="36" fill={S.shade} {...sk(p)} />
          <ellipse cx="0" cy="48" rx="96" ry="30" fill={S.body} {...sk(p)} />
          <path d="M-20,40 C-24,-10 -10,-40 0,-60 C10,-40 24,-10 20,40 Z" fill={S.body} {...sk(p)} />
          <ellipse cx="0" cy="-70" rx="34" ry="28" fill={S.body} {...sk(p)} />
          {[-12, 12].map((cx, i) => (
            <path key={i} d={`M${cx - 7},-74 q7,-6 14,0`} stroke={vec(p) ? '#10213A' : p.ink} strokeWidth="4" fill="none" strokeLinecap="round" />
          ))}
        </g>
      </g>
    );
  },
};

// ---------- เส้นเวลา 2 ปลาย (1,200 ปีก่อน → วันนี้) มีจุดตุมปังทั้งสองฝั่ง ----------
export const tpTimeline: AssetDef = {
  vb: [900, 300],
  draw: ({p, t}) => {
    const k = ease(t / 1.2);
    const col = vec(p) ? '#FBF6EC' : p.ink;
    const hi = vec(p) ? '#FFC94A' : p.gold;
    return (
      <g>
        <line x1="60" y1="150" x2={60 + 780 * k} y2="150" stroke={col} strokeWidth="10" strokeLinecap="round" />
        <path d={`M${60 + 780 * k - 24},126 L${60 + 780 * k + 6},150 L${60 + 780 * k - 24},174`} stroke={col} strokeWidth="10" fill="none" strokeLinecap="round" opacity={k} />
        <circle cx="60" cy="150" r="30" fill={hi} />
        <circle cx="840" cy="150" r={30 * ease((t - 1.0) / 0.4)} fill={hi} />
        {Array.from({length: 9}).map((_, i) => (
          <line key={i} x1={140 + i * 80} y1="134" x2={140 + i * 80} y2="166" stroke={col} strokeWidth="4" opacity={k > (i + 1) / 10 ? 0.6 : 0} />
        ))}
      </g>
    );
  },
};
