const endpoint='https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent';
const prompt='Extract only the parking preferences stated by the user. Return a JSON object. Omit unknown fields. Never invent a location, a price, or parking availability.';
const fields={
  vehicle:{type:'string',enum:['car','bike']},
  minutes:{type:'integer',minimum:1,maximum:360},
  sort:{type:'string',enum:['price','rating','distance']},
  amenity:{type:'string',enum:['Covered','CCTV','Security','Lift access','EV charging','Wide bays','Well lit']},
  type:{type:'string',enum:['Public lot','Office','Society']}
};

export const config={
  path:'/api/parking-intent',
  rateLimit:{windowLimit:24,windowSize:60,aggregateBy:['ip','domain']}
};

function json(body,status=200,headers={}) {
  return Response.json(body,{status,headers:{'cache-control':'no-store',...headers}});
}

function extractHints(payload) {
  const pieces=payload.candidates?.[0]?.content?.parts??[];
  const candidate=JSON.parse(pieces.filter(part=>!part.thought).map(part=>part.text??'').join(''));
  if (!candidate || typeof candidate!=='object' || Array.isArray(candidate)) return {};
  const hints={};
  for (const [name,definition] of Object.entries(fields)) {
    const value=candidate[name];
    const valid=definition.enum?.includes(value)
      ?? (Number.isInteger(value) && value>=definition.minimum && value<=definition.maximum);
    if (valid) hints[name]=value;
  }
  return hints;
}

export default async function parkingIntent(request) {
  if (request.method!=='POST') return json({error:'Use POST.'},405,{allow:'POST'});
  const origin=request.headers.get('origin');
  if (origin && origin!==new URL(request.url).origin) return json({error:'Use the ParkEasy app.'},403);
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??'')) {
    return json({error:'Send JSON.'},415);
  }

  let text;
  try {
    const body=await request.text();
    if (body.length>4096) return json({error:'Parking request is too long.'},413);
    text=JSON.parse(body)?.text;
  } catch {return json({error:'Invalid JSON.'},400);}
  if (typeof text!=='string' || !text.trim() || text.trim().length>400) {
    return json({error:'Enter a parking request of 1 to 400 characters.'},400);
  }

  const apiKey=process.env.GEMINI_API_KEY;
  if (!apiKey) return json({error:'Gemini is unavailable.'},503);

  try {
    const response=await fetch(endpoint,{
      method:'POST',
      headers:{'content-type':'application/json','x-goog-api-key':apiKey},
      redirect:'error',
      signal:AbortSignal.timeout(7000),
      body:JSON.stringify({
        systemInstruction:{parts:[{text:prompt}]},
        contents:[{role:'user',parts:[{text:text.trim()}]}],
        generationConfig:{
          candidateCount:1,
          temperature:0,
          maxOutputTokens:160,
          thinkingConfig:{thinkingLevel:'MINIMAL'},
          responseMimeType:'application/json',
          responseJsonSchema:{type:'object',properties:fields,additionalProperties:false}
        }
      })
    });
    if (!response.ok) return json({error:'Gemini is temporarily unavailable.'},response.status===429?429:502);
    return json({text:JSON.stringify(extractHints(await response.json()))});
  } catch {return json({error:'Gemini is temporarily unavailable.'},502);}
}
