import {destinations,parking,durations,durationText,rateFor,totalFor,getBooking,capacity,distance,distanceText,recommendations,initialQuery,loadState,storageKey,reserve,arrive,leave,review} from './parking.mjs';
import {parkingMap} from './map.mjs';
import {mountPanorama} from './panorama.mjs';
import {interpretRequest} from './assistant.mjs';
import {forestProgress,treeMinutes} from './forest-growth.mjs';
import {mountForest} from './forest-scene.mjs';

const icons = {
  pin:'<path d="M20 10c0 5-8 10-8 10s-8-5-8-10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  car:'<path d="m5 11 1.5-5h11l1.5 5M5 16v3m14-3v3M3 11h18v5H3zm4 2.5h.1m9.9 0h.1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  search:'<circle cx="10.6" cy="10.6" r="5.6"/><path d="m15 15 4.5 4.5"/>',
  'arrow-right':'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  arrow:'<path d="M12 19V5m-6 6 6-6 6 6"/>',
  direction:'<path d="m4 10 16-6-6 16-3-7-7-3Z"/>',
  sparkles:'<path d="m10 2 2.1 6 5.9 2-5.9 2L10 18l-2-6-6-2 6-2 2-6Zm8.5 11 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z"/>',
  tree:'<path d="M12 4 6.5 11h2.2L5 16h14l-3.7-5h2.2L12 4Zm0 12v4"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.1"/>',
  locate:'<circle cx="12" cy="12" r="6"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/><circle cx="12" cy="12" r="2"/>',
  ticket:'<path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V7Zm12 0v2m0 2v2m0 2v2"/>',
  sort:'<path d="M6 20V4m-3 3 3-3 3 3m9-3v16m-3-3 3 3 3-3"/>',
  office:'<path d="M4 21V5l9-2v18m0-13h7v13H3m4-13h3m-3 4h3m-3 4h3m6-4h1m-1 4h1"/>',
  society:'<path d="M3 11 12 4l9 7M5 10v10h14V10m-9 10v-6h4v6"/>',
  public:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a2.5 2.5 0 0 1 0 5H9"/>',
  star:'<path d="m12 3 2.7 5.6 6.3.9-4.5 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.5l6.3-.9Z"/>',
  rotate:'<path d="M20 7v5h-5m5-1a8 8 0 1 0-2 6"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  check:'<path d="m5 12 4 4L19 6"/>'
};

const icon = name => '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(icons[name]??'')+'</svg>';
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const spotById = id => parking.find(spot=>spot.id===id);
const placeById = id => destinations.find(place=>place.id===id);
const amount = value => '₹'+value.toLocaleString('en-IN');
const typeIcon = {'Public lot':'public',Office:'office',Society:'society'};
const typeLabel = {'Public lot':'Public lots',Office:'Offices',Society:'Societies'};
const clockFormat = new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'numeric',minute:'2-digit'});
const directionsLink = (spot,vehicle) => 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(spot.lat+','+spot.lng)+'&travelmode='+(vehicle==='bike'?'two-wheeler':'driving');
const demoClock = booking => Date.now()+(booking.fastForwardMs??0);
const studio = $('#dialog');
const content = $('#dialog-content');
const agentForm = $('#agent-form');
const agentInput = $('#agent-query');
let memoryState = null;
let memoryOnly = false;
const storage = {
  getItem(key) {
    if (memoryOnly) return memoryState;
    try {return globalThis.localStorage.getItem(key) ?? memoryState;}
    catch {return memoryState;}
  }
};
let state = loadState(storage);
let highlight = null;
let mode = null;
let cleanupPanorama = null;
let toastTimer;
let alertedBooking = null;
let agentOffer = null;
let agentRequest = 0;
let forestStamp = '';

