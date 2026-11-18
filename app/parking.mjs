export const destinations = [
  {id:'cyberhub',name:'DLF CyberHub',sub:'DLF Cyber City, Gurugram',lat:28.495005,lng:77.088602,aliases:['cyber hub','cyberhub','cyber city','cybercity','dlf','gurgaon','gurugram']},
  {id:'gateway',name:'DLF Gateway Tower',sub:'Cyber City, Gurugram',lat:28.49451,lng:77.08675,aliases:['gateway tower','gateway','infinity tower']},
  {id:'moulsari',name:'Moulsari Avenue',sub:'DLF Phase 3, Gurugram',lat:28.49865,lng:77.09227,aliases:['moulsari','phase 3','phase iii','28 sector']},
  {id:'ambience',name:'Ambience Mall',sub:'NH 48, Gurugram',lat:28.50402,lng:77.09616,aliases:['ambience mall','ambience','mall']}
];

export const parking = [
  {id:'ch-north',name:'CyberHub North Parking',type:'Public lot',code:'A01',area:'CyberHub · North entry',lat:28.49552,lng:77.08939,car:6,bike:9,rate:60,bikeRate:25,rating:4.8,scene:'open',amenities:['CCTV','Security','Well lit'],entry:'Demo entrance on the north service lane. Follow the green P signage to bay A01.',address:'CyberHub North service lane, DLF Cyber City, Gurugram'},
  {id:'tower-c',name:'Tower C Visitor Parking',type:'Office',code:'B02',area:'DLF Cyber City · Basement 1',lat:28.49415,lng:77.08961,car:3,bike:4,rate:80,bikeRate:35,rating:4.9,scene:'garage',amenities:['Covered','CCTV','EV charging','Security'],entry:'Use the visitor ramp beside the office lobby. Stop at the barrier and follow B1 signs.',address:'Visitor ramp, DLF Cyber City, Gurugram'},
  {id:'gateway-lot',name:'Gateway Visitor Deck',type:'Office',code:'G04',area:'Gateway Tower · Ground level',lat:28.49424,lng:77.08741,car:4,bike:3,rate:50,bikeRate:20,rating:4.6,scene:'deck',amenities:['Covered','Security','Lift access'],entry:'Stay left at the demo visitor gate. The first accessible bays are beside the lift lobby.',address:'DLF Gateway Tower service lane, Gurugram'},
  {id:'cyber-east',name:'Cyber City East Lot',type:'Public lot',code:'E09',area:'Building 10 · East service lane',lat:28.49622,lng:77.09055,car:8,bike:12,rate:40,bikeRate:15,rating:4.5,scene:'street',amenities:['Well lit','CCTV','Wide bays'],entry:'Turn in from the east service lane. Follow the arrows to the open parking rows.',address:'East service lane near Building 10, DLF Cyber City, Gurugram'},
  {id:'oak',name:'Oak Court Visitor Bays',type:'Society',code:'S06',area:'DLF Phase 3 · Guest gate',lat:28.49398,lng:77.0914,car:2,bike:2,rate:45,bikeRate:20,rating:4.7,scene:'court',amenities:['Covered','Security','Well lit'],entry:'The demo guest barrier opens onto the courtyard. Follow the marked visitor bays.',address:'Guest gate near DLF Phase 3, Gurugram'},
  {id:'ch-south',name:'CyberHub South Parking',type:'Public lot',code:'A07',area:'CyberHub · South entry',lat:28.49387,lng:77.08819,car:0,bike:0,rate:55,bikeRate:20,rating:4.4,scene:'open',amenities:['CCTV','Well lit'],entry:'Demo south entrance by the plaza service road.',address:'CyberHub South service lane, DLF Cyber City, Gurugram'},
  {id:'tower-a',name:'Tower A Basement',type:'Office',code:'T01',area:'Cyber City · Basement 2',lat:28.49623,lng:77.08768,car:0,bike:2,rate:65,bikeRate:25,rating:4.7,scene:'garage',amenities:['Covered','CCTV','Lift access'],entry:'Use the right-hand lane for two-wheelers at the demo basement ramp.',address:'Tower A service lane, DLF Cyber City, Gurugram'},
  {id:'phase-gate',name:'Orchid Residency Guest Lot',type:'Society',code:'S03',area:'DLF Phase 3 · Main gate',lat:28.4961,lng:77.09217,car:0,bike:0,rate:35,bikeRate:15,rating:4.5,scene:'court',amenities:['Security','Well lit'],entry:'Use the demo society visitor gate beside the guard kiosk.',address:'DLF Phase 3, Gurugram'},
  {id:'moulsari-open',name:'Moulsari Avenue Parking',type:'Public lot',code:'M02',area:'Moulsari Avenue · Station side',lat:28.49835,lng:77.09237,car:5,bike:11,rate:30,bikeRate:15,rating:4.4,scene:'street',amenities:['Well lit','Wide bays'],entry:'Open demo lot on the station side of the avenue.',address:'Moulsari Avenue, DLF Phase 3, Gurugram'},
  {id:'ambience-deck',name:'Ambience Visitor Deck',type:'Public lot',code:'M11',area:'Ambience Mall · West approach',lat:28.50351,lng:77.09527,car:8,bike:10,rate:70,bikeRate:30,rating:4.6,scene:'deck',amenities:['Covered','CCTV','Lift access'],entry:'Follow the demo West approach signs to visitor level.',address:'West approach, Ambience Mall area, Gurugram'},
  {id:'ambience-front',name:'Mall Front Visitor Lot',type:'Office',code:'M12',area:'NH 48 · Service lane',lat:28.50466,lng:77.09523,car:0,bike:0,rate:70,bikeRate:25,rating:4.4,scene:'open',amenities:['CCTV','Security'],entry:'Demo entrance off the NH 48 service lane.',address:'NH 48 service lane near Ambience Mall, Gurugram'}
];

