const themes = {
  open:{sky:'#93c9df',ground:'#798282',line:'#eee6bf',trim:'#1a795e',walls:'#d3dcd3'},
  garage:{sky:'#445b60',ground:'#627275',line:'#f3cf67',trim:'#26766d',walls:'#8b9b9a',roof:'#647b7e'},
  deck:{sky:'#b5d6da',ground:'#7c8d89',line:'#f8e6a4',trim:'#45698b',walls:'#c1cfc6',roof:'#a1b3af'},
  street:{sky:'#82bdde',ground:'#5e7077',line:'#f4ebd3',trim:'#246482',walls:'#b4c5c4'},
  court:{sky:'#b4d6e1',ground:'#95877a',line:'#f0e3c5',trim:'#825f4f',walls:'#dac7ad'}
};

const cardColors = ['#7d9a9e','#e6e9dd','#395f5c','#8c5549','#c6ae7c'];

export function mountPanorama(host,spot) {
  const theme = themes[spot.scene] ?? themes.open;
  host.innerHTML='<canvas tabindex="0" aria-label="Simulated 360-degree view. Drag or use arrow keys to look around."></canvas><span class="pano-label">SIMULATED 360°</span><span class="pano-angle" aria-hidden="true"></span><div class="pano-views"><button data-angle="0">Entry gate</button><button data-angle="90">Parking bays</button><button data-angle="180">Exit lane</button><button data-angle="270">Side view</button></div>';
  const canvas=host.querySelector('canvas');
  const compass=host.querySelector('.pano-angle');
  const ctx=canvas.getContext('2d');
  const objects=buildScene(theme,spot);
  let yaw=0;
  let pitch=0;
  let drag;

  const render=() => {
    const width=canvas.clientWidth;
    const height=canvas.clientHeight;
    if (!width || !height) return;
    const density=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*density);
    canvas.height=Math.round(height*density);
    ctx.setTransform(density,0,0,density,0,0);
    const horizon=height*.54+pitch*height;
    const sky=ctx.createLinearGradient(0,0,0,Math.max(1,horizon));
    sky.addColorStop(0,theme.sky);
    sky.addColorStop(1,theme.roof ? '#a1aaa1' : '#e1e9dd');
    ctx.fillStyle=sky;
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle=theme.ground;
    ctx.fillRect(0,horizon,width,height-horizon);
    const focal=width*.65;
    const sin=Math.sin(yaw);
    const cos=Math.cos(yaw);
    const rotate=([x,y,z]) => [x*cos-z*sin,y-1.66,x*sin+z*cos];
    const project=([x,y,z]) => [width/2+x/z*focal,horizon-y/z*focal];
    const ordered=[];
    for (const object of objects) {
      if (object.text) {
        const middle=rotate(object.at);
        if (middle[2]>.2) ordered.push({...object,middle,depth:middle[2]-.012});
        continue;
      }
      const corners=clip(object.points.map(rotate));
      if (corners.length < 3) continue;
      ordered.push({...object,corners,depth:corners.reduce((sum,corner)=>sum+corner[2],0)/corners.length});
    }
    ordered.sort((a,b)=>b.depth-a.depth);
    for (const item of ordered) {
      ctx.fillStyle=item.color;
      if (item.text) {
        const [x,y]=project(item.middle);
        const size=focal*.23/item.depth;
        if (size>5 && Math.abs(Math.cos(yaw-item.angle))>.5) {
          ctx.textAlign='center';
          ctx.font='800 '+Math.min(37,size)+'px system-ui';
          ctx.fillText(item.text,x,y);
        }
        continue;
      }
      ctx.beginPath();
      item.corners.forEach((corner,index)=>ctx[index?'lineTo':'moveTo'](...project(corner)));
      ctx.closePath();
      ctx.fill();
    }
    const angle=((Math.round(yaw*180/Math.PI)%360)+360)%360;
    compass.textContent=angle+'°';
  };

  const observer=new ResizeObserver(render);
  observer.observe(canvas);
  canvas.addEventListener('pointerdown',event=>{
    if (event.button!==0) return;
    drag=[event.clientX,event.clientY];
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if (!drag) return;
    yaw-=(event.clientX-drag[0])*.008;
    pitch=Math.max(-.42,Math.min(.42,pitch+(event.clientY-drag[1])*.0017));
    drag=[event.clientX,event.clientY];
    render();
  });
  for (const name of ['pointercancel','pointerup','lostpointercapture']) canvas.addEventListener(name,()=>{drag=null;});
  canvas.addEventListener('keydown',event=>{
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    if (event.key==='ArrowLeft') yaw-=.16;
    if (event.key==='ArrowRight') yaw+=.16;
    if (event.key==='ArrowUp') pitch=Math.min(.42,pitch+.06);
    if (event.key==='ArrowDown') pitch=Math.max(-.42,pitch-.06);
    render();
  });
  host.querySelectorAll('[data-angle]').forEach(button=>button.onclick=()=>{
    yaw=Number(button.dataset.angle)*Math.PI/180;
    pitch=0;
    render();
  });
  render();
  return ()=>observer.disconnect();
}

function clip(points) {
  const output=[];
  const near=.15;
  points.forEach((point,index)=>{
    const previous=points[(index+points.length-1)%points.length];
    if ((point[2]>=near)!==(previous[2]>=near)) {
      const ratio=(near-previous[2])/(point[2]-previous[2]);
      output.push([previous[0]+(point[0]-previous[0])*ratio,previous[1]+(point[1]-previous[1])*ratio,near]);
    }
    if (point[2]>=near) output.push(point);
  });
  return output;
}

