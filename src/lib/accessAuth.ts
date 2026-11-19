export type AccessIdentity = { subject: string };
type Claims = { sub?: string; iss?: string; aud?: string | string[]; exp?: number; nbf?: number };
function decode(value: string): Uint8Array {
 const base64=value.replace(/-/g,"+").replace(/_/g,"/");
 const padded=base64+"=".repeat((4-base64.length%4)%4);
 return Uint8Array.from(atob(padded), c=>c.charCodeAt(0));
}
export async function verifyCloudflareAccess(request: Request, teamDomain: string, expectedAudience: string): Promise<AccessIdentity | null> {
 let domain=teamDomain.trim().replace("https://","").replace("http://",""); if(domain.endsWith("/"))domain=domain.slice(0,-1);
 if(!domain||!expectedAudience)return null;
 const token=request.headers.get("cf-access-jwt-assertion");
 if(!token)return null;
 try {
  const parts=token.split("."); if(parts.length!==3)return null;
  const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))) as {kid?:string;alg?:string};
  const claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))) as Claims;
  const issuer="https://"+domain;
  const audiences=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=="RS256"||!header.kid||claims.iss!==issuer||!audiences.includes(expectedAudience)||typeof claims.sub!=="string"||!claims.sub||typeof claims.exp!=="number"||claims.exp<=now||(typeof claims.nbf==="number"&&claims.nbf>now+60))return null;
  const response=await fetch(issuer+"/cdn-cgi/access/certs"); if(!response.ok)return null;
  const jwks=await response.json() as {keys?: (JsonWebKey & {kid?:string})[]};
  const jwk=(jwks.keys??[]).find(key=>key.kid===header.kid); if(!jwk)return null;
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,decode(parts[2]),new TextEncoder().encode(parts[0]+"."+parts[1]));
  return valid?{subject:claims.sub}:null;
 } catch { return null; }
}