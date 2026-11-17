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

function concat(d) {
  const left = number(d.left), right = String(d.right ?? '00').padStart(2,'0');
  const result = d.result ?? left * 100 + number(right);
  return figure('백의 자리 묶음과 끝 두 자리의 자리값',
    text(167,28,'앞부분 · 100배',12,'class="diagram-label diagram-muted"') + text(389,28,'뒷부분 · 두 자리',12,'class="diagram-label diagram-muted"') +
    rect(57,48,220,94,pale,'rx="7"') + rect(286,48,217,94,lime,'rx="7"') +
    text(167,113,format(left),57,'font-weight="700" class="diagram-primary"') + text(389,113,right,57,'font-weight="700"') +
    path('M280 62v66',muted,'stroke-width="1" stroke-dasharray="4 5"') +
    text(280,180,`${format(left)} × 100 + ${right} = ${format(result)}`,23,'font-weight="700"'),
    '세로선은 자리의 경계예요. 뒷부분이 한 자리여도 앞의 0을 지켜 두 자리로 붙입니다.',203);
}

function complement(d) {
  const digits = Array.isArray(d.digits) ? d.digits.slice(0,3).map(v=>number(v)) : String(d.digits ?? '000').padStart(3,'0').slice(-3).split('').map(Number);
  while(digits.length<3)digits.unshift(0);
  const output = String(d.result ?? digits.map((v,i)=>(i===2?10:9)-v).join('')).padStart(3,'0');
  let body = '';
  digits.forEach((digit,index) => {
    const x = 100 + index*180;
    body += text(x,24,index===2?'마지막은 10에서':'앞자리는 9에서',12,'class="diagram-label diagram-muted"') + rect(x-70,43,140,70,index===2?lime:pale,'rx="7"') + text(x,88,`${index===2?10:9} − ${digit}`,29,'font-weight="700"') + path(`M${x} 123v22m-5-5 5 5 5-5`,muted) + text(x,188,output[index] ?? '',38,'font-weight="700" class="diagram-primary"');
  });
  return figure(`${number(d.upper,1000)}에서 ${digits.join('')} 빼기`,body,`${number(d.upper,1000)} − ${digits.join('')} = ${output}. 앞의 두 자리는 9에서, 마지막 자리는 10에서 빼요.`,210);
}

function cross(d) {
  const a = number(d.a), b = number(d.b), at = Math.floor(a/10), au=a%10, bt=Math.floor(b/10), bu=b%10;
  const ones=number(d.ones,au*bu), tens=number(d.tens,at*bu+au*bt), hundreds=number(d.hundreds,at*bt);
  const carryOne = number(d.carry?.ones,Math.floor(ones/10)), carryTen = number(d.carry?.tens,Math.floor((tens+carryOne)/10));
  let body = text(70,37,`${a} × ${b}`,15,'class="diagram-muted"') + text(233,43,at,32,'font-weight="700"') + text(327,43,au,32,'font-weight="700"') + text(233,126,bt,32,'font-weight="700"') + text(327,126,bu,32,'font-weight="700"') + path('M233 54v43M327 54v43',muted,'stroke-width="2"') + path('M241 54 319 97M319 54 241 97',blue,'stroke-width="2.5"') + text(470,82,'세로 × 가로',12,'class="diagram-label diagram-muted"');
  const cells=[{x:100,label:'앞자리',calc:`${hundreds} + ${carryTen}`,value:hundreds+carryTen},{x:280,label:'십의 자리',calc:`${tens} + ${carryOne}`,value:(tens+carryOne)%10},{x:460,label:'일의 자리',calc:String(ones),value:ones%10}];
  for(const cell of cells) body += rect(cell.x-75,153,150,92,cell.x===280?pale:paper,`rx="7" stroke="${line}"`) + text(cell.x,175,cell.label,11,'class="diagram-label diagram-muted"') + text(cell.x,199,cell.calc,16,'class="diagram-muted"') + text(cell.x,230,cell.value,25,'font-weight="700" class="diagram-primary"');
  return figure(`${a} 곱하기 ${b}: 세로 곱과 대각선 곱, 올림`,body,`오른쪽부터 계산해요. 일의 자리에서 ${carryOne}, 십의 자리에서 ${carryTen}을 올리면 ${format(d.result ?? a*b)}이 됩니다.`,260);
}

