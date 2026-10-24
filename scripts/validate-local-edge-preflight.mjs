// Browser CORS preflight must work without Authorization; PowerSync upload
// sends JSON POST to Supabase Edge Functions from a different localhost port.
// Reject hosted endpoints and report ONLY response status/boolean headers.
const origin='http://127.0.0.1:4173';
const base='http://127.0.0.1:54321';
for (const route of ['/functions/v1/sync-apply','/functions/v1/resolve-conflict']) {
  const response = await fetch(base+route, {
    method:'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method':'POST',
      'Access-Control-Request-Headers':'authorization,content-type',
    },
    signal:AbortSignal.timeout(15000),
  });
  const allowOrigin=response.headers.get('access-control-allow-origin');
  const allowMethods=(response.headers.get('access-control-allow-methods')??'').toLowerCase();
  const allowHeaders=(response.headers.get('access-control-allow-headers')??'').toLowerCase();
  const good=(response.status===204||response.status===200) &&
    (allowOrigin==='*'||allowOrigin===origin) &&
    allowMethods.includes('post') &&
    allowHeaders.includes('authorization') &&
    allowHeaders.includes('content-type');
  console.log('LOCAL_EDGE_CORS_PREFLIGHT '+route.split('/').at(-1)+
    ': HTTP='+response.status+' allowOrigin='+Boolean(allowOrigin)+
    ' allowPost='+allowMethods.includes('post')+
    ' allowAuth='+allowHeaders.includes('authorization')+
    ' allowJson='+allowHeaders.includes('content-type'));
  if (!good) process.exitCode=1;
}
