import {destinations,durations} from './parking.mjs';

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
  ambience:['ambiance mall','ambiance','ambient mall','ambient small','ambience small']
};
const placePatterns = destinations.flatMap(({id,name,aliases})=>[name,...(aliases??[]),...(extraAliases[id]??[])]
  .map(normalizeRequest)
  .filter(alias=>alias && !broadAreas.has(alias))
  .map(alias=>{
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const pattern = /^\d+$/.test(alias)
      ? new RegExp('(?:^'+escaped+'$|\\b(?:near|at|around|to)\\s+'+escaped+'\\b)')
      : new RegExp('\\b'+escaped+'\\b');
    return {id,alias,pattern};
  }))
  .sort((a,b)=>b.alias.length-a.alias.length);
const supportedPlaces = 'Try CyberHub or Ambience Mall, or choose a DLF landmark below.';
const unknownPlace = 'I couldn\'t match that location in the DLF pilot. '+supportedPlaces;
const outsideQualifiers = '(?:vasant kunj|new delhi|delhi(?!\\s+(?:ncr|gurgaon|gurugram|jaipur)\\b)|noida|greater noida|faridabad|ghaziabad|dwarka|aerocity|bengaluru|bangalore)';
const outsideAfterLandmark = new RegExp('^[\\s,(]+(?:(?:in|at|near)\\s+(?:the\\s+)?)?'+outsideQualifiers+'\\b');
const outsideBeforeLandmark = new RegExp('\\b'+outsideQualifiers+"(?:['’]s)?[\\s,(]+$");
const amenityPatterns = [
  ['EV charging',/\b(ev charg\w*|charg(?:e|er|ing)|electric vehicle)\b/],
  ['Covered',/\b(covered|shade|shaded|shelter(?:ed)?|indoors?|rain|basement|chhaon)\b/],
  ['CCTV',/\b(cctv|cameras?|surveillance)\b/],
  ['Security',/\b(security|secured|guard(?:ed)?|staffed)\b/],
  ['Wide bays',/\b(wide(?:r)?|spacious|big (?:bay|space))\b/],
  ['Well lit',/\b(well lit|bright|lighting|lights)\b/],
  ['Lift access',/\b(lift|elevator)\b/]
];
const amenityNames = new Set(amenityPatterns.map(([name])=>name));

function namesUnknownPlace(query) {
  if (/\b(?:sector\s*\d+|phase\s*(?:[1245]|\bi\b|\bii\b|\biv\b|\bv\b)|airport|noida|delhi|huda city|golf course|sohna|connaught place|iffco chowk|mg road|aerocity)\b/.test(query)) return true;
  const withoutArea = query.replace(/\b(?:dlf|gurgaon|gurugram)\b(?:\s+(?:area|region|district)\b)?/g,' ').replace(/\s+/g,' ');
  const requestedPlace = withoutArea.match(/\b(?:near(?: to)?|around|at|in|outside|opposite|beside|head(?:ing)? to|go(?:ing)? to|destination(?: is)?)\s+(?:(?:a|an|the)\s+)?([a-z][a-z\d ]*)/);
  if (requestedPlace && !/^(?:my car|my bike|my scooter|most|least|under|shade|security|cctv|case|advance|open|covered|cheap|public|paid|parking|basement|garage|lot|for|with|\d+)\b/.test(requestedPlace[1])) return true;
  return /\b(?:[a-z\d]+\s+)?(?:tower|building|mall|metro|plaza)\b/.test(withoutArea) || /\b\w+\s+ke paas\b/.test(withoutArea);
}

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

  if (/\b(?:overnight|full day|whole day|all day|tomorrow|tonight|next week|this weekend)\b|\b\d+\s*days?\b|\b(?:on|next|this)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|\b(?:at|from|until)\s+\d+(?::\d{2}\s*(?:am|pm)?|\s*(?:am|pm))\b/.test(query)) {
    return clarify('The demo reserves parking for right now, for 30 minutes to 6 hours.');
  }

  const destination = placePatterns.find(({pattern})=>pattern.test(query));
  if (destination) {
    const match = query.match(destination.pattern);
    if (outsideAfterLandmark.test(query.slice(match.index+match[0].length)) || outsideBeforeLandmark.test(query.slice(0,match.index))) {
      return clarify(unknownPlace);
    }
    const uniqueAlternatives = query.split(/\bor\b/).map(part=>placePatterns.find(({pattern})=>pattern.test(part))?.id).filter(Boolean);
    if (new Set(uniqueAlternatives).size>1) return clarify('Which destination are you heading to? '+supportedPlaces);
    criteria.destination = destination.id;
  } else if (/\b(near me|my current location|my location|nearby me)\b/.test(query)) {
    return clarify('Tell me which landmark is closest to you. '+supportedPlaces);
  } else {
    if (namesUnknownPlace(query)) return clarify(unknownPlace);
    if (/\b(dlf|gurgaon|gurugram)\b/.test(query)) criteria.destination = 'cyberhub';
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

function mergeModelIntent(result,text) {
  const json = text?.match(/\{[^{}]*\}/)?.[0];
  if (!json) return result;
  let candidate;
  try {candidate=JSON.parse(json);} catch {return result;}
  const criteria = {...result.criteria};
  let understood = false;
  const choices = {
    vehicle: new Set(['car','bike']),
    sort: new Set(['price','rating','distance']),
    amenity: amenityNames,
    type: new Set(['Office','Society','Public lot'])
  };
  for (const [key,allowed] of Object.entries(choices)) {
    if (allowed.has(candidate[key])) {
      if (!Object.hasOwn(criteria,key)) criteria[key]=candidate[key];
      if (criteria[key]===candidate[key]) understood=true;
    }
  }
  let requestedDuration = result.requestedDuration;
  if (!criteria.duration && Number.isInteger(candidate.minutes) && candidate.minutes>0 && candidate.minutes<=durations.at(-1)) {
    requestedDuration = candidate.minutes;
    criteria.duration = durations.find(value=>value>=requestedDuration);
    understood = true;
  }
  if (requestedDuration!==null && requestedDuration===candidate.minutes) understood=true;
  return understood ? {...result,criteria,requestedDuration,usedModel:true} : result;
}

export async function interpretRequest(text) {
  const result=readRequest(text);
  if (result.clarification || !['https:','http:'].includes(globalThis.location?.protocol)) return result;
  try {
    const response=await fetch('/api/parking-intent',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      signal:AbortSignal.timeout(10000),
      body:JSON.stringify({text:String(text).slice(0,240)})
    });
    if (!response.ok) return result;
    const payload=await response.json();
    if (typeof payload.text!=='string') return result;
    const interpreted=mergeModelIntent(result,payload.text);
    return interpreted.usedModel ? {...interpreted,provider:'gemini'} : result;
  } catch {return result;}
}