function balance(d) {
  const rows = Array.isArray(d.rows) ? d.rows : [];
  return `<figure class="diagram-figure"><ol class="diagram-balance">${rows.map((row,index)=>`<li><span class="diagram-order">${String(index+1).padStart(2,'0')}</span><span>${escape(row)}</span>${index<rows.length-1?'<span class="balance-next" aria-hidden="true">↓</span>':''}</li>`).join('')}</ol><figcaption>식을 위에서 아래로 비교하며, 같은 항을 묶고 정리해 보세요.</figcaption></figure>`;
}

function square(d) {
  const p=Math.max(0,number(d.p)), total=Math.max(.001,number(d.total,1)), side=number(d.side,Math.sqrt(total)), root=Math.max(0,number(d.positiveRoot,side-p));
  const size=202, strip=size*clamp(p/side,0,1), inner=size-strip, x=55,y=33;
  let body=rect(x,y,size,size,pale,`stroke="${blue}" stroke-width="1.5"`) + rect(x+inner,y,strip,inner,'#c4d0ff') + rect(x,y+inner,inner,strip,'#c4d0ff') + rect(x+inner,y+inner,strip,strip,lime) + path(`M${x+inner} ${y}v${size}M${x} ${y+inner}h${size}`,paper,'stroke-width="2"');
  if(inner>28)body+=text(x+inner/2,y+inner/2+7,'x²',Math.min(27,inner*.65),'font-weight="700" class="diagram-primary"');
  if(strip>28)body += text(x+inner+strip/2,y+inner+strip/2+5,'p²',17,'font-weight="700"');
  if(inner>35&&strip>17)body += text(x+inner+strip/2,y+inner/2+5,'px',14) + text(x+inner/2,y+inner+strip/2+5,'px',14);
  body += text(x+inner/2,20,'x',13,'class="diagram-primary"') + text(x+inner+strip/2,20,`p = ${p}`,12) + text(400,82,'빈 모서리를 채우면',13,'class="diagram-label diagram-muted"') + text(400,121,`(x + ${p})²`,32,'font-weight="700" class="diagram-primary"') + text(400,162,`= ${format(total)}`,32,'font-weight="700"') + text(400,205,`x ≈ ${format(root)}`,18,'class="diagram-muted"');
  return figure('빈 모서리에 p제곱을 더하는 완전제곱 도형',body,`띠의 폭 p = ${p}. 모서리에 ${p*p}을 채우면 넓이가 ${format(total)}인 정사각형이 돼요. 도형은 양수인 해를 나타냅니다.`,251);
}

function growth(d) {
  const x=number(d.x,3), h=number(d.h,.1), q=x+h;
  const low=Math.min(0,x,q), high=Math.max(0,x,q), spread=Math.max(3,high-low), minX=low-spread*.07, maxX=high+spread*.20;
  const maxY=Math.max(1,minX*minX,maxX*maxX)*1.03, left=42,top=24,width=474,height=198;
  const px=v=>left+(v-minX)/(maxX-minX)*width, py=v=>top+height-v/maxY*height;
  let curve='';for(let i=0;i<=90;i++){const t=minX+(maxX-minX)*i/90;curve+=`${i?'L':'M'}${px(t).toFixed(2)} ${py(t*t).toFixed(2)} `;}
  const m=number(d.averageRate,2*x+h), tangent=number(d.instantRate,2*x), clip=`growth-clip-${sequence+1}`;
  let body='';
  for(let i=1;i<5;i++)body+=path(`M${left} ${top+height*i/5}h${width}`,line,'stroke-width=".7"');
  body += path(`M${left} ${py(0)}h${width}M${px(0)} ${top}v${height}`,muted,'stroke-width="1"') + text(505,239,'x',13,'class="diagram-muted"') + text(70,18,'f(x) = x²',13,'class="diagram-primary"') + `<g clip-path="url(#${clip})">` + path(curve,blue,'stroke-width="3"') + path(`M${px(minX)} ${py(tangent*(minX-x)+x*x)}L${px(maxX)} ${py(tangent*(maxX-x)+x*x)}`,ink,'stroke-width="1.8" stroke-dasharray="6 4"') + path(`M${px(minX)} ${py(m*(minX-x)+x*x)}L${px(maxX)} ${py(m*(maxX-x)+x*x)}`,'#7d9940','stroke-width="2.5"') + '</g>' + path(`M${px(x)} ${py(x*x)}V${py(0)}M${px(q)} ${py(q*q)}V${py(0)}`,muted,'stroke-width="1" stroke-dasharray="3 4"') + circle(px(x),py(x*x),4.5,ink) + circle(px(q),py(q*q),4.5,'#718e34') + text(px(x)-12,py(x*x)-10,'P',12,'font-weight="700"') + text(px(q)+12,py(q*q)-10,'Q',12,'font-weight="700"') + text(280,245,`P: x = ${format(x)}    Q: x + h = ${format(q)}`,12,'class="diagram-muted"') + path('M70 272h22',ink,'stroke-dasharray="5 3"') + text(195,276,`접선 기울기 ${format(tangent)}`,12,'class="diagram-label"') + path('M310 272h22','#7d9940','stroke-width="2.5"') + text(425,276,`구간 기울기 ${format(m)}`,12,'class="diagram-label"');
  return figure('실제 좌표에 그린 포물선 x제곱과 접선, 두 점을 잇는 할선',body,`h = ${format(h)}일 때 두 점 사이의 구간 변화율은 ${format(m)}, 출발점의 순간 변화율은 ${format(tangent)}입니다.`,293,`<defs><clipPath id="${clip}">${rect(left,top,width,height,'white')}</clipPath></defs>`);
}

