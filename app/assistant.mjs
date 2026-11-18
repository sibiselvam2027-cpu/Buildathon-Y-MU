import {destinations,durations} from './parking.mjs';

export const modelName = 'Xenova/all-MiniLM-L6-v2';
const runtime = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
let extractor;
let reference;
let modelState = 'idle';
let warming;

const intents = [
  ['sort','price','Keep the price down, I am on a tight budget, show inexpensive parking'],
  ['sort','rating','I want the most highly rated parking with excellent visitor reviews'],
  ['sort','distance','I want a very short walk, pick the spot nearest my destination'],
  ['amenity','Covered','Find a sheltered parking space away from direct sunlight and rain'],
  ['amenity','Security','Find a staffed parking spot with a guard on duty'],
  ['amenity','CCTV','Find a monitored parking space using video surveillance cameras'],
  ['amenity','EV charging','I want a plug to charge my electric vehicle while it is parked'],
  ['amenity','Wide bays','I need a spacious parking bay for a large vehicle'],
  ['amenity','Well lit','Find bright parking with good visibility at night'],
  ['amenity','Lift access','I need an elevator to get from parking to the lobby'],
  ['type','Office','I want to park in a commercial office building visitor car park'],
  ['type','Society','I want parking inside a residential apartment community or housing complex'],
  ['type','Public lot','I want an open parking lot that is open to the public'],
  ['vehicle','car','I am driving my car, hatchback, sedan or sports utility vehicle'],
  ['vehicle','bike','I am riding a scooter, motorcycle or another two-wheeler'],
  ['destination','cyberhub','I am going to DLF CyberHub, the restaurant and shopping plaza in Cyber City'],
  ['destination','gateway','I am going to DLF Gateway Tower in Cyber City'],
  ['destination','moulsari','I am headed to the Moulsari Avenue rapid metro station in DLF Phase 3'],
  ['destination','ambience','I want to visit Ambience Mall, the mall on the highway in Gurugram']
];

export const assistantStatus = () => modelState;

export function warmAssistant() {
  if (warming) return warming;
  modelState = 'loading';
  warming = import(runtime).then(async ({pipeline,env}) => {
    env.allowLocalModels = false;
    const wasm = env.backends?.onnx?.wasm;
    if (wasm) {
      wasm.numThreads = 1;
      wasm.proxy = false;
    }
    extractor = await pipeline('feature-extraction',modelName,{device:'wasm',dtype:'q8'});
    const samples = await extractor(intents.map(intent=>intent[2]),{pooling:'mean',normalize:true});
    reference = samples.tolist();
    modelState = 'ready';
    return true;
  }).catch(()=>{
    modelState = 'unavailable';
    return false;
  });
  return warming;
}

const numberWords = {
  one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  fifteen:15, twenty:20, thirty:30, forty:40, fortyfive:45, fifty:50, sixty:60, ninety:90,
  ek:1, do:2, teen:3, char:4, chaar:4, paanch:5, panch:5, che:6, chhe:6, saat:7, aath:8,
  dedh:1.5, derh:1.5, dhai:2.5, aadha:.5, adha:.5, pandrah:15, bees:20, tees:30
};
const timeUnit = '(?:hours?|hrs?|h|ghante|ghanta|ghanton|ghnta|minutes?|mins?|m|minat)';
const wordTime = new RegExp('\\b('+Object.keys(numberWords).join('|')+')\\s+(?='+timeUnit+'\\b)','g');
const broadAreas = new Set(['dlf','gurgaon','gurugram','mall']);
const extraAliases = {
  cyberhub:['cyber hub plaza','cybr hub','cyber hubb','cyberhub metro'],
  gateway:['dlf gateway','infinity towers'],
  moulsari:['moulsari metro','moulsari av','maulsari','dlf phase three'],
  ambience:['ambiance mall','ambiance']
};
const placePatterns = destinations.flatMap(({id,aliases})=>[...aliases,...extraAliases[id]]
  .filter(alias=>!broadAreas.has(alias))
  .map(alias=>({id,alias,pattern:new RegExp('\\b'+alias+'\\b')})))
  .sort((a,b)=>b.alias.length-a.alias.length);