export const durations = [30,60,90,120,180,240,360];
export const durationText = value => value < 60 ? value + ' min' : (Math.floor(value / 60) + ' hr' + (value % 60 ? ' ' + value % 60 + ' min' : ''));
export const rateFor = (spot,vehicle) => vehicle === 'bike' ? spot.bikeRate : spot.rate;
export const totalFor = (spot,vehicle,duration) => Math.ceil(rateFor(spot,vehicle) * duration / 60);
export const getBooking = state => state.bookings.find(booking => booking.status === 'reserved' || booking.status === 'active');
export const capacity = (spot,vehicle,state) => Math.max(0, spot[vehicle] - state.bookings.filter(booking => booking.spot === spot.id && booking.vehicle === vehicle && ['reserved','active'].includes(booking.status)).length);

export function distance(a,b) {
  const rad = Math.PI / 180;
  const p = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return Math.round(12742000 * Math.asin(Math.min(1,Math.sqrt(p))));
}

export const distanceText = metres => metres < 1000 ? metres + ' m' : (metres / 1000).toFixed(1) + ' km';

export function recommendations(query,state) {
  const dest = destinations.find(place => place.id === query.destination) ?? destinations[0];
  const close = parking.map(spot => ({...spot,dist:distance(dest,spot),price:totalFor(spot,query.vehicle,query.duration)}))
    .filter(spot => capacity(spot,query.vehicle,state) && (!query.type || spot.type === query.type) && (!query.amenity || spot.amenities.includes(query.amenity)));
  return close.sort((a,b) => {
    if (query.sort === 'price') return a.price - b.price || a.dist - b.dist;
    if (query.sort === 'rating') return b.rating - a.rating || a.dist - b.dist;
    return a.dist - b.dist || a.price - b.price;
  }).slice(0,5);
}

export const initialQuery = {vehicle:'car',destination:'cyberhub',duration:120,type:'',amenity:'',sort:'distance'};
export const initialState = () => ({query:{...initialQuery},bookings:[],reviewPending:null});
export const storageKey = 'parkeasy-dlf-v1';

export function loadState(storage) {
  try {
    const saved = JSON.parse(storage.getItem(storageKey));
    if (saved && Array.isArray(saved.bookings)) return {...initialState(),...saved,query:{...initialQuery,...saved.query}};
  } catch {}
  return initialState();
}

export function reserve(state, spot, time, id) {
  const {vehicle,duration,destination} = state.query;
  if (getBooking(state) || state.reviewPending || !capacity(spot,vehicle,state)) return null;
  const booking = {id,spot:spot.id,vehicle,minutes:duration,destination,amount:totalFor(spot,vehicle,duration),created:time,status:'reserved'};
  state.bookings.unshift(booking);
  return booking;
}

export function arrive(state,id,time) {
  const booking = state.bookings.find(value => value.id === id && value.status === 'reserved');
  if (!booking) return null;
  Object.assign(booking,{status:'active',started:time,ends:time+booking.minutes*60000,paid:time,receipt:'DEMO-'+id});
  return booking;
}

export function leave(state,id,time) {
  const booking = state.bookings.find(value => value.id === id && value.status === 'active');
  if (!booking) return null;
  Object.assign(booking,{status:'ended',ended:time,overstay:time >= booking.ends});
  state.reviewPending = id;
  return booking;
}

export function review(state,id,stars,note) {
  const booking = state.bookings.find(value => value.id === id && value.status === 'ended');
  if (!booking || id !== state.reviewPending || !Number.isInteger(stars) || stars < 1 || stars > 5) return false;
  booking.review = {stars,note:note.trim().slice(0,300)};
  state.reviewPending = null;
  return true;
}