document.querySelectorAll('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon);});
$('#destination').innerHTML=destinations.map(place=>'<option value="'+place.id+'">'+place.name+'</option>').join('');
$('#duration').innerHTML=durations.map(minutes=>'<option value="'+minutes+'">'+durationText(minutes)+'</option>').join('');
const map = parkingMap($('#map'),icon,selectPin);
const forest = mountForest($('#forest-scene'));

function showStage(view) {
  const isMap=view==='map';
  $('#parking-view').hidden=!isMap;
  $('#forest-view').hidden=isMap;
  $('#map-status').hidden=!isMap;
  $('#map-tab').setAttribute('aria-selected',String(isMap));
  $('#forest-tab').setAttribute('aria-selected',String(!isMap));
  $('#map-tab').tabIndex=isMap?0:-1;
  $('#forest-tab').tabIndex=isMap?-1:0;
}

function renderForest() {
  const growth=forestProgress(state.bookings);
  const stamp=[growth.minutes,growth.active,growth.vehicle].join(':');
  if (stamp===forestStamp) return;
  forestStamp=stamp;
  $('#forest-minutes').textContent=durationText(growth.minutes);
  $('#forest-trees').textContent=String(growth.trees);
  $('#forest-percent').textContent=growth.progress+'%';
  $('#forest-growth').value=growth.progress;
  $('#forest-note').textContent=growth.minutes===0 ? 'Every '+durationText(treeMinutes)+' parked grows a tree.' : durationText(growth.minutesToNext)+' of parked time to your next tree.';
  $('#forest-advance').hidden=!growth.active;
  forest.update(growth);
}

function syncControls() {
  const {destination,vehicle,duration,sort}=state.query;
  $('#destination').value=destination;
  $('#duration').value=duration;
  $('#sort').value=sort;
  document.querySelectorAll('[name=vehicle]').forEach(radio=>{radio.checked=radio.value===vehicle;});
}

function save() {
  memoryState=JSON.stringify(state);
  if (memoryOnly) return;
  try {globalThis.localStorage.setItem(storageKey,memoryState);}
  catch {memoryOnly=true;}
}

async function changeBooking(edit) {
  const change=()=>{
    state=loadState(storage);
    const result=edit(state);
    if (result) save();
    return result;
  };
  if (memoryOnly) return change();
  let entered=false;
  try {
    const locks=globalThis.navigator?.locks;
    if (locks) return await locks.request(storageKey,()=>{
      entered=true;
      return change();
    });
  } catch (error) {
    if (entered) throw error;
  }
  return change();
}

function preferences(query) {
  const labels=[...(query.amenities?.length ? query.amenities : (query.amenity ? [query.amenity] : []))];
  if (query.maxPrice != null) labels.push('Up to '+amount(query.maxPrice)+' total');
  if (query.maxHourlyPrice != null) labels.push('Up to '+amount(query.maxHourlyPrice)+'/hr');
  return labels;
}

function render(fly=false) {
  const query=state.query;
  const spotList=recommendations(query,state);
  const dest=placeById(query.destination) ?? destinations[0];
  const selectedId=highlight ?? spotList[0]?.id ?? null;
  $('#result-area').textContent=dest.name.toUpperCase();
  $('#result-count').textContent=spotList.length ? spotList.length+' recommended spot'+(spotList.length===1?'':'s') : 'No matching spots';
  $('#map-status').textContent=query.vehicle==='bike' ? 'Bike availability' : 'Car availability';
  $('#type-filters').innerHTML=['','Public lot','Office','Society'].map(type=>'<button class="filter-pill'+(query.type===type?' active':'')+'" data-type="'+type+'" aria-pressed="'+(query.type===type)+'">'+(typeLabel[type]??'All spots')+'</button>').join('');
  const applied=preferences(query);
  $('#amenity-filter').hidden=!applied.length;
  $('#amenity-filter').innerHTML=applied.length ? '<button class="filter-pill active" data-action="clear-amenity" aria-label="Clear amenity and price filters">'+esc(applied.join(' · '))+' '+icon('close')+'</button>' : '';
  $('#results').innerHTML=spotList.length ? spotList.map(spot=>card(spot,query,selectedId)).join('') : '<div class="empty"><strong>No available spots for these filters.</strong>Change the parking type, amenity or vehicle to see more options.</div>';
  map.set(dest,parking.map(spot=>({...spot,free:capacity(spot,query.vehicle,state)})),selectedId,fly,{reframe:false});
  renderSpotlight(selectedId,dest,spotList[0]?.id);
  tick();
}

function card(spot,query,selectedId) {
  const free=capacity(spot,query.vehicle,state);
  const selected=selectedId===spot.id;
  return '<article class="spot-card'+(selected?' highlighted':'')+'" data-spot-card="'+spot.id+'"><div class="spot-summary"><span class="spot-icon">'+icon(typeIcon[spot.type])+'</span><div><h3 class="spot-name"><button class="spot-select" data-action="focus" data-id="'+spot.id+'" aria-label="Show '+spot.name+' on the map" aria-pressed="'+selected+'">'+spot.name+'</button></h3><div class="spot-meta">'+spot.type+' <span>·</span> '+distanceText(spot.dist)+' <span>·</span> '+icon('star')+' '+spot.rating.toFixed(1)+'</div></div><div class="spot-price"><strong>'+amount(spot.price)+'</strong><br><span>'+durationText(query.duration)+' total</span></div></div><div class="spot-bottom"><span class="status">'+free+' open</span><div class="spot-actions"><button data-action="panorama" data-id="'+spot.id+'" aria-label="360° preview of '+spot.name+'">'+icon('rotate')+' 360°</button><button class="view-spot" data-action="spot" data-id="'+spot.id+'" aria-label="View '+spot.name+'">View spot '+icon('arrow-right')+'</button></div></div></article>';
}

function selectPin(id) {
  highlight=id;
  showStage('map');
  render();
  map.focus(spotById(id));
}

function renderSpotlight(id,destination,firstId) {
  const panel=$('#map-spotlight');
  const spot=spotById(id);
  panel.hidden=!spot;
  if (!spot) {panel.replaceChildren();return;}
  const {vehicle,duration,sort}=state.query;
  const free=capacity(spot,vehicle,state);
  const topLabel={distance:'Closest match',price:'Lowest price',rating:'Top rated'}[sort];
  const label=id===firstId ? topLabel : 'Selected spot';
  panel.innerHTML='<div class="spotlight-content"><div class="spotlight-kicker">'+icon('locate')+' '+label+'<span class="status'+(free?'':' full')+'">'+(free?free+' open':'Unavailable')+'</span></div><div class="spotlight-heading"><h3>'+spot.name+'</h3><strong class="spotlight-price">'+amount(totalFor(spot,vehicle,duration))+'</strong></div><p class="spotlight-meta">'+distanceText(distance(destination,spot))+' straight-line · '+spot.type+' · '+durationText(duration)+' total</p><div class="spotlight-actions"><button class="secondary" data-action="panorama" data-id="'+id+'" aria-label="360° preview of '+spot.name+'">'+icon('rotate')+' 360°</button><button class="'+(free?'primary':'secondary')+'" data-action="spot" data-id="'+id+'">'+(free?'View spot':'See details')+' '+icon('arrow-right')+'</button></div></div>';
}

function modal(kicker,title,html,{wide=false}={}) {
  if (cleanupPanorama) {cleanupPanorama();cleanupPanorama=null;}
  studio.classList.toggle('wide',wide);
  content.innerHTML='<section class="modal-wrap"><header class="modal-head"><div><p class="modal-kicker">'+esc(kicker)+'</p><h2 class="modal-title" id="modal-title">'+esc(title)+'</h2></div><button class="close" data-action="close" aria-label="Close dialog">'+icon('close')+'</button></header><div class="modal-body">'+html+'</div></section>';
  if (!studio.open) studio.showModal();
  else content.querySelector('.close').focus();
}

studio.addEventListener('close',()=>{
  mode=null;
  if (cleanupPanorama) {cleanupPanorama();cleanupPanorama=null;}
});

function toast(text) {
  const node=$('#toast');
  clearTimeout(toastTimer);
  node.textContent=text;
  node.hidden=false;
  toastTimer=setTimeout(()=>{node.hidden=true;},3800);
}

function spotDetails(spot) {
  mode='spot';
  const query=state.query;
  const free=capacity(spot,query.vehicle,state);
  const hold=getBooking(state);
  const locked=Boolean(hold);
  modal(spot.type+' · '+spot.area,spot.name,
    '<div class="detail-grid"><div><small>Distance</small><b>'+distanceText(distance(placeById(query.destination),spot))+'</b></div><div><small>'+durationText(query.duration)+'</small><b>'+amount(totalFor(spot,query.vehicle,query.duration))+'</b></div><div><small>Availability</small><b>'+(free?free+' open':'Full')+'</b></div></div><p><b>Address</b><br>'+spot.address+'</p><div class="note-box"><b>How to enter</b><br>'+spot.entry+'</div><div><b>Amenities</b><div class="amenities">'+spot.amenities.map(value=>'<span>'+value+'</span>').join('')+'</div></div><p class="modal-small">'+amount(rateFor(spot,query.vehicle))+'/hr · ★ '+spot.rating.toFixed(1)+' sample rating · Distance is straight-line.</p><div class="modal-actions"><button class="secondary" data-action="panorama" data-id="'+spot.id+'">'+icon('rotate')+' 360° preview</button><a class="secondary" href="'+directionsLink(spot,query.vehicle)+'" target="_blank" rel="noopener">'+icon('direction')+' Directions</a></div><div class="modal-actions">'+(locked?'<button class="primary" data-action="sessions">View my parking</button>':'<button class="primary" data-action="reserve" data-id="'+spot.id+'" '+(free?'':'disabled')+'>'+(free?'Reserve spot · '+amount(totalFor(spot,query.vehicle,query.duration)):'Unavailable for this vehicle')+'</button>')+'</div>');
}

function panorama(spot) {
  mode='panorama';
  modal('360° parking preview',spot.name,
    '<div class="panorama-host"></div><p class="modal-small">Drag or use the arrow keys to look around. This 3D scene illustrates the entry and layout using sample data.</p><div class="modal-actions"><button class="secondary" data-action="spot" data-id="'+spot.id+'">View amenities &amp; entry '+icon('arrow-right')+'</button></div>',{wide:true});
  cleanupPanorama=mountPanorama(content.querySelector('.panorama-host'),spot);
}

function showDemo() {
  mode='demo';
  modal('Gurugram prototype','What’s simulated?',
    '<ul class="scenario-list"><li>Parking locations, prices, availability and receipts use sample data. Arrival and departure are self-reported.</li><li>OpenStreetMap supplies map imagery when available. The map has an offline schematic, and directions use approximate pins.</li><li>360° previews are generated 3D scenes. Parking and reviews stay in this browser when it supports storage.</li><li>Forest growth is based on time parked in this demo. Each tree represents two parked hours. The percentage tracks the next tree milestone.</li></ul>');
}

function sessionLink(booking,spot) {
  return '<a class="secondary" href="'+directionsLink(spot,booking.vehicle)+'" target="_blank" rel="noopener">'+icon('direction')+' Open Google Maps</a>';
}

function showSessions() {
  const booking=getBooking(state);
  const pending=state.bookings.find(value=>value.id===state.reviewPending && value.status==='ended' && !value.review);
  if (!booking && pending) {showReview(pending);return;}
  mode='sessions';
  if (!booking) {
    const past=state.bookings.filter(value=>value.status==='ended');
    modal('My parking',past.length?'Parking history':'Your parking',
      past.length ? past.slice(0,8).map(value=>'<div class="session-item"><b>'+esc(spotById(value.spot)?.name??'Parking')+'</b><small>'+amount(value.amount)+' paid (demo) · '+(value.overstay?'Ended after time limit':'Ended on time')+(value.review?' · ★ '+value.review.stars+'/5':'')+'</small></div>').join('') : '<p>Your reservations and active session will appear here.</p><div class="modal-actions"><button class="primary" data-action="close">Explore parking</button></div>');
    return;
  }
  const spot=spotById(booking.spot);
  const vehicle=booking.vehicle==='car'?'Car':'Bike';
  const receipt='<div class="detail-grid"><div><small>Booking code</small><b>'+esc(booking.id)+'</b></div><div><small>Vehicle</small><b>'+vehicle+'</b></div><div><small>'+durationText(booking.minutes)+'</small><b>'+amount(booking.amount)+'</b></div></div>';
  if (booking.status==='reserved') {
    modal('Reservation confirmed',spot.name,
      receipt+'<p>One spot is reserved. Your timer starts when you confirm you’ve parked.</p><div class="note-box"><b>'+spot.address+'</b><br>'+spot.entry+'</div><div class="modal-actions">'+sessionLink(booking,spot)+'<button class="primary" data-action="arrive" data-id="'+booking.id+'">'+icon('check')+' I’ve parked · Pay '+amount(booking.amount)+'</button></div><p class="modal-small">Demo payment. No money will be charged.</p><button class="text-button" data-action="cancel" data-id="'+booking.id+'">Cancel reservation</button>');
  } else {
    modal('Active parking session',spot.name,
      '<div class="session-timer"><strong id="session-time" aria-hidden="true">00:00</strong><span id="session-caption"></span><p class="screen-reader-alert" id="timer-alert" role="alert"></p></div>'+receipt+'<div class="note-box"><b>'+icon('check')+' Demo payment successful</b><br>'+amount(booking.amount)+' · receipt '+esc(booking.receipt)+' · ends '+clockFormat.format(booking.ends)+' IST</div><div class="modal-actions"><button class="primary" data-action="leave" data-id="'+booking.id+'">I’ve moved my vehicle '+icon('arrow-right')+'</button><button class="secondary" data-action="forest">'+icon('tree')+' View my forest</button></div><button class="text-button" data-action="expire" data-id="'+booking.id+'">Demo clock · Simulate time expiry</button>');
    tick();
  }
}

function showReview(booking) {
  const spot=spotById(booking.spot);
  mode='review';
  const choices=[1,2,3,4,5].map(value=>'<label><input type="radio" name="rating" value="'+value+'" aria-label="'+value+' star'+(value===1?'':'s')+'"><span aria-hidden="true">★</span></label>').join('');
  modal('Parking completed','How was your parking?',
    '<p>You’ve checked out of <b>'+spot.name+'</b>.</p><form id="review-form"><fieldset class="rating" aria-describedby="review-feedback"><legend class="modal-small">Rate this spot from 1 to 5 stars</legend>'+choices+'</fieldset><label class="modal-small" for="review-note">Add a comment (optional)</label><textarea id="review-note" name="note" class="modal-input" rows="2" maxlength="300" placeholder="How was the gate, lighting or availability?"></textarea><p id="review-feedback" class="review-feedback" role="alert" hidden></p><div class="modal-actions"><button id="review-submit" class="primary" type="submit">Submit review '+icon('arrow-right')+'</button><button class="text-button" type="button" data-action="close">Skip for now</button></div></form>');
  const form=$('#review-form');
  form.addEventListener('change',()=>{$('#review-feedback').hidden=true;});
  form.addEventListener('submit',event=>submitReview(event,booking.id));
}

async function submitReview(event,id) {
  event.preventDefault();
  const form=event.currentTarget;
  const data=new FormData(form);
  const stars=Number(data.get('rating'));
  const feedback=$('#review-feedback');
  if (!stars) {
    feedback.textContent='Choose a star rating to submit your review.';
    feedback.hidden=false;
    form.querySelector('[name="rating"]')?.focus();
    return;
  }
  const button=$('#review-submit');
  button.disabled=true;
  let saved;
  try {saved=await changeBooking(value=>review(value,id,stars,String(data.get('note')??'')));}
  catch {
    feedback.textContent='Couldn’t save the review. Please try again.';
    feedback.hidden=false;
    button.disabled=false;
    return;
  }
  if (studio.open && mode==='review' && form.isConnected) studio.close();
  render();
  toast(saved?'Review saved. Thanks for parking with ParkEasy.':'This parking session no longer has a review to submit.');
}

function timerText(seconds) {
  const values=[Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60];
  return (values[0] ? values : values.slice(1)).map(value=>String(value).padStart(2,'0')).join(':');
}

function tick() {
  renderForest();
  const booking=getBooking(state);
  const banner=$('#booking-banner');
  const ended=!booking && state.bookings.some(value=>value.id===state.reviewPending && value.status==='ended' && !value.review);
  const active=booking?.status==='active';
  const expired=active && demoClock(booking)>=booking.ends;
  $('#nav-dot').hidden=!booking && !ended;
  banner.hidden=!booking && !ended;
  if (banner.hidden) {banner.replaceChildren();return;}
  banner.classList.toggle('overdue',expired);
  const label=ended?'Parking complete · Rate the spot':expired?'Time exceeded · Please move your vehicle':active?'Parking active · '+spotById(booking.spot).name:'Spot reserved · '+spotById(booking.spot).name;
  if (banner.dataset.label!==label || !banner.firstChild) {
    banner.dataset.label=label;
    banner.innerHTML='<strong>'+esc(label)+'</strong><button data-action="sessions">'+(ended?'Leave a review':'My parking')+'</button>';
  }
  if (active && mode==='sessions') {
    const seconds=Math.ceil(Math.abs(booking.ends-demoClock(booking))/1000);
    const timer=$('#session-time');
    if (timer) {
      timer.textContent=(expired?'+':'')+timerText(seconds);
      timer.parentElement.classList.toggle('overdue',expired);
      $('#session-caption').textContent=expired?'Time exceeded. Please move your vehicle now.':'Time remaining';
    }
  }
  if (expired && alertedBooking!==booking.id) {
    alertedBooking=booking.id;
    if ($('#timer-alert')) $('#timer-alert').textContent='Your parking time is over. Please move your vehicle.';
    else toast('Your parking time is over. Please move your vehicle.');
  }
}

function agentFeedback(text='') {
  const status=$('#agent-feedback');
  status.textContent=text;
  status.hidden=!text;
}

function clearAgentOffer() {
  agentRequest++;
  agentOffer=null;
  $('#agent-response').hidden=true;
  agentFeedback();
}

function renderAgentOffer(offer) {
  const {spot,query,requestedDuration}=offer;
  const panel=$('#agent-response');
  const vehicle=query.vehicle==='bike' ? 'Bike' : 'Car';
  const place=placeById(query.destination);
  const bestLabel={price:'Lowest-price match',rating:'Highest-rated match',distance:'Closest match'}[query.sort];
  const notes=preferences(query);
  if (requestedDuration && requestedDuration!==query.duration) notes.push('Available duration is '+durationText(query.duration));
  const held=getBooking(state);
  panel.innerHTML='<p class="agent-result-label">'+bestLabel+'</p><h3 class="agent-result-title">'+spot.name+'</h3><p class="agent-result-details">'+vehicle+' · '+durationText(query.duration)+' · '+distanceText(spot.dist)+' straight-line from '+place.name+'</p>'+(notes.length?'<p class="agent-result-preferences">'+esc(notes.join(' · '))+'</p>':'')+'<div class="agent-result-actions"><button type="button" class="primary" data-action="'+(held?'sessions':'reserve')+'" data-id="'+spot.id+'" data-source="agent">'+(held?'View my parking':'Reserve · '+amount(spot.price))+' '+icon('arrow-right')+'</button><button type="button" class="secondary" data-action="panorama" data-id="'+spot.id+'" aria-label="360° preview of '+spot.name+'">'+icon('rotate')+' 360°</button></div>';
  panel.hidden=false;
}

async function findAgentSpot(text) {
  clearAgentOffer();
  if (!text) {agentFeedback('Try “Car parking near CyberHub for 2 hours”.');agentInput.focus();return;}
  const request=agentRequest;
  agentFeedback('Finding your best spot…');
  let intent;
  try {intent=await interpretRequest(text);}
  catch {intent={clarification:'Try a DLF landmark, vehicle and duration.'};}
  if (request!==agentRequest) return;
  if (intent.clarification || !Object.keys(intent.criteria??{}).length) {
    agentFeedback(intent.clarification || 'Add a DLF destination, vehicle or duration.');
    return;
  }
  const {vehicle,duration,destination}=state.query;
  const query={...initialQuery,vehicle,duration,destination,...intent.criteria};
  applyQuery(query,true);
  const [spot]=recommendations(query,state);
  if (!spot) {
    agentFeedback('No spot matches this request near '+placeById(query.destination).name+'. Try a higher budget or fewer filters.');
    return;
  }
  agentFeedback('Found a spot you can reserve.');
  agentOffer={spot,query,requestedDuration:intent.requestedDuration};
  renderAgentOffer(agentOffer);
}

function applyQuery(next,fly=false) {
  state=loadState(storage);
  state.query={...state.query,...next};
  highlight=null;
  save();
  syncControls();
  if (fly) showStage('map');
  render(fly);
}

$('#search-form').addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(event.currentTarget);
  clearAgentOffer();
  applyQuery({...initialQuery,destination:data.get('destination'),duration:Number(data.get('duration')),vehicle:data.get('vehicle')},true);
});
$('#sort').onchange=event=>{clearAgentOffer();applyQuery({sort:event.target.value});};
$('#type-filters').onclick=event=>{
  const type=event.target.closest('[data-type]')?.dataset.type;
  if (type!==undefined) {clearAgentOffer();applyQuery({type});}
};
$('#nav-explore').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
$('#nav-sessions').onclick=showSessions;
$('#demo-info').onclick=showDemo;
$('#footer-info').onclick=showDemo;
for (const view of ['forest','map']) {
  const tab=$('#'+view+'-tab');
  tab.addEventListener('click',()=>{
    showStage(view);
    if (view==='map') render(true);
  });
  tab.addEventListener('keydown',event=>{
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const next=event.key==='Home'?'forest':event.key==='End'?'map':(view==='map'?'forest':'map');
    showStage(next);
    $('#'+next+'-tab').focus();
    if (next==='map') render(true);
  });
}
agentInput.addEventListener('input',clearAgentOffer);
agentForm.addEventListener('submit',event=>{
  event.preventDefault();
  return findAgentSpot(agentInput.value.trim());
});

