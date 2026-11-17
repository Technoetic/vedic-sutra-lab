import {messagesFor} from '../shared/labText.js';
import {diagramMessages} from './diagramMessages.js';
// Presentational diagrams. Arithmetic remains in the domain module.
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const format = value => Number.isFinite(Number(value)) ? String(Number(Number(value).toFixed(6))).replace('-', '−') : escape(value);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let sequence = 0;
const blue = 'var(--cobalt, #284eec)', pale = 'var(--cobalt-pale, #e8edff)', lime = 'var(--lime, #dcfa82)', ink = 'var(--ink, #20241e)', muted = 'var(--muted, #696e63)', line = 'var(--line, #dcded0)', paper = 'var(--paper, #f6f5ed)';
const text = (x, y, value, size = 18, attrs = '') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" ${attrs}>${escape(value)}</text>`;
const path = (d, color = blue, attrs = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" ${attrs}/>`;
const rect = (x, y, width, height, fill, attrs = '') => `<rect x="${x}" y="${y}" width="${Math.max(0,width)}" height="${Math.max(0,height)}" fill="${fill}" ${attrs}/>`;
const circle = (x,y,r=5,fill=blue) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
function figure(title, body, caption, height = 230, extra = '') {
  const id = `sutra-diagram-${++sequence}`;
  return `<figure class="diagram-figure"><svg viewBox="0 0 560 ${height}" role="img" aria-labelledby="${id}" xmlns="http://www.w3.org/2000/svg"><title id="${id}">${escape(title)}</title>${extra}${body}</svg><figcaption>${escape(caption)}</figcaption></figure>`;
}

function concat(d, t) {
  const left = number(d.left), right = String(d.right ?? '00').padStart(2,'0');
  const result = d.result ?? left * 100 + number(right);
  return figure(t('concatTitle'),
    text(167,28,t('hundredsGroup'),12,'class="diagram-label diagram-muted"') + text(389,28,t('lastTwo'),12,'class="diagram-label diagram-muted"') +
    rect(57,48,220,94,pale,'rx="7"') + rect(286,48,217,94,lime,'rx="7"') +
    text(167,113,format(left),57,'font-weight="700" class="diagram-primary"') + text(389,113,right,57,'font-weight="700"') +
    path('M280 62v66',muted,'stroke-width="1" stroke-dasharray="4 5"') +
    text(280,180,`${format(left)} × 100 + ${right} = ${format(result)}`,23,'font-weight="700"'),
    t('concatCaption'),203);
}

function complement(d, t) {
  const digits = Array.isArray(d.digits) ? d.digits.slice(0,3).map(v=>number(v)) : String(d.digits ?? '000').padStart(3,'0').slice(-3).split('').map(Number);
  while(digits.length<3)digits.unshift(0);
  const output = String(d.result ?? digits.map((v,i)=>(i===2?10:9)-v).join('')).padStart(3,'0');
  let body = '';
  digits.forEach((digit,index) => {
    const x = 100 + index*180;
    body += text(x,24,index===2?t('lastFromTen'):t('firstFromNine'),12,'class="diagram-label diagram-muted"') + rect(x-70,43,140,70,index===2?lime:pale,'rx="7"') + text(x,88,`${index===2?10:9} − ${digit}`,29,'font-weight="700"') + path(`M${x} 123v22m-5-5 5 5 5-5`,muted) + text(x,188,output[index] ?? '',38,'font-weight="700" class="diagram-primary"');
  });
  return figure(t('complementTitle', number(d.upper,1000), digits.join('')),body,t('complementCaption', number(d.upper,1000), digits.join(''), output),210);
}

function cross(d, t) {
  const a = number(d.a), b = number(d.b), at = Math.floor(a/10), au=a%10, bt=Math.floor(b/10), bu=b%10;
  const ones=number(d.ones,au*bu), tens=number(d.tens,at*bu+au*bt), hundreds=number(d.hundreds,at*bt);
  const carryOne = number(d.carry?.ones,Math.floor(ones/10)), carryTen = number(d.carry?.tens,Math.floor((tens+carryOne)/10));
  let body = text(70,37,`${a} × ${b}`,15,'class="diagram-muted"') + text(233,43,at,32,'font-weight="700"') + text(327,43,au,32,'font-weight="700"') + text(233,126,bt,32,'font-weight="700"') + text(327,126,bu,32,'font-weight="700"') + path('M233 54v43M327 54v43',muted,'stroke-width="2"') + path('M241 54 319 97M319 54 241 97',blue,'stroke-width="2.5"') + text(470,82,t('verticalCross'),12,'class="diagram-label diagram-muted"');
  const cells=[{x:100,label:t('leadingGroup'),calc:`${hundreds} + ${carryTen}`,value:hundreds+carryTen},{x:280,label:t('tens'),calc:`${tens} + ${carryOne}`,value:(tens+carryOne)%10},{x:460,label:t('ones'),calc:String(ones),value:ones%10}];
  for(const cell of cells) body += rect(cell.x-75,153,150,92,cell.x===280?pale:paper,`rx="7" stroke="${line}"`) + text(cell.x,175,cell.label,11,'class="diagram-label diagram-muted"') + text(cell.x,199,cell.calc,16,'class="diagram-muted"') + text(cell.x,230,cell.value,25,'font-weight="700" class="diagram-primary"');
  return figure(t('crossTitle', a, b),body,t('crossCaption', carryOne, carryTen, format(d.result ?? a*b)),260);
}

function balance(d, t) {
  const rows = Array.isArray(d.rows) ? d.rows : [];
  return `<figure class="diagram-figure"><ol class="diagram-balance">${rows.map((row,index)=>`<li><span class="diagram-order">${String(index+1).padStart(2,'0')}</span><span>${escape(row)}</span>${index<rows.length-1?'<span class="balance-next" aria-hidden="true">↓</span>':''}</li>`).join('')}</ol><figcaption>${escape(t('balanceCaption'))}</figcaption></figure>`;
}

function square(d, t) {
  const p=Math.max(0,number(d.p)), total=Math.max(.001,number(d.total,1)), side=number(d.side,Math.sqrt(total)), root=Math.max(0,number(d.positiveRoot,side-p));
  const size=202, strip=size*clamp(p/side,0,1), inner=size-strip, x=55,y=33;
  let body=rect(x,y,size,size,pale,`stroke="${blue}" stroke-width="1.5"`) + rect(x+inner,y,strip,inner,'#c4d0ff') + rect(x,y+inner,inner,strip,'#c4d0ff') + rect(x+inner,y+inner,strip,strip,lime) + path(`M${x+inner} ${y}v${size}M${x} ${y+inner}h${size}`,paper,'stroke-width="2"');
  if(inner>28)body+=text(x+inner/2,y+inner/2+7,'x²',Math.min(27,inner*.65),'font-weight="700" class="diagram-primary"');
  if(strip>28)body += text(x+inner+strip/2,y+inner+strip/2+5,'p²',17,'font-weight="700"');
  if(inner>35&&strip>17)body += text(x+inner+strip/2,y+inner/2+5,'px',14) + text(x+inner/2,y+inner+strip/2+5,'px',14);
  body += text(x+inner/2,20,'x',13,'class="diagram-primary"') + text(x+inner+strip/2,20,`p = ${p}`,12) + text(400,82,t('fillCorner'),13,'class="diagram-label diagram-muted"') + text(400,121,`(x + ${p})²`,32,'font-weight="700" class="diagram-primary"') + text(400,162,`= ${format(total)}`,32,'font-weight="700"') + text(400,205,`x ≈ ${format(root)}`,18,'class="diagram-muted"');
  return figure(t('squareTitle'),body,t('squareCaption', p, p*p, format(total)),251);
}

function growth(d, t) {
  const x=number(d.x,3), h=number(d.h,.1), q=x+h;
  const low=Math.min(0,x,q), high=Math.max(0,x,q), spread=Math.max(3,high-low), minX=low-spread*.07, maxX=high+spread*.20;
  const maxY=Math.max(1,minX*minX,maxX*maxX)*1.03, left=42,top=24,width=474,height=198;
  const px=v=>left+(v-minX)/(maxX-minX)*width, py=v=>top+height-v/maxY*height;
  let curve='';for(let i=0;i<=90;i++){const t=minX+(maxX-minX)*i/90;curve+=`${i?'L':'M'}${px(t).toFixed(2)} ${py(t*t).toFixed(2)} `;}
  const m=number(d.averageRate,2*x+h), tangent=number(d.instantRate,2*x), clip=`growth-clip-${sequence+1}`;
  let body='';
  for(let i=1;i<5;i++)body+=path(`M${left} ${top+height*i/5}h${width}`,line,'stroke-width=".7"');
  body += path(`M${left} ${py(0)}h${width}M${px(0)} ${top}v${height}`,muted,'stroke-width="1"') + text(505,239,'x',13,'class="diagram-muted"') + text(70,18,'f(x) = x²',13,'class="diagram-primary"') + `<g clip-path="url(#${clip})">` + path(curve,blue,'stroke-width="3"') + path(`M${px(minX)} ${py(tangent*(minX-x)+x*x)}L${px(maxX)} ${py(tangent*(maxX-x)+x*x)}`,ink,'stroke-width="1.8" stroke-dasharray="6 4"') + path(`M${px(minX)} ${py(m*(minX-x)+x*x)}L${px(maxX)} ${py(m*(maxX-x)+x*x)}`,'#7d9940','stroke-width="2.5"') + '</g>' + path(`M${px(x)} ${py(x*x)}V${py(0)}M${px(q)} ${py(q*q)}V${py(0)}`,muted,'stroke-width="1" stroke-dasharray="3 4"') + circle(px(x),py(x*x),4.5,ink) + circle(px(q),py(q*q),4.5,'#718e34') + text(px(x)-12,py(x*x)-10,'P',12,'font-weight="700"') + text(px(q)+12,py(q*q)-10,'Q',12,'font-weight="700"') + text(280,245,`P: x = ${format(x)}    Q: x + h = ${format(q)}`,12,'class="diagram-muted"') + path('M70 272h22',ink,'stroke-dasharray="5 3"') + text(195,276,t('tangentSlope', format(tangent)),12,'class="diagram-label"') + path('M310 272h22','#7d9940','stroke-width="2.5"') + text(425,276,t('secantSlope', format(m)),12,'class="diagram-label"');
  return figure(t('growthTitle'),body,t('growthCaption', format(h), format(m), format(tangent)),293,`<defs><clipPath id="${clip}">${rect(left,top,width,height,'white')}</clipPath></defs>`);
}

function symmetric(d, t) {
  const x=number(d.x,3), gap=Math.abs(number(d.gap,1)), a=number(d.left,x-gap), b=number(d.right,x+gap), maxSide=Math.max(Math.abs(a),Math.abs(b),1), unit=124/maxSide, aSize=Math.abs(a)*unit, bSize=Math.abs(b)*unit;
  let body=path('M75 38h410',muted,'stroke-width="1"');
  [a,x,b].forEach((value,i)=>{const at=90+i*190;body+=circle(at,38,5,i===1?ink:blue)+text(at,21,format(value),15,'font-weight="700"');});
  body += text(185,65,`+ ${gap}`,12,'class="diagram-muted"') + text(375,65,`+ ${gap}`,12,'class="diagram-muted"') + rect(142-aSize/2,225-aSize,aSize,aSize,pale,`stroke="${blue}" stroke-width="1"`) + rect(418-bSize/2,225-bSize,bSize,bSize,lime,`stroke="${muted}" stroke-width="1"`) + text(280,169,'+',30,'class="diagram-muted"') + text(142,248,`(${format(a)})² = ${format(a*a)}`,18,'font-weight="700" class="diagram-primary"') + text(418,248,`(${format(b)})² = ${format(b*b)}`,18,'font-weight="700"');
  if(aSize===0)body+=circle(142,225,3,blue);
  return figure(t('symmetricTitle'),body,t('symmetricCaption', format(d.result ?? a*a+b*b), format(x), format(gap)),267);
}

function remainders(d, t) {
  const digits=Array.isArray(d.digits)?d.digits:[], remainders=Array.isArray(d.remainders)?d.remainders:[], products=Array.isArray(d.products)?d.products:[], m=number(d.multiplier);
  return `<figure class="diagram-figure"><div class="remainder-intro"><span>1 / ${escape(d.denominator)}</span><strong>0.<span class="repetend">${digits.map(escape).join('')}</span>…</strong></div><ol class="remainder-grid">${digits.map((digit,index)=>`<li><small>${escape(t('remainderIndex', String(index+1).padStart(2,'0')))}</small><b>${escape(digit)}</b><span>${escape(t('remainderValue', remainders[index]))}</span><span>${escape(remainders[index])} × ${m}</span><strong>${escape(products[index])}</strong></li>`).join('')}</ol><figcaption>${escape(t('remainderCaption', m))}</figcaption></figure>`;
}

function progression(d, t) {
  const labels=Array.isArray(d.labels)?d.labels.slice(0,4):[], values=Array.isArray(d.values)?d.values.slice(0,4):[], delta=number(d.delta,1);
  let body=path('M45 84h470',muted,'stroke-width="1"');
  for(let i=0;i<4;i++){const x=70+i*140;body+=circle(x,84,6,i===3?ink:blue)+text(x,122,['A','B','C','D'][i],14,'font-weight="700"')+text(x,151,labels[i]??'',14,'class="diagram-primary"')+text(x,180,values[i]??'',16,'font-weight="700"');if(i<3)body+=path(`M${x+8} 58h124m-5-4 5 4-5 4`,muted,'stroke-width="1"')+text(x+70,41,`+ ${delta}`,13,'class="diagram-muted"');}
  return figure(t('progressionTitle'),body,t('progressionCaption', delta, d.x),202);
}

function check(d, t) {
  const firstLeft=number(d.left),firstRight=number(d.right),secondLeft=number(d.secondLeft),secondRight=number(d.secondRight), max=Math.max(firstLeft,firstRight,secondLeft,secondRight,1);
  let body='';
  [[firstLeft,firstRight,t('atOne')],[secondLeft,secondRight,t('atTwo')]].forEach(([a,b,label],i)=>{
    const y=31+i*113;
    body+=text(70,y+22,label,13,'class="diagram-label diagram-muted"') + rect(143,y,260*a/max,25,pale,'rx="3"')+rect(143,y+37,260*b/max,25,a===b?lime:'#f1b69e','rx="3"') + text(125,y+18,t('left'),11,'class="diagram-label diagram-muted"')+text(125,y+55,t('right'),11,'class="diagram-label diagram-muted"')+text(455,y+20,format(a),17,'font-weight="700"')+text(455,y+57,format(b),17,'font-weight="700"')+text(510,y+40,a===b?'=':'≠',28,`font-weight="700" fill="${a===b?blue:'#a33627'}"`);
  });
  return figure(t('compareTitle'),body,d.mode==='sameSumError'?t('mismatchAtTwo'):d.match?t('matchAtBoth'):t('differentValues'),245);
}

function rectangle(d, t) {
  const width=Math.max(.01,number(d.width,3)),height=Math.max(.01,number(d.height,4)),unit=Math.min(278/(width+1),187/(height+1)),w=width*unit,h=height*unit,x=54,y=36;
  let body=rect(x,y,w,h,pale,`stroke="${blue}" stroke-width="1"`) + rect(x+w,y,unit,h,lime,`stroke="${paper}" stroke-width="1"`) + rect(x,y+h,w,unit,lime,`stroke="${paper}" stroke-width="1"`) + rect(x+w,y+h,unit,unit,'#badc62',`stroke="${paper}" stroke-width="1"`) + text(x+w/2,y-12,t('width', format(width)),12,'class="diagram-label diagram-primary"') + `<text x="${x-18}" y="${y+h/2}" transform="rotate(-90 ${x-18} ${y+h/2})" text-anchor="middle" font-size="12" class="diagram-label diagram-primary">${escape(t('height', format(height)))}</text>` + text(x+w+unit/2,y-12,'+1',11,'class="diagram-muted"') + text(x+w/2,y+h+unit+21,t('strips'),11,'class="diagram-label diagram-muted"') + text(440,73,t('instantRate'),12,'class="diagram-label diagram-muted"') + text(440,111,format(d.rate ?? width+height),37,'font-weight="700" class="diagram-primary"') + text(440,147,`${format(width)} + ${format(height)}`,14,'class="diagram-muted"') + path('M375 164h130',line,'stroke-width="1"') + text(440,194,t('unitIncrease'),12,'class="diagram-label diagram-muted"') + text(440,226,format(d.finiteIncrement ?? width+height+1),26,'font-weight="700"');
  return figure(t('rectangleTitle'),body,t('rectangleCaption', format(width), format(height), format(d.finiteIncrement ?? width+height+1), format(d.rate ?? width+height)),270);
}

const renderers={concat,complement,cross,balance,square,growth,symmetric,remainders,progression,check,rectangle};
export function renderDiagram(diagram, language = 'ko') {
  const t = messagesFor(diagramMessages, language);
  if(!diagram || typeof diagram!=='object')return `<p class="diagram-fallback">${escape(t('noDiagram'))}</p>`;
  const renderer=Object.hasOwn(renderers,diagram.kind)?renderers[diagram.kind]:null;
  return renderer?renderer(diagram, t):`<p class="diagram-fallback">${escape(t('otherDiagram'))}</p>`;
}
