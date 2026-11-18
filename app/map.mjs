const worldSize = zoom => 256 * (2 ** zoom);
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

export function project(lat,lng,zoom) {
  const size = worldSize(zoom);
  const sin = Math.sin(clamp(lat,-85,85) * Math.PI / 180);
  return [(lng+180)/360 * size,(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*size];
}

function unproject(x,y,zoom) {
  const size = worldSize(zoom);
  return [Math.atan(Math.sinh(Math.PI*(1-2*y/size)))*180/Math.PI,x/size*360-180];
}

const roads = [
  {width:18,major:true,points:[[28.4907,77.0796],[28.4921,77.0834],[28.4951,77.0873],[28.499,77.0907],[28.5028,77.0943],[28.5065,77.0961],[28.5101,77.098]]},
  {width:10,points:[[28.4913,77.0862],[28.4933,77.0879],[28.4944,77.0898],[28.496,77.0911],[28.4989,77.093],[28.5014,77.0941],[28.5046,77.0969],[28.5073,77.0994]]},
  {width:8,points:[[28.4921,77.0843],[28.4936,77.0862],[28.495,77.0878],[28.4972,77.0884],[28.4993,77.0888],[28.503,77.0904]]},
  {width:8,points:[[28.495,77.0878],[28.4952,77.0887],[28.49545,77.0894],[28.4957,77.091],[28.4959,77.0935],[28.4962,77.097]]},
  {width:7,points:[[28.491,77.0884],[28.4922,77.0888],[28.4935,77.0894],[28.49475,77.0905],[28.4965,77.0911],[28.5002,77.0922],[28.5026,77.0937]]},
  {width:7,points:[[28.4935,77.0863],[28.4939,77.0875],[28.494,77.089],[28.4937,77.0916],[28.493,77.095]]},
  {width:5,points:[[28.4933,77.0915],[28.4948,77.0923],[28.4965,77.0928],[28.4972,77.09297]]},
  {width:5,points:[[28.4942,77.092],[28.4948,77.094],[28.495,77.096]]},
  {width:6,points:[[28.4978,77.0896],[28.4972,77.0912],[28.4966,77.0928],[28.4972,77.0951],[28.4974,77.097]]},
  {width:6,points:[[28.4989,77.0908],[28.4987,77.0924],[28.499,77.0941],[28.4994,77.096]]},
  {width:6,points:[[28.5016,77.0897],[28.5015,77.0928],[28.5024,77.0951],[28.5014,77.0978]]},
  {width:7,points:[[28.5013,77.0951],[28.5035,77.0963],[28.5048,77.0966],[28.5055,77.0973],[28.5059,77.0987]]}
];

export function parkingMap(root,icon,onSelect) {
  root.innerHTML = '<div class="map-surface" tabindex="0" aria-label="Drag the map or use arrow keys to pan"><canvas class="map-schematic" aria-hidden="true"></canvas><div class="map-tiles" aria-hidden="true"></div></div><div class="map-pins"></div><div class="map-place">'+icon('pin')+'<div><b class="map-place-name">DLF Cyber City</b><small>Gurugram, Haryana</small></div></div><div class="map-controls"><button class="map-control" aria-label="Zoom in" data-map="plus">+</button><button class="map-control" aria-label="Zoom out" data-map="minus">−</button><button class="map-control" aria-label="Center on destination" data-map="reset">'+icon('locate')+'</button></div><div class="map-key"><span class="status">Available</span><span class="status full">Unavailable</span></div><div class="map-attribution"><span class="map-source">Loading OpenStreetMap…</span></div><div class="pin-detail" hidden></div>';
  const surface = root.querySelector('.map-surface');
  const tiles = root.querySelector('.map-tiles');
  const canvas = root.querySelector('canvas');
  const pins = root.querySelector('.map-pins');
  const badge = root.querySelector('.map-place-name');
  const detail = root.querySelector('.pin-detail');
  const credit = root.querySelector('.map-source');
  const current = new Map();
  let centre, dest, spots=[], selected, drag, pendingFrame;
  let zoom = root.clientWidth < 570 ? 16 : 17;

  function frame() {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      draw();
    });
  }

  function mapOrigin(w,h) {
    const point = project(...centre,zoom);
    return [point[0]-w/2,point[1]-h/2];
  }

  function updateAttribution() {
    const loaded = [...current.values()].some(image => image.classList.contains('ready'));
    const loading = [...current.values()].some(image => !image.dataset.complete);
    const label = loaded ? '© OpenStreetMap contributors' : (loading ? 'Loading map · DLF schematic' : 'Offline · DLF schematic');
    if (credit.dataset.label === label) return;
    credit.dataset.label = label;
    if (loaded) credit.innerHTML = '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · Demo parking';
    else credit.textContent = label;
  }

  function draw() {
    if (!centre || !root.clientWidth) return;
    const w = root.clientWidth;
    const h = root.clientHeight;
    const [left,top] = mapOrigin(w,h);
    const local = (lat,lng) => {
      const [x,y] = project(lat,lng,zoom);
      return [x-left,y-top];
    };
    sketch(canvas,w,h,local,zoom);
    const visible = new Set();
    for (let x=Math.floor(left/256); x<Math.ceil((left+w)/256); x++) {
      for (let y=Math.floor(top/256); y<Math.ceil((top+h)/256); y++) {
        const key = [zoom,x,y].join('/');
        visible.add(key);
        let image = current.get(key);
        if (!image) {
          image = document.createElement('img');
          image.alt = '';
          image.decoding = 'async';
          image.draggable = false;
          image.onload = () => { image.classList.add('ready'); image.dataset.complete = '1'; updateAttribution(); };
          image.onerror = () => { image.dataset.complete = '1'; updateAttribution(); };
          image.src = 'https://tile.openstreetmap.org/'+key+'.png';
          current.set(key,image);
          tiles.append(image);
        }
        image.style.left = Math.round(x*256-left)+'px';
        image.style.top = Math.round(y*256-top)+'px';
      }
    }
    for (const [key,image] of current) {
      if (!visible.has(key)) { image.remove(); current.delete(key); }
    }
    updateAttribution();
    for (const button of pins.children) {
      const [x,y] = local(Number(button.dataset.lat),Number(button.dataset.lng));
      button.style.left = x+'px';
      button.style.top = y+'px';
      button.hidden = x<13 || x>w-13 || y<20 || y>h-14;
    }
  }

  function updateMarkers() {
    const markerSet = spots.map(spot => {
      const label = spot.name+', '+(spot.free ? spot.free+' spots available' : 'unavailable');
      const button = document.createElement('button');
      button.className = 'map-pin'+(spot.free ? '' : ' full')+(spot.id===selected ? ' selected' : '');
      button.dataset.lat = spot.lat;
      button.dataset.lng = spot.lng;
      button.title = label;
      button.setAttribute('aria-label',label);
      button.textContent = spot.free ? 'P '+spot.free : 'P ×';
      button.onclick = () => onSelect(spot.id);
      return button;
    });
    if (dest) {
      const marker = document.createElement('span');
      marker.className = 'destination-pin';
      marker.dataset.lat = dest.lat;
      marker.dataset.lng = dest.lng;
      marker.setAttribute('aria-hidden','true');
      markerSet.push(marker);
    }
    pins.replaceChildren(...markerSet);
    frame();
  }

  function recenter() {
    if (!dest) return;
    zoom = root.clientWidth < 570 ? 16 : 17;
    centre = [dest.lat+.00035,dest.lng+.00048];
    frame();
  }

  function pan(x,y) {
    const point = project(...centre,zoom);
    const [lat,lng] = unproject(point[0]+x,point[1]+y,zoom);
    centre = [clamp(lat,28.41,28.57),clamp(lng,77.01,77.16)];
    frame();
  }

  function zoomBy(amount) {
    zoom = clamp(zoom+amount,13,19);
    frame();
  }

  root.querySelector('.map-controls').addEventListener('click',event => {
    const command = event.target.closest('[data-map]')?.dataset.map;
    if (command === 'reset') recenter();
    if (command === 'plus') zoomBy(1);
    if (command === 'minus') zoomBy(-1);
  });
  surface.addEventListener('wheel',event => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomBy(event.deltaY<0 ? 1 : -1);
  },{passive:false});
  surface.addEventListener('pointerdown',event => {
    if (event.button!==0 || !centre) return;
    drag = [event.clientX,event.clientY];
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('dragging');
  });
  surface.addEventListener('pointermove',event => {
    if (!drag) return;
    pan(drag[0]-event.clientX,drag[1]-event.clientY);
    drag = [event.clientX,event.clientY];
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) {
    surface.addEventListener(name,() => {drag=null;surface.classList.remove('dragging');});
  }
  surface.addEventListener('keydown',event => {
    const directions = {ArrowUp:[0,-75],ArrowDown:[0,75],ArrowLeft:[-75,0],ArrowRight:[75,0]};
    if (!centre || !directions[event.key]) return;
    event.preventDefault();
    pan(...directions[event.key]);
  });
  new ResizeObserver(frame).observe(root);
  return {
    set(destination,inventory,active,fly=false) {
      const moved = dest?.id !== destination.id;
      dest = destination;
      spots = inventory;
      selected = active;
      badge.textContent = destination.id === 'cyberhub' ? 'DLF Cyber City' : destination.name;
      if (moved || !centre || fly) recenter();
      updateMarkers();
    },
    popup(html) {detail.innerHTML=html;detail.hidden=!html;}
  };
}

