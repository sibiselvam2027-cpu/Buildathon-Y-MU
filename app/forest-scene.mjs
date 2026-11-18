import {forestLevelMax} from './forest-growth.mjs';

const colors = {
  soil:'#946c54', soilShade:'#765644', lightSoil:'#b58e70',
  grass:'#86aa55', moss:'#76964b', fresh:'#9cbb60', shadow:'#5c743e',
  concrete:'#cdc0a9', stone:'#afaa96', cream:'#e5dac3',
  asphalt:'#4a524f', darkRoad:'#404a46', lightRoad:'#58615b',
  lane:'#e6debd', trail:'#d2c399', bark:'#8f6540',
  leaf:'#66923e', bright:'#8eaf54', tip:'#b3ca69', pine:'#497451'
};

const columnX=[11.1,13.55,15.95];
const plots=Array.from({length:forestLevelMax},(_,index)=>[
  columnX[index%columnX.length],1.65+Math.floor(index/columnX.length)*1.87
]);

const forestClamp = (value,min,max) => Math.min(max,Math.max(min,value));
const brightnessCache = new Map();

function forestShade(hex,multiplier) {
  const key=hex+multiplier;
  if (!brightnessCache.has(key)) {
    const value=parseInt(hex.slice(1),16);
    const parts=[value>>16,(value>>8)&255,value&255].map(part=>forestClamp(Math.round(part*multiplier),0,255));
    brightnessCache.set(key,'#'+parts.map(part=>part.toString(16).padStart(2,'0')).join(''));
  }
  return brightnessCache.get(key);
}