async function bookSpot(button,id) {
  const fromAgent=button.dataset.source==='agent';
  const quote=fromAgent ? agentOffer : null;
  if (fromAgent && quote?.spot.id!==id) return;
  const query={...(quote?.query ?? state.query)};
  const code='PE'+globalThis.crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(6,'0');
  button.disabled=true;
  let booking;
  try {booking=await changeBooking(value=>reserve(value,spotById(id),Date.now(),code,query));}
  catch {
    button.disabled=false;
    if (fromAgent) agentFeedback('Couldn’t book this spot. Try again.');
    else toast('Couldn’t book this spot. Try again.');
    return;
  }
  render();
  if (booking) {
    clearAgentOffer();
    if (fromAgent) agentFeedback('Reserved. Find your booking under My parking.');
    showSessions();
    return;
  }
  if (fromAgent && agentOffer===quote) {
    if (getBooking(state)) {
      renderAgentOffer(quote);
      agentFeedback('You already have a parking session.');
    } else {
      clearAgentOffer();
      agentFeedback('That spot is no longer available. Find your next match.');
    }
  } else if (!fromAgent) {
    spotDetails(spotById(id));
    toast('This spot could not be reserved. Check availability or My parking.');
  }
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');
  if (!button) return;
  const {id,action}=button.dataset;
  if (action==='close') studio.close();
  if (action==='spot') spotDetails(spotById(id));
  if (action==='panorama') panorama(spotById(id));
  if (action==='sessions') showSessions();
  if (action==='forest') {
    showStage('forest');
    studio.close();
    $('#forest-tab').focus({preventScroll:true});
    const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
    $('#forest-view').scrollIntoView({block:'nearest',behavior});
  }
  if (action==='forest-rotate') forest.rotate();
  if (action==='forest-simulate') {
    button.disabled=true;
    try {
      await changeBooking(value=>{
        const booking=getBooking(value);
        if (booking?.status!=='active') return false;
        booking.fastForwardMs=(booking.fastForwardMs??0)+30*60_000;
        return true;
      });
      tick();
    } finally {button.disabled=false;}
  }
  if (action==='focus') {
    selectPin(id);
    document.querySelector('.spot-select[data-id="'+id+'"]')?.focus({preventScroll:true});
    if (window.matchMedia('(max-width: 760px)').matches) {
      const behavior=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
      $('#map').scrollIntoView({block:'center',behavior});
    }
  }
  if (action==='clear-amenity') {
    clearAgentOffer();
    applyQuery({amenity:'',amenities:[],maxPrice:null,maxHourlyPrice:null});
  }
  if (action==='example') {
    agentInput.value=button.dataset.example;
    await findAgentSpot(agentInput.value);
  }
  if (action==='reserve') await bookSpot(button,id);
  if (action==='arrive') {
    button.disabled=true;
    if (await changeBooking(value=>arrive(value,id,Date.now()))) toast('Demo payment successful. Parking timer started.');
    render();
    showSessions();
  }
  if (action==='expire') {
    await changeBooking(value=>{
      const booking=getBooking(value);
      if (booking?.id!==id || booking.status!=='active') return false;
      booking.fastForwardMs=Math.max(booking.fastForwardMs??0,booking.ends-Date.now()+1000);
      return true;
    });
    tick();
  }
  if (action==='leave') {
    button.disabled=true;
    await changeBooking(value=>{
      const booking=getBooking(value);
      return booking ? leave(value,id,demoClock(booking)) : null;
    });
    render();
    showSessions();
  }
  if (action==='cancel') {
    await changeBooking(value=>{
      const booking=getBooking(value);
      if (booking?.id!==id || booking.status!=='reserved') return false;
      booking.status='cancelled';
      return true;
    });
    render();
    studio.close();
    toast('Reservation cancelled. The spot is available again.');
  }
});

window.addEventListener('storage',event=>{
  if (event.key!==storageKey || memoryOnly) return;
  state=loadState(storage);
  syncControls();
  render();
  if (mode==='sessions') showSessions();
});
syncControls();
render();
setInterval(tick,1000);