function symmetric(d) {
  const x=number(d.x,3), gap=Math.abs(number(d.gap,1)), a=number(d.left,x-gap), b=number(d.right,x+gap), maxSide=Math.max(Math.abs(a),Math.abs(b),1), unit=124/maxSide, aSize=Math.abs(a)*unit, bSize=Math.abs(b)*unit;
  let body=path('M75 38h410',muted,'stroke-width="1"');
  [a,x,b].forEach((value,i)=>{const at=90+i*190;body+=circle(at,38,5,i===1?ink:blue)+text(at,21,format(value),15,'font-weight="700"');});
  body += text(185,65,`+ ${gap}`,12,'class="diagram-muted"') + text(375,65,`+ ${gap}`,12,'class="diagram-muted"') + rect(142-aSize/2,225-aSize,aSize,aSize,pale,`stroke="${blue}" stroke-width="1"`) + rect(418-bSize/2,225-bSize,bSize,bSize,lime,`stroke="${muted}" stroke-width="1"`) + text(280,169,'+',30,'class="diagram-muted"') + text(142,248,`(${format(a)})² = ${format(a*a)}`,18,'font-weight="700" class="diagram-primary"') + text(418,248,`(${format(b)})² = ${format(b*b)}`,18,'font-weight="700"');
  if(aSize===0)body+=circle(142,225,3,blue);
  return figure('가운데 수에서 같은 간격으로 떨어진 두 수의 제곱',body,`두 정사각형의 넓이를 더하면 ${format(d.result ?? a*a+b*b)}. 반대 부호의 항이 사라져 2 × ${format(x)}² + 2 × ${format(gap)}²가 됩니다. 음수의 제곱도 넓이는 양수예요.`,267);
}

function remainders(d) {
  const digits=Array.isArray(d.digits)?d.digits:[], remainders=Array.isArray(d.remainders)?d.remainders:[], products=Array.isArray(d.products)?d.products:[], m=number(d.multiplier);
  return `<figure class="diagram-figure"><div class="remainder-intro"><span>1 / ${escape(d.denominator)}</span><strong>0.<span class="repetend">${digits.map(escape).join('')}</span>…</strong></div><ol class="remainder-grid">${digits.map((digit,index)=>`<li><small>${String(index+1).padStart(2,'0')}번째</small><b>${escape(digit)}</b><span>나머지 ${escape(remainders[index])}</span><span>${escape(remainders[index])} × ${m}</span><strong>${escape(products[index])}</strong></li>`).join('')}</ol><figcaption>몫 한 자리를 얻은 직후의 나머지에 순환마디의 끝자리 ${m}을 곱해요. 각 곱의 일의 자리가 위의 소수 자릿수와 일치합니다.</figcaption></figure>`;
}

function progression(d) {
  const labels=Array.isArray(d.labels)?d.labels.slice(0,4):[], values=Array.isArray(d.values)?d.values.slice(0,4):[], delta=number(d.delta,1);
  let body=path('M45 84h470',muted,'stroke-width="1"');
  for(let i=0;i<4;i++){const x=70+i*140;body+=circle(x,84,6,i===3?ink:blue)+text(x,122,['A','B','C','D'][i],14,'font-weight="700"')+text(x,151,labels[i]??'',14,'class="diagram-primary"')+text(x,180,values[i]??'',16,'font-weight="700"');if(i<3)body+=path(`M${x+8} 58h124m-5-4 5 4-5 4`,muted,'stroke-width="1"')+text(x+70,41,`+ ${delta}`,13,'class="diagram-muted"');}
  return figure('공차가 같은 네 항의 등차수열',body,`이웃한 항의 차이는 모두 ${delta}입니다. x = ${escape(d.x)}를 넣은 네 값이 아래에 표시되어 있어요.`,202);
}