function sketch(canvas,w,h,local,zoom) {
  const density=Math.min(window.devicePixelRatio || 1,2);
  if (canvas.width!==Math.round(w*density) || canvas.height!==Math.round(h*density)) {
    canvas.width=Math.round(w*density);
    canvas.height=Math.round(h*density);
  }
  const ctx=canvas.getContext('2d');
  ctx.setTransform(density,0,0,density,0,0);
  ctx.fillStyle='#e9eee5';
  ctx.fillRect(0,0,w,h);
  const scale = 2**(zoom-17);
  function poly(points,fill) {
    ctx.beginPath();
    points.forEach(([lat,lng],index) => ctx[index ? 'lineTo' : 'moveTo'](...local(lat,lng)));
    ctx.closePath();
    ctx.fillStyle=fill;
    ctx.fill();
  }
  poly([[28.496,77.078],[28.504,77.082],[28.501,77.089],[28.497,77.087]],'#dcebd8');
  poly([[28.488,77.090],[28.49,77.095],[28.493,77.095],[28.4915,77.0915]],'#d6e9d7');
  poly([[28.5013,77.0958],[28.4992,77.099],[28.5032,77.101],[28.5055,77.098]],'#d7e9d4');
  for (let row=0;row<43;row++) {
    for (let col=0;col<44;col++) {
      if ((row*11+col*7)%13<3) continue;
      const lat=28.486+row*.00057+(col%4)*.000021;
      const lng=77.077+col*.00058+(row%5)*.000028;
      const [x,y]=local(lat,lng);
      if (x<-90 || x>w+90 || y<-90 || y>h+90) continue;
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate((col%4-1.5)*.12);
      ctx.fillStyle=(row*col)%7<3 ? '#d6e1d4' : '#dce4d8';
      ctx.fillRect(-12*scale,-7*scale,(21+(row+col)%6*4)*scale,(12+(row*col)%5*4)*scale);
      ctx.restore();
    }
  }
  for (const road of roads) {
    ctx.beginPath();
    road.points.forEach(([lat,lng],index) => ctx[index ? 'lineTo' : 'moveTo'](...local(lat,lng)));
    ctx.lineJoin='round';
    ctx.lineCap='round';
    ctx.strokeStyle=road.major ? '#d6d1b5' : '#d8e1d7';
    ctx.lineWidth=Math.max(3,(road.width+2)*scale);
    ctx.stroke();
    ctx.strokeStyle=road.major ? '#fff2c8' : '#f9faf4';
    ctx.lineWidth=Math.max(2,road.width*scale);
    ctx.stroke();
  }
  const labels = [
    ['DLF CYBER CITY',28.49425,77.0854],['CyberHub',28.49462,77.08876],['DLF PHASE 3',28.4951,77.0943],
    ['NH 48',28.49822,77.0899],['Moulsari Avenue',28.4992,77.09245],['Ambience Mall',28.50425,77.09615]
  ];
  ctx.textAlign='center';
  for (const [label,lat,lng] of labels) {
    const [x,y] = local(lat,lng);
    ctx.font='700 11px system-ui';
    ctx.lineWidth=3;
    ctx.strokeStyle='#edf4e9';
    ctx.strokeText(label,x,y);
    ctx.fillStyle='#576f65';
    ctx.fillText(label,x,y);
  }
}