function buildScene(theme,spot) {
  const scene=[];
  const face=(color,...points)=>scene.push({color,points});
  function box(x,y,z,w,h,d,color) {
    const a=[x,y,z],b=[x+w,y,z],c=[x+w,y,z+d],e=[x,y,z+d];
    const f=[x,y+h,z],g=[x+w,y+h,z],j=[x+w,y+h,z+d],k=[x,y+h,z+d];
    face(shade(color,.88),a,b,g,f);
    face(shade(color,.71),b,c,j,g);
    face(shade(color,.95),c,e,k,j);
    face(shade(color,.79),e,a,f,k);
    face(shade(color,1.12),f,g,j,k);
    face(shade(color,.59),e,c,b,a);
  }
  function flat(x,z,w,d,color) {
    face(color,[x,.01,z],[x+w,.01,z],[x+w,.01,z+d],[x,.01,z+d]);
  }
  function building(x,z,w,h,d,tones) {
    box(x,0,z,w,h,d,tones);
    for(let row=1;row<h/1.22;row++){
      for(let col=.5;col<w-1;col+=1.23){
        face('#657f80',[x+col,row*1.2,z-.012],[x+col+.76,row*1.2,z-.012],[x+col+.76,row*1.2+.61,z-.012],[x+col,row*1.2+.61,z-.012]);
      }
    }
  }
  function sedan(x,z,color) {
    box(x,.29,z,1.86,.51,3.88,color);
    box(x+.23,.8,z+.83,1.38,.47,2.05,shade(color,1.02));
    box(x+.29,.9,z+.95,1.26,.29,.02,'#495f64');
    box(x+.29,.92,z+2.8,1.26,.26,.02,'#3c555a');
    box(x+.24,.91,z+1.06,.015,.29,1.54,'#465d63');
    box(x+1.61,.91,z+1.06,.015,.29,1.54,'#465d63');
    for(const offset of [0,1.68]) {
      box(x+offset,.15,z+.5,.18,.31,.58,'#303a39');
      box(x+offset,.15,z+2.82,.18,.31,.58,'#303a39');
      box(x+offset+.018,.53,z-.012,.21,.12,.03,'#f4e2b4');
      box(x+offset+.015,.53,z+3.885,.17,.12,.03,'#b9544f');
    }
  }

  for (let z=-23;z<24;z+=2.7) {
    flat(-.055,z,.11,1.24,theme.line);
    flat(3.85,z,.10,.84,theme.line);
    flat(-3.94,z,.10,.84,theme.line);
    if (Math.round(z*10)%2===0) flat(3.85,z,5.4,.10,theme.line);
    flat(-9.12,z,5.26,.1,theme.line);
  }
  for (const [index,z] of [-17,-9,-3,5,11,17].entries()) {
    if (index!==2) sedan(5.16,z,cardColors[(index+spot.code.charCodeAt(0))%cardColors.length]);
    if (index!==3) sedan(-7.27,z+1,cardColors[(index+1)%cardColors.length]);
  }
  for (const z of [-13,-5,7,17]) {
    for(const x of [-9.4,9.05]){
      if (theme.roof) {
        box(x,0,z,.43,3.65,.45,theme.walls);
        box(x-.012,.55,z-.008,.45,.48,.47,theme.trim);
      } else {
        box(x,0,z,.11,4.3,.11,'#657570');
        box(x-.18,4.12,z-.12,.48,.10,.27,'#c2c9b8');
      }
    }
    if (theme.roof) {
      box(-11,3.34,z,22,.25,.26,theme.walls);
      box(-1.16,3.32,z-.02,2.25,.08,.15,'#fff0c9');
    }
  }
  if (theme.roof) {
    box(-12,3.7,-30,24,.21,60,theme.roof);
    box(-12,0,-30,.27,theme===themes.deck?1.08:3.68,60,theme.walls);
    box(11.6,0,-30,.27,theme===themes.deck?1.08:3.68,60,theme.walls);
  } else {
    building(12,-24,4,spot.scene==='court'?5:10,16,theme.walls);
    building(16,7,6,spot.scene==='street'?14:7,15,theme.walls);
    building(-17,-21,4,8,37,theme.walls);
    building(10,22,11,7,4,theme.walls);
    building(-21,22,13,9,3,theme.walls);
    for(const [x,z] of [[-10,-14],[-10,-7],[-10,8],[-10,14],[9.8,1],[9.8,16]]) {
      box(x,0,z,.26,2,.26,'#786e56');
      box(x-.84,1.65,z-.8,1.9,1.65,1.83,'#608260');
      box(x-.59,2.67,z-.57,1.25,1.04,1.27,'#749474');
    }
  }
  box(-3.05,0,8,.2,2.98,.22,theme.trim);
  box(2.85,0,8,.2,2.98,.22,theme.trim);
  box(-3.05,2.58,7.93,6.1,.49,.25,theme.trim);
  scene.push({text:'P  /  '+spot.code+'  VISITOR ENTRY',at:[0,2.73,7.915],angle:0,color:'#f5ffeb'});
  box(2.96,0,6,.7,.91,.55,theme.trim);
  box(-.13,.83,6.22,3.24,.10,.09,'#f3db80');
  box(-2.5,2.32,-9,5,.51,.22,theme.trim);
  scene.push({text:'EXIT  ↑',at:[0,2.52,-8.76],angle:Math.PI,color:'#f5ffeb'});
  return scene;
}

function shade(hex,amount) {
  const color=parseInt(hex.slice(1),16);
  const parts=[color>>16,(color>>8)&255,color&255];
  return 'rgb('+parts.map(part=>Math.min(255,Math.round(part*amount))).join(',')+')';
}