const supportedPlaces = 'Choose CyberHub, Gateway Tower, Moulsari Avenue or Ambience Mall.';
const amenityPatterns = [
  ['EV charging',/\b(ev charg\w*|charg(?:e|er|ing)|electric vehicle)\b/],
  ['Covered',/\b(covered|shade|shaded|shelter(?:ed)?|indoors?|rain|basement|chhaon)\b/],
  ['CCTV',/\b(cctv|cameras?|surveillance)\b/],
  ['Security',/\b(security|secured|guard(?:ed)?|staffed)\b/],
  ['Wide bays',/\b(wide(?:r)?|spacious|big (?:bay|space))\b/],
  ['Well lit',/\b(well lit|bright|lighting|lights)\b/],
  ['Lift access',/\b(lift|elevator)\b/]
];

function normalizeRequest(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase()
    .replace(/[\u2010-\u2015-]/g,' ')
    .replace(/\b(an hour and a half|one and a half hours?)\b/g,'1.5 hours')
    .replace(/\b(\d+)\s+and a half\s+(hours?|hrs?)\b/g,(_, hours, unit)=>String(Number(hours)+.5)+' '+unit)
    .replace(/\b(?:forty five|45)\s+(minutes?|mins?)\b/g,'45 $1')
    .replace(/\bhalf an hour\b/g,'30 minutes')
    .replace(/\b(?:an?|one)\s+hour\b/g,'1 hour')
    .replace(wordTime,word=>String(numberWords[word.trim()])+' ')
    .replace(/\s+/g,' ').trim();
}

function readDuration(query) {
  const hours = query.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ghante|ghanta|ghanton|ghnta|h)(?=\d|\W|$)/);
  const minutes = query.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|minat)\b/)
    ?? (hours ? query.match(/(?:^|\D)(\d+(?:\.\d+)?)\s*m\b/) : query.match(/\b(?:for|duration(?: is)?)\s+(\d+(?:\.\d+)?)\s*m\b/));
  if (!hours && !minutes) return null;
  return Math.ceil((Number(hours?.[1] ?? 0)*60)+Number(minutes?.[1] ?? 0));
}

function readPrice(query) {
  const budget = query.match(/(?:\b(?:under|below|up to|less than|at most|budget(?: of| is)?|max(?:imum)?(?: of)?)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)|(?:₹|\brs\.?\s*|\binr\s+)(\d[\d,]*(?:\.\d+)?)(?:\s*(?:rupees)?\s*(?:or less|max(?:imum)?))?)/);
  if (!budget) return {};
  const suffix = query.slice(budget.index+budget[0].length);
  if (!/[₹]|\brs\b|\binr\b/.test(budget[0]) && /^\s*(?:mins?|minutes?|m|km|met(?:er|re)s?|hours?|hrs?|h|ghante)\b/.test(suffix)) return {};
  const maxPrice = Math.floor(Number((budget[1] ?? budget[2]).replace(/,/g,'')));
  const hourly = /^(?:\s*(?:rupees|rs\.?|inr|ka))?\s*(?:\/\s*(?:hr|h|hour)|per\s+(?:hr|hour)|an hour|hourly)\b/.test(suffix);
  return hourly ? {maxHourlyPrice:maxPrice} : {maxPrice};
}