function makeGeometry(camera,growth,active,vehicle) {
  const faces=[];
  let foundation=true;
  const polygon=(points,color,bias=0)=>faces.push({points,color,bias,foundation});
  const {cx,cy}=camera;
  function block(x,y,z,w,d,h,color) {
    tile(x,y,z+h,w,d,color,0);
    const sideX=cx>=0?x+w:x;
    const sideY=cy>=0?y+d:y;
    const nx=Math.ceil(w/1.7);
    const ny=Math.ceil(d/1.7);
    const nz=Math.ceil(h/1.7);
    const toneX=forestShade(color,.81);
    const toneY=forestShade(color,.65);
    for (let j=0;j<nz;j++) {
      const base=z+h*j/nz, top=z+h*(j+1)/nz;
      for (let i=0;i<ny;i++) {
        const start=y+d*i/ny, end=y+d*(i+1)/ny;
        polygon([[sideX,start,base],[sideX,end,base],[sideX,end,top],[sideX,start,top]],toneX);
      }
      for (let i=0;i<nx;i++) {
        const start=x+w*i/nx, end=x+w*(i+1)/nx;
        polygon([[start,sideY,base],[end,sideY,base],[end,sideY,top],[start,sideY,top]],toneY);
      }
    }
  }
  function tile(x,y,z,w,d,color,bias=.008) {
    const nx=Math.ceil(w/1.7);
    const ny=Math.ceil(d/1.7);
    for (let i=0;i<nx;i++) {
      const start=x+w*i/nx, end=x+w*(i+1)/nx;
      for (let j=0;j<ny;j++) {
        const left=y+d*j/ny, right=y+d*(j+1)/ny;
        polygon([[start,left,z],[end,left,z],[end,right,z],[start,right,z]],color,bias);
      }
    }
  }
  function marking(x,y,z,w,d,color=colors.lane) {
    tile(x,y,z,w,d,color,.032);
  }
  function crosswalk(x,y,z) {
    for (let step=0;step<5;step++) marking(x+step*.23,y,z,.112,.76);
  }
  function shrub(x,y,z,scale,color=colors.bright) {
    block(x-.22*scale,y-.22*scale,z,.44*scale,.44*scale,.29*scale,color);
    block(x-.13*scale,y-.13*scale,z+.29*scale,.26*scale,.26*scale,.15*scale,forestShade(color,1.12));
  }
  function tree(x,y,z,growthAmount,variant) {
    if (growthAmount<=0) return;
    const size=.22+.78*growthAmount;
    block(x-.12*size,y-.12*size,z,.24*size,.24*size,1.12*size,colors.bark);
    if (variant%3===1) {
      const layers=[[.82,.93,.24],[.55,1.16,.27],[.32,1.42,.23],[.15,1.65,.22]];
      for (const [diameter,height,layer] of layers) {
        block(x-diameter*size/2,y-diameter*size/2,z+height*size,diameter*size,diameter*size,layer*size,colors.pine);
      }
    } else {
      const leaf=variant%2===0?colors.leaf:colors.bright;
      block(x-.38*size,y-.39*size,z+.78*size,.80*size,.8*size,.42*size,leaf);
      block(x-.49*size,y-.31*size,z+1.04*size,.99*size,.69*size,.31*size,forestShade(leaf,1.09));
      block(x-.30*size,y-.31*size,z+1.34*size,.61*size,.59*size,.27*size,forestShade(leaf,1.16));
      block(x-.12*size,y-.13*size,z+1.58*size,.24*size,.25*size,.17*size,colors.tip);
    }
  }
  function car(x,y,z,color,parked=false) {
    tile(x-.11,y-.1,z,.99,1.72,'#323d37',.011);
    for (const wheelX of [x-.055,x+.651]) {
      block(wheelX,y+.20,z,.18,.32,.20,'#282e2b');
      block(wheelX,y+1.10,z,.18,.32,.20,'#282e2b');
    }
    block(x,y,z+.12,.80,1.66,.25,color);
    block(x+.085,y+.40,z+.37,.64,.74,.21,'#587270');
    block(x+.105,y+.49,z+.58,.60,.57,.05,forestShade(color,1.12));
    for (const lightX of [x+.06,x+.58]) {
      block(lightX,y+1.662,z+.228,.16,.029,.08,'#f8e8ae');
      block(lightX,y-.024,z+.222,.16,.026,.076,'#c46753');
    }
    if (parked) {
      block(x+.33,y+.71,z+.665,.15,.15,.09,colors.tip);
    }
  }
  function bike(x,y,z) {
    block(x+.055,y,z,.11,.25,.24,'#2e3832');
    block(x+.055,y+.53,z,.11,.25,.24,'#2e3832');
    block(x,y+.22,z+.15,.22,.35,.14,'#d2a65b');
    block(x+.08,y+.56,z+.28,.09,.07,.18,'#465449');
    block(x-.065,y+.58,z+.43,.35,.06,.045,colors.cream);
    block(x+.01,y+.29,z+.29,.22,.20,.055,'#343a36');
  }
  function lamp(x,y,z) {
    block(x-.06,y-.06,z,.13,.13,1.33,'#738075');
    block(x-.22,y-.12,z+1.3,.45,.25,.10,'#c0c6a8');
    block(x-.135,y-.085,z+1.397,.28,.18,.035,'#f2e6af');
  }
  function letter(x,y,z,glyph,pixel,color) {
    glyph.forEach((row,j)=>[...row].forEach((bit,i)=>{
      if (bit==='1') block(x,y+i*pixel,z+(glyph.length-j-1)*pixel,.017,pixel,pixel,color);
    }));
  }

  // Layered cutaway ground. The sidewalk frames the built and planted areas.
  block(0,0,0,17.1,11.1,.58,colors.soil);
  block(0,0,.58,17.1,11.1,.13,colors.lightSoil);
  block(0,0,.71,17.1,11.1,.22,colors.stone);
  block(.12,.12,.93,16.86,10.86,.19,colors.cream);
  block(.44,.48,1.12,9.52,10.14,.14,colors.asphalt);
  block(10.08,.45,1.12,6.56,10.17,.24,colors.grass);
  for(let x=0;x<8;x++) {
    for(let y=0;y<12;y++) {
      if ((x*7+y*5)%7>3) continue;
      const brightness=(x*2+y*3)%4===0?colors.fresh:colors.moss;
      tile(10.11+x*.812,.51+y*.83,1.362,.80,.817,brightness,.024);
    }
  }
  block(9.94,.48,1.12,.18,10.38,.16,colors.cream);
  for(let step=0;step<10;step++) {
    tile(9.50,.53+step,1.265,.35,.86,step%2?colors.cream:colors.stone,.02);
  }
  foundation=false;

  // Lower floor, which remains visible beneath the upper roof deck.
  tile(.50,6.72,1.262,9.15,3.83,colors.darkRoad);
  for(let step=0;step<5;step++) marking(3.10+step*1.11,8.12,1.265,.52,.065);
  crosswalk(7.39,9.55,1.267);
  for(let spot=0;spot<4;spot++) {
    const x=3.16+spot*1.28;
    marking(x,5.75,1.266,.06,1.71);
    marking(x,5.75,1.266,1.08,.056);
    marking(x+.14,5.93,1.266,.80,.06,'#777e67');
  }
  if (active && vehicle==='bike') bike(4.92,5.97,1.27);
  else car(4.83,5.96,1.27,active?'#bbd868':'#71a7a2',active);
  car(6.10,6.02,1.27,'#d6a660');
  car(8.22,8.63,1.27,'#cf795f');
  for (const x of [.56,8.55]) {
    for(const y of [.79,5.31,6.34]) {
      block(x,y,1.26,.47,.49,2.16,colors.concrete);
      block(x-.015,y-.012,1.66,.50,.51,.24,'#98a17b');
    }
  }
  block(.55,.61,1.26,8.48,.26,2.24,colors.concrete);
  block(.55,.61,3.50,8.48,5.97,.34,colors.concrete);
  block(.58,.64,3.84,8.41,5.91,.11,colors.asphalt);
  block(.59,.64,3.88,8.39,1.41,.29,colors.moss);
  tile(.66,.72,4.171,8.18,1.24,colors.grass,.013);
  for (const [x,y,size] of [[1.48,1.34,1.38],[3.08,1.28,1.14],[7.61,1.34,1.46]]) shrub(x,y,4.172,size);
  shrub(4.40,1.18,4.176,.80);
  shrub(6.5,1.51,4.176,.74);
  block(.55,.58,3.90,8.49,.16,.39,colors.cream);
  block(8.88,.76,3.95,.18,5.81,.51,colors.concrete);
  for (const x of [3.48,4.81,6.14,7.47,8.79]) marking(x,2.31,3.953,.075,1.85);
  marking(3.49,2.31,3.953,5.32,.071);
  marking(3.50,4.12,3.953,5.31,.062);
  car(4.05,2.40,3.958,'#d0856a');
  car(6.59,2.37,3.958,'#b9b8d0');
  lamp(8.66,5.86,3.95);
  for (let step=0;step<4;step++) marking(3.75+step*1.17,5.20,3.954,.50,.057,'#c4c5aa');

  // Driveable incline and the low cutaway walls along its edges.
  const rampX=.72, rampWidth=2.05, rampY=6.52, rampLength=3.66;
  const upperZ=3.950, lowerZ=1.269;
  const rampLine=(x,width,color,offset=0,bias=0)=>{
    const start=upperZ+offset, stop=lowerZ+offset;
    polygon([[x,rampY,start],[x+width,rampY,start],[x+width,rampY+rampLength,stop],[x,rampY+rampLength,stop]],color,bias);
  };
  rampLine(rampX,rampWidth,colors.lightRoad);
  rampLine(rampX+.08,.08,colors.lane,.011,.025);
  rampLine(rampX+rampWidth-.15,.075,colors.lane,.011,.025);
  for(const x of [rampX,rampX+rampWidth]) {
    polygon([[x,rampY,upperZ+.31],[x,rampY+rampLength,lowerZ+.24],[x,rampY+rampLength,lowerZ],[x,rampY,upperZ]],colors.stone,.018);
  }
  block(8.63,6.56,2.72,.073,1.24,.77,'#dfe2ca');
  block(8.713,6.62,2.78,.026,1.10,.65,'#3e6254');
  letter(8.745,6.80,2.88,['1110','1001','1110','1000','1000'],.073,'#ebedd8');
  block(8.765,7.29,2.90,.025,.09,.09,'#b8d976');
  block(9.32,9.05,1.28,.25,.27,.59,'#c9a361');
  block(9.32,9.04,1.87,.27,.29,.11,'#7a8e67');
  block(7.81,9.13,1.76,1.48,.10,.105,'#e5dad0');
  for(let stripe=0;stripe<4;stripe++) block(7.89+stripe*.31,9.124,1.762,.13,.112,.109,'#cf7960');

  // A stepped trail divides the individual tree plots.
  for (let step=0;step<8;step++) {
    tile(12.30,.66+step*1.21,1.365,.35,.94,colors.trail,.025);
    tile(14.75,1.20+step*1.13,1.365,.31,.82,colors.trail,.025);
  }
  for (let step=0;step<9;step++) tile(10.16+step*.69,10.03,1.365,.60,.36,colors.trail,.025);
  ['#bbba91','#c9c9a5','#a8ad88'].forEach((color,index)=>block(10.42+index*.17,10.25-index*.06,1.37,.12,.14,.12,color));
  plots.forEach(([x,y],index)=>{
    const step=forestClamp(growth-index,0,1);
    const base=step>0?'#719149':'#aea47a';
    tile(x-.64,y-.60,1.367,1.28,1.20,base,.04);
    tile(x-.51,y-.48,1.370,1.02,.96,step>0?'#7b9c50':'#c8b787',.043);
    if (step>0) {
      tile(x-.38,y-.33,1.376,.79,.64,colors.shadow,.046);
      tree(x,y,1.377,step,index);
    } else {
      block(x-.12,y-.10,1.379,.24,.20,.046,'#9e8a5f');
    }
  });
  for (const [x,y,scale] of [[10.37,.78,.6],[16.33,.78,.55],[10.29,5.51,.53],[16.41,10.39,.5]]) shrub(x,y,1.37,scale);
  block(10.32,8.72,1.37,.29,.93,.13,colors.bark);
  block(10.36,8.77,1.50,.25,.82,.12,'#ba9d75');
  return faces;
}

