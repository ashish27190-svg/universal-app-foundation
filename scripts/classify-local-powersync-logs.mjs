// Diagnose disposable local PowerSync failures WITHOUT emitting raw lines.
// Logs can contain JWTs, database URIs or synthetic credentials.
// Only bounded counts and whitelisted error-code identifiers leave the process.
import { readFileSync } from 'node:fs';
const input = readFileSync(0, 'utf8').split(/\r?\n/);
const signatures = [
  ['sql_query', /invalid\s+(?:query|sql)|syntax error|parse error|relation .{0,80} does not exist|column .{0,80} does not exist/i],
  ['replication', /replication|wal_level|publication|slot|logical decoding|pgoutput/i],
  ['stream_definition', /sync rule|sync stream|stream definition|bucket query|compile.*stream/i],
  ['authentication', /jwks|invalid jwt|audience|token verification|unauthori[sz]ed|forbidden/i],
  ['postgres', /postgres|database connection|ECONNREFUSED|connection refused/i],
  ['mongo', /MongoError|MongoServerError|mongodb|replica set/i],
  ['api_service', /HTTP.*(?:500|502|503)|internal server error|request failed/i],
];
const counts = Object.fromEntries(signatures.map(([name])=>[name,0]));
let errorLines=0;
const pgcodes = new Set();
for(const raw of input){
  if(!raw) continue;
  if(/\b(error|fatal|exception|failed|warn|unauthorized|500|503)\b/i.test(raw)) {
    errorLines++;
    for(const [name, pattern] of signatures) if(pattern.test(raw)) counts[name]++;
  }
  const match=raw.match(/\bSQLSTATE\s*[:=]?\s*([A-Z0-9]{5})\b/i);
  if(match) pgcodes.add(match[1]);
}
console.log('LOCAL_POWERSYNC_LOG_CLASSIFICATION (no raw lines): '+JSON.stringify({
  scannedLines: input.length,
  errorOrWarningLines: errorLines,
  categories: counts,
  postgresSqlstates: [...pgcodes].slice(0,8),
}));
