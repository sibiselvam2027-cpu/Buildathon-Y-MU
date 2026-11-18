import {destinations,durations} from './parking.mjs';

export const modelName = 'Xenova/all-MiniLM-L6-v2';
const runtime = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2';
let extractor;
let reference;
let modelState = 'idle';

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

function getExtractor() {
  if (extractor) return extractor;
  modelState = 'loading';
  extractor = import(runtime).then(({pipeline,env}) => {
    env.allowLocalModels = false;
    if (env.backends.onnx.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
    }
    return pipeline('feature-extraction',modelName,{device:'wasm',dtype:'q8'});
  }).then(value => {modelState='ready';return value;}).catch(error=>{
    modelState='unavailable';
    extractor=null;
    throw error;
  });
  return extractor;
}

export const assistantStatus = () => modelState;

export function warmAssistant() {
  return getExtractor().then(extract => {
    reference ??= extract(intents.map(intent=>intent[2]),{pooling:'mean',normalize:true}).then(output=>output.tolist()).catch(error=>{reference=null;throw error;});
    return reference;
  }).then(()=>true).catch(()=>false);
}

export function parseRequest(text) {
  const query = text.toLowerCase().replace(/\b(one|two|three|four|five|six)\b/g,word=>({one:'1',two:'2',three:'3',four:'4',five:'5',six:'6'})[word]);
  const candidate = {};
  if (/\b(bike|scoot(?:er|y)|two[ -]?wheeler|2[ -]?wheeler|motorcycle|bullet|activa|moped)\b/.test(query)) candidate.vehicle='bike';
  else if (/\b(car|hatchback|sedan|suv|four[ -]?wheeler|4[ -]?wheeler)\b/.test(query)) candidate.vehicle='car';

  const ordered = destinations.flatMap(place=>place.aliases.map(alias=>[alias,place.id])).sort((a,b)=>b[0].length-a[0].length);
  const destination = ordered.find(([alias])=>new RegExp('\\b'+alias+'\\b').test(query));
  if (destination) candidate.destination = destination[1];

  const hours = query.match(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|ghante?)\b/);
  const minutes = query.match(/\b(\d+)\s*(minutes?|mins?|m|minat)\b/);
  const half = /\bhalf an hour\b/.test(query);
  const duration = (hours ? Number(hours[1])*60 : 0)+(minutes ? Number(minutes[1]) : 0)+(half ? 30 : 0);
  if (duration) candidate.duration = durations.find(value=>value>=duration) ?? durations.at(-1);

  if (/\b(cheapest|cheap|affordable|budget|low(?:est)? price|inexpensive)\b/.test(query)) candidate.sort='price';
  else if (/\b(top rated|highly rated|best rated|best reviews)\b/.test(query)) candidate.sort='rating';
  else if (/\b(close|closest|nearest|short walk)\b/.test(query)) candidate.sort='distance';

  const amenityPatterns = [
    ['EV charging',/\b(charg(?:e|er|ing)|electric vehicle)\b/],
    ['Covered',/\b(covered|shade|shaded|shelter(?:ed)?|indoors?)\b/],
    ['CCTV',/\b(cctv|camera|surveillance)\b/],
    ['Security',/\b(security|secured|guard|staffed)\b/],
    ['Wide bays',/\b(wide|spacious|big bay)\b/],
    ['Well lit',/\b(well[ -]lit|bright|lighting)\b/],
    ['Lift access',/\b(lift|elevator)\b/]
  ];
  const feature = amenityPatterns.find(([,pattern])=>pattern.test(query));
  if (feature) candidate.amenity=feature[0];
  if (/\b(society|apartment|residential)\b/.test(query)) candidate.type='Society';
  else if (/\b(office|corporate)\b/.test(query)) candidate.type='Office';
  else if (/\b(public lot|public parking|municipal)\b/.test(query)) candidate.type='Public lot';
  return candidate;
}

export async function interpretRequest(text) {
  const parsed = parseRequest(text);
  const provided = Object.keys(parsed).length;
  const limit = provided > 0 ? 2750 : 6500;
  let timeout;
  const cutoff = new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),limit);});
  const embedding = (async () => {
    if (!(await warmAssistant())) return null;
    const extract=await getExtractor();
    const rows=await reference;
    const output = await extract(text,{pooling:'mean',normalize:true});
    const vector=output.tolist()[0];
    const suggestions = rows.map((row,index)=>({intent:intents[index],score:row.reduce((sum,number,i)=>sum+number*vector[i],0)})).sort((a,b)=>b.score-a.score);
    const [first,second]=suggestions;
    if (first && first.score>.43 && first.score-(second?.score ?? 0)>.044) {
      const [field,value]=first.intent;
      if (!Object.hasOwn(parsed,field)) return {...parsed,[field]:value};
    }
    return parsed;
  })().catch(()=>null);
  const result=await Promise.race([embedding,cutoff]);
  clearTimeout(timeout);
  return {criteria:result ?? parsed,usedModel:result!==null};
}