function readRequest(text) {
  const query = normalizeRequest(text);
  const criteria = {};
  const result = {criteria,usedModel:false,clarification:null,requestedDuration:null};
  const clarify = clarification=>({...result,clarification});

  const bike = /\b(bikes?|scoot(?:er|y|ie)|(?:two|2)\s*wheeler|motor(?:cycle|bike)|bullet|activa|moped)\b/.test(query);
  const car = /\b(cars?|hatchback|sedan|suv|(?:four|4)\s*wheeler)\b/.test(query);
  if (/\b(truck|lorry|tempo|bicycle|school bus)\b/.test(query)) return clarify('This pilot supports cars and motorbikes. Which are you parking?');
  if (bike && car) return clarify('Are you parking a car or a motorbike?');
  if (bike || car) criteria.vehicle = bike?'bike':'car';

  const destination = placePatterns.find(({pattern})=>pattern.test(query));
  if (destination) {
    const uniqueAlternatives = query.split(/\bor\b/).map(part=>placePatterns.find(({pattern})=>pattern.test(part))?.id).filter(Boolean);
    if (new Set(uniqueAlternatives).size>1) return clarify('Which destination are you heading to? '+supportedPlaces);
    criteria.destination = destination.id;
  } else if (/\b(near me|my current location|my location|nearby me)\b/.test(query)) {
    return clarify('Tell me which landmark is closest to you. '+supportedPlaces);
  } else {
    const localArea = /\b(dlf|gurgaon|gurugram)\b/.test(query);
    const unsupportedArea = /\b(?:sector\s*\d+|phase\s*(?:[1245]|\bi\b|\bii\b|\biv\b|\bv\b)|airport|noida|delhi|huda city|golf course|sohna|connaught place|iffco chowk|mg road|aerocity)\b/.test(query);
    const locationCue = /\b(?:near(?: to)?|around|at|in|outside|opposite|beside|head(?:ing)? to|go(?:ing)? to|destination(?: is)?)\s+(?!(?:my|a|an|the)\s+(?:car|bike|scooter|open|covered|hour)\b)([a-z][a-z\d ]{2,})/.test(query);
    if (unsupportedArea || (locationCue && !localArea)) return clarify('I couldn’t match that location in the DLF pilot. '+supportedPlaces);
    if (localArea) criteria.destination = 'cyberhub';
  }

  if (/\b(?:overnight|full day|whole day|all day|tomorrow|tonight|next week|this weekend)\b|\b\d+\s*days?\b|\b(?:on|next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:at|from|until)\s+\d+(?::\d{2}\s*(?:am|pm)?|\s*(?:am|pm))\b/.test(query)) {
    return clarify('The demo reserves parking for right now, for 30 minutes to 6 hours.');
  }
  const requestedDuration = readDuration(query);
  if (requestedDuration!==null) {
    result.requestedDuration = requestedDuration;
    if (requestedDuration <= 0 || requestedDuration > durations.at(-1)) return clarify('Choose a duration from 30 minutes to 6 hours.');
    criteria.duration = durations.find(value=>value>=requestedDuration);
  }

  const price = readPrice(query);
  Object.assign(criteria,price);
  if (Object.keys(price).length || /\b(cheapest|cheap|affordable|budget|low(?:est)? price|inexpensive|sast[aei])\b/.test(query)) criteria.sort='price';
  else if (/\b(top rated|highly rated|best rated|best reviews)\b/.test(query)) criteria.sort='rating';
  else if (/\b(close|closest|nearest|short walk|paas)\b/.test(query)) criteria.sort='distance';

  const amenities = amenityPatterns.filter(([,pattern])=>pattern.test(query)).map(([feature])=>feature);
  if (amenities.length) criteria.amenity=amenities[0];
  if (amenities.length>1) criteria.amenities=amenities;
  if (/\b(society|apartment|residential)\b/.test(query)) criteria.type='Society';
  else if (/\b(office|corporate)\s+(?:parking|garage|lot|space|deck|bay)\b/.test(query)) criteria.type='Office';
  else if (/\b(public lot|public parking|municipal)\b/.test(query)) criteria.type='Public lot';

  if (!Object.keys(criteria).length && !/\b(park(?:ing)?|reserv(?:e|ation)|book|spots?)\b/.test(query)) {
    return clarify('Tell me where you’d like to park, your vehicle and how long you’ll stay.');
  }
  return result;
}

export const parseRequest = text => readRequest(text).criteria;

export async function interpretRequest(text) {
  const result = readRequest(text);
  if (result.clarification) return result;
  if (modelState!=='ready') {
    void warmAssistant();
    return result;
  }

  // An interpretation must never hold up a driver while a model is loading or busy.
  let timeout;
  const cutoff = new Promise(resolve=>{timeout=setTimeout(()=>resolve(result),180);});
  const embedding = Promise.resolve().then(()=>extractor(text,{pooling:'mean',normalize:true})).then(output=>{
    const vector=output.tolist()[0];
    const suggestions = reference.map((row,index)=>({intent:intents[index],score:row.reduce((sum,number,i)=>sum+number*vector[i],0)})).sort((a,b)=>b.score-a.score);
    const [first,second]=suggestions;
    if (first && first.score>.52 && first.score-(second?.score ?? 0)>.06) {
      const [field,value]=first.intent;
      if (['sort','amenity','type'].includes(field) && !Object.hasOwn(result.criteria,field)) return {...result,usedModel:true,criteria:{...result.criteria,[field]:value}};
    }
    return result;
  }).catch(()=>result);
  const match=await Promise.race([embedding,cutoff]);
  clearTimeout(timeout);
  return match;
}
