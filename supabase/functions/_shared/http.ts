export const cors={"access-control-allow-origin":Deno.env.get("APP_BASE_URL") ?? "","access-control-allow-headers":"authorization, apikey, content-type, x-idempotency-key","access-control-allow-methods":"POST, OPTIONS","cache-control":"no-store"};
export const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json"}});
export const safeError=(status=500)=>json({error:status===503?"Payments are temporarily unavailable.":"The payment request could not be completed."},status);
export function normalizeZwPhone(value:string){const digits=value.replace(/\D/g,""); const local=digits.startsWith("263")?`0${digits.slice(3)}`:digits; if(!/^07[178]\d{7}$/.test(local)) throw new Error("Invalid Zimbabwe mobile number"); return local;}
export const maskPhone=(phone:string)=>`${phone.slice(0,3)}***${phone.slice(-3)}`;