function noopForest() {
  return {update(){},destroy(){},rotate(){}};
}

export function mountForest(host) {
  if (!host) return noopForest();
  let canvas=host.querySelector('canvas');
  if (!canvas) {
    canvas=document.createElement('canvas');
    canvas.className='forest-canvas';
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','Isometric parking garage and personal forest');
    host.append(canvas);
  }
  const ctx=canvas.getContext?.('2d');
  if (!ctx?.createLinearGradient) return noopForest();

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const initialAngle=Math.PI*.262;
  let angle=initialAngle, goalAngle=angle, angleFrom=angle;
  let turnDirection=1;
  let growth=0, goalGrowth=0, growthFrom=0;
  let active=false, vehicle='car', frame, started=0;
  const viewBounds=[[-.4,-.3,0],[17.5,-.3,0],[-.4,11.5,0],[17.5,11.5,0],[1,1,5.72],[8,6.4,5.62]];

  function draw() {
    const width=canvas.clientWidth || host.clientWidth;
    const height=canvas.clientHeight || host.clientHeight;
    if (!width || !height) return;
    const density=Math.min(window.devicePixelRatio || 1,2);
    const pixelWidth=Math.round(width*density);
    const pixelHeight=Math.round(height*density);
    if (canvas.width!==pixelWidth) canvas.width=pixelWidth;
    if (canvas.height!==pixelHeight) canvas.height=pixelHeight;
    ctx.setTransform(density,0,0,density,0,0);

    const background=ctx.createLinearGradient(0,0,0,height);
    background.addColorStop(0,'#e7eee1');
    background.addColorStop(.66,'#e9ece1');
    background.addColorStop(1,'#deded0');
    ctx.fillStyle=background;
    ctx.fillRect(0,0,width,height);

    const camera={cx:Math.sin(angle),cy:Math.cos(angle)};
    const plane=([x,y,z])=>[x*camera.cy-y*camera.cx,(x*camera.cx+y*camera.cy)*.53-z*.92];
    const depths=([x,y,z])=>(x*camera.cx+y*camera.cy)*.92+z*.53;
    const bounds=viewBounds.map(plane);
    const [minX,maxX]=[Math.min(...bounds.map(value=>value[0])),Math.max(...bounds.map(value=>value[0]))];
    const [minY,maxY]=[Math.min(...bounds.map(value=>value[1])),Math.max(...bounds.map(value=>value[1]))];
    const scale=Math.min(width*.89/(maxX-minX),height*.87/(maxY-minY));
    const offsetX=width*.50-(maxX+minX)*scale/2;
    const offsetY=height*.49-(maxY+minY)*scale/2;
    const transform=point=>{
      const [x,y]=plane(point);
      return [offsetX+x*scale,offsetY+y*scale];
    };
    function paint(points,color) {
      ctx.beginPath();
      points.forEach((point,index)=>ctx[index?'lineTo':'moveTo'](...transform(point)));
      ctx.closePath();
      ctx.fillStyle=color;
      ctx.fill();
    }

    // Registration dots reinforce the diorama surface and stay out of the way.
    ctx.fillStyle='#7e927b22';
    for (let x=13;x<width;x+=18) {
      for (let y=13;y<height;y+=18) ctx.fillRect(x,y,1.2,1.2);
    }
    paint([[-.46,-.24,-.09],[18.0,-.24,-.09],[18.0,12.1,-.09],[-.46,12.1,-.09]],'#53614a1d');
    paint([[.1,.16,-.07],[17.67,.16,-.07],[17.67,11.67,-.07],[.1,11.67,-.07]],'#53614a29');
    const world=makeGeometry(camera,growth,active,vehicle);
    const faces=[];
    for(const face of world) {
      if (face.foundation) paint(face.points,face.color);
      else faces.push(face);
    }
    for(const face of faces) face.depth=face.points.reduce((sum,point)=>sum+depths(point),0)/face.points.length+face.bias;
    faces.sort((a,b)=>a.depth-b.depth);
    for(const face of faces) paint(face.points,face.color);
  }

  function paintFrame(now) {
    if (!started) started=now;
    const t=reduced?1:forestClamp((now-started)/520,0,1);
    const eased=1-(1-t)**3;
    angle=angleFrom+(goalAngle-angleFrom)*eased;
    growth=growthFrom+(goalGrowth-growthFrom)*eased;
    draw();
    frame=t<1?requestAnimationFrame(paintFrame):undefined;
  }
  function animate() {
    if (frame!==undefined) cancelAnimationFrame(frame);
    started=0;
    angleFrom=angle;
    growthFrom=growth;
    frame=requestAnimationFrame(paintFrame);
  }
  const observer=new ResizeObserver(draw);
  observer.observe(canvas);
  draw();
  return {
    update(next) {
      const trees=forestClamp(Math.floor(Number(next.trees)||0),0,forestLevelMax);
      const progress=forestClamp(Number(next.progress)||0,0,100);
      const nextGrowth=next.preview?trees:Math.min(forestLevelMax,trees+progress/100);
      const liveStatus=trees===forestLevelMax?'forest complete':progress+' percent of the next tree';
      const label=next.preview?'Forest preview at level '+trees+', '+trees+' of '+forestLevelMax+' trees.'
        :'Isometric parking garage and personal forest, '+trees+' trees grown, '+liveStatus+'.';
      canvas.setAttribute('aria-label',label);
      const changed=nextGrowth!==goalGrowth || active!==Boolean(next.active) || vehicle!==next.vehicle;
      if (!changed) return;
      goalGrowth=nextGrowth;
      active=Boolean(next.active);
      vehicle=next.vehicle;
      animate();
    },
    rotate(direction) {
      const minimum=Math.PI*.11;
      const maximum=Math.PI*.40;
      const step=Math.PI/20;
      if (direction) turnDirection=Math.sign(direction);
      if (!direction && (goalAngle>=maximum || goalAngle<=minimum)) turnDirection *= -1;
      goalAngle=forestClamp(goalAngle+turnDirection*step,minimum,maximum);
      animate();
    },
    destroy() {
      observer.disconnect();
      if (frame!==undefined) cancelAnimationFrame(frame);
    }
  };
}
