import React from 'react';
import {Img, staticFile} from 'remotion';
import {useImages, ImageInfo} from '../format';
import {Defs} from './core';
import {ASSETS} from './index';
import {palFor} from './palette';
import {FONT} from '../theme/tokens';

// asset ที่เป็นฉากเต็ม/เอฟเฟกต์ ไม่ต้องตัดขอบกระดาษ
export const NO_CUT = new Set(['sky', 'bg-color', 'paper-bg', 'dust', 'leaves-fg', 'window-frame', 'marker-circle', 'arrow', 'stamp', 'sea', 'mountains', 'city', 'plantation', 'tp-forest-far', 'tp-leaves-fg', 'tp-forest-top', 'tp-soil-top', 'km-stairs', 'km-mist-sea', 'km-clouds-fg']);

/** "img:<id>" หรือ "img:<id>|<vector-fallback>" — fallback ใช้จนกว่าจะเลือกรูป AI (ไม่มีกล่องเหลืองระหว่างรอ) */
export const parseImg = (name: string) => {
  if (!name.startsWith('img:')) return null;
  const [id, fallback] = name.slice(4).split('|');
  return {id, fallback: fallback || null};
};

let uidN = 0;
export const Asset: React.FC<{name: string; style?: 'vector' | 'collage'; t: number; dur: number; props?: Record<string, unknown>; width: number}> = ({name: name0, style = 'vector', t, dur, props = {}, width}) => {
  let name = name0;
  const uid = React.useMemo(() => `a${uidN++}`, []);
  const images = useImages();
  // รูปจาก AI: "img:<id>" (rule 04/10) — collage/era ใช้ filter ของ Stage/EraTexture เหมือน vector
  const pi = parseImg(name);
  if (pi) {
    const im = images[pi.id];
    if (im) {
      const vintage = style === 'collage' ? {filter: 'sepia(0.35) saturate(0.85) contrast(1.05)'} : {};
      return <Img src={staticFile(im.src)} style={{width, height: width * im.aspect, display: 'block', objectFit: 'cover', ...vintage}} />;
    }
    if (pi.fallback) name = pi.fallback;
  }
  const def = ASSETS[name];
  if (!def) {
    // placeholder (rule 00): กล่องสี + ชื่อ
    return (
      <div style={{width, height: width * 0.6, borderRadius: 24, background: 'rgba(255,201,74,0.2)', border: '4px dashed #FFC94A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFC94A', fontFamily: FONT.body, fontSize: Math.max(18, width / 12)}}>
        {name.replace('placeholder:', '')}
      </div>
    );
  }
  const p = palFor(style);
  const [vw, vh] = def.vb;
  return (
    <svg width={width} height={(width * vh) / vw} viewBox={`0 0 ${vw} ${vh}`} style={{overflow: 'visible', display: 'block'}}>
      <Defs p={p} uid={uid} />
      <g>{def.draw({p, t, dur, props: props as Record<string, any>, uid})}</g>
    </svg>
  );
};

export const assetAspect = (name0: string, images: Record<string, ImageInfo> = {}) => {
  let name = name0;
  const pi = parseImg(name);
  if (pi) {
    if (images[pi.id]) return images[pi.id].aspect;
    if (!pi.fallback) return 0.6;
    name = pi.fallback;
  }
  const d = ASSETS[name];
  return d ? d.vb[1] / d.vb[0] : 0.6;
};