function check(d) {
  const firstLeft=number(d.left),firstRight=number(d.right),secondLeft=number(d.secondLeft),secondRight=number(d.secondRight), max=Math.max(firstLeft,firstRight,secondLeft,secondRight,1);
  let body='';
  [[firstLeft,firstRight,'x = 1에서'],[secondLeft,secondRight,'x = 2에서']].forEach(([a,b,label],i)=>{
    const y=31+i*113;
    body+=text(70,y+22,label,13,'class="diagram-label diagram-muted"') + rect(143,y,260*a/max,25,pale,'rx="3"')+rect(143,y+37,260*b/max,25,a===b?lime:'#f1b69e','rx="3"') + text(125,y+18,'좌',11,'class="diagram-label diagram-muted"')+text(125,y+55,'우',11,'class="diagram-label diagram-muted"')+text(455,y+20,format(a),17,'font-weight="700"')+text(455,y+57,format(b),17,'font-weight="700"')+text(510,y+40,a===b?'=':'≠',28,`font-weight="700" fill="${a===b?blue:'#a33627'}"`);
  });
  return figure('x에 1과 2를 대입해 양쪽 값을 비교하는 막대',body,d.mode==='sameSumError'?'x = 1에서는 같아도 x = 2에서는 달라요. 한 값에서의 일치는 항등식의 증명이 아닙니다.':d.match?'두 점의 값이 일치해요. 이 점검을 통과해도 모든 x에서 같다는 증명은 따로 필요합니다.':'양쪽 값이 다르면 같은 다항식일 수 없어요. 값이 다른 한 점만으로도 오류를 찾을 수 있습니다.',245);
}

function rectangle(d) {
  const width=Math.max(.01,number(d.width,3)),height=Math.max(.01,number(d.height,4)),unit=Math.min(278/(width+1),187/(height+1)),w=width*unit,h=height*unit,x=54,y=36;
  let body=rect(x,y,w,h,pale,`stroke="${blue}" stroke-width="1"`) + rect(x+w,y,unit,h,lime,`stroke="${paper}" stroke-width="1"`) + rect(x,y+h,w,unit,lime,`stroke="${paper}" stroke-width="1"`) + rect(x+w,y+h,unit,unit,'#badc62',`stroke="${paper}" stroke-width="1"`) + text(x+w/2,y-12,`가로 ${format(width)}`,12,'class="diagram-label diagram-primary"') + `<text x="${x-18}" y="${y+h/2}" transform="rotate(-90 ${x-18} ${y+h/2})" text-anchor="middle" font-size="12" class="diagram-label diagram-primary">세로 ${format(height)}</text>` + text(x+w+unit/2,y-12,'+1',11,'class="diagram-muted"') + text(x+w/2,y+h+unit+21,'+1씩 늘어난 두 띠와 작은 모서리',11,'class="diagram-label diagram-muted"') + text(440,73,'순간 변화율',12,'class="diagram-label diagram-muted"') + text(440,111,format(d.rate ?? width+height),37,'font-weight="700" class="diagram-primary"') + text(440,147,`${format(width)} + ${format(height)}`,14,'class="diagram-muted"') + path('M375 164h130',line,'stroke-width="1"') + text(440,194,'1만큼 늘린 넓이 차',12,'class="diagram-label diagram-muted"') + text(440,226,format(d.finiteIncrement ?? width+height+1),26,'font-weight="700"');
  return figure('두 변을 같은 길이만큼 늘린 직사각형의 실제 비율 도형',body,`현재 가로 ${format(width)}, 세로 ${format(height)}. 두 변을 1씩 늘린 넓이 차는 ${format(d.finiteIncrement ?? width+height+1)}이고, 순간 변화율 ${format(d.rate ?? width+height)}과는 모서리 1만큼 달라요.`,270);
}

const renderers={concat,complement,cross,balance,square,growth,symmetric,remainders,progression,check,rectangle};
export function renderDiagram(diagram) {
  if(!diagram || typeof diagram!=='object')return '<p class="diagram-fallback">계산 단계를 따라 패턴을 살펴보세요.</p>';
  const renderer=Object.hasOwn(renderers,diagram.kind)?renderers[diagram.kind]:null;
  return renderer?renderer(diagram):'<p class="diagram-fallback">이 규칙은 아래의 식과 계산 단계로 살펴볼 수 있어요.</p>';
}
