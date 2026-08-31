/* Where in the frame did a flagged pair actually change? A teleporting
   band shows as one tight region moving; ordinary motion is spread over
   the object. */
import { readFileSync } from 'node:fs';
import { launch } from '../../test/browser/support/chrome.mjs';
const [dir, idx] = [process.argv[2], +process.argv[3]];
const b64 = JSON.parse(readFileSync(`qa/p82/${dir}/frames.b64.json`, 'utf8'));
const b = await launch({ width: 900, height: 600 });
try {
  await b.goto('about:blank', 300);
  const grid = await b.eval(`(async () => {
    const load = async (s) => createImageBitmap(await (await fetch('data:image/jpeg;base64,'+s)).blob());
    const A = await load(${JSON.stringify(b64[idx - 1])}), B = await load(${JSON.stringify(b64[idx])});
    const W=160, H=Math.round(A.height/A.width*160);
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(A,0,0,W,H); const a=x.getImageData(0,0,W,H).data;
    x.drawImage(B,0,0,W,H); const bb=x.getImageData(0,0,W,H).data;
    const CO=10, RO=6, cell=[];
    for(let r=0;r<RO;r++){ const row=[];
      for(let cc=0;cc<CO;cc++){ let s=0,n=0;
        for(let y=Math.floor(r*H/RO); y<Math.floor((r+1)*H/RO); y++)
          for(let xx=Math.floor(cc*W/CO); xx<Math.floor((cc+1)*W/CO); xx++){
            const i=(y*W+xx)*4; s+=Math.abs(a[i]-bb[i]); n++; }
        row.push(+(s/n).toFixed(2)); }
      cell.push(row); }
    return JSON.stringify(cell);
  })()`);
  const cells = JSON.parse(grid);
  console.log(`${dir} frame ${idx - 1} → ${idx}: mean |Δ| per cell (10 x 6 over the viewport)`);
  for (const row of cells) console.log('  ' + row.map((v) => String(v).padStart(7)).join(''));
  const flat = cells.flat().sort((x, y) => y - x);
  console.log(`  hottest ${flat[0]}  median ${flat[flat.length >> 1]}  → concentration ${(flat[0] / (flat[flat.length >> 1] || 0.01)).toFixed(1)}x`);
} finally { await b.close(); }
