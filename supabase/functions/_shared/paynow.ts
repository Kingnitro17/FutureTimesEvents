export type VerifiedPaymentUpdate = {
  merchantReference: string;
  providerReference?: string;
  pollUrl?: string;
  amount: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "reversed";
  rawStatus: string;
  fingerprint: string;
};

export type InitiatePaymentInput = {
  merchantReference: string; amount: string; customerPhone: string;
  description: string; resultUrl: string; returnUrl: string;
};

export interface PaymentProvider {
  initiateMobilePayment(input: InitiatePaymentInput): Promise<{provider:string;providerReference?:string;pollUrl?:string;instructions?:string;status:"pending"|"failed";rawStatus?:string}>;
  verifyCallback(rawBody: string): Promise<VerifiedPaymentUpdate>;
  pollStatus(pollUrl: string): Promise<VerifiedPaymentUpdate>;
}

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2,"0")).join("").toUpperCase();
async function sha512(value: string) { return hex(await crypto.subtle.digest("SHA-512", encoder.encode(value))); }
async function sha256(value: string) { return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value))); }

function parseOrdered(body: string) {
  return body.split("&").filter(Boolean).map((pair) => {
    const at = pair.indexOf("=");
    return [decodeURIComponent((at < 0 ? pair : pair.slice(0,at)).replace(/\+/g," ")).toLowerCase(), decodeURIComponent((at < 0 ? "" : pair.slice(at+1)).replace(/\+/g," "))] as const;
  });
}

export class PaynowPaymentProvider implements PaymentProvider {
  constructor(private id:string, private key:string) {}
  private async sign(values:string[]) { return sha512(values.join("")+this.key); }
  private async verifyAndMap(raw:string): Promise<VerifiedPaymentUpdate> {
    const pairs=parseOrdered(raw); const supplied=pairs.find(([k])=>k==="hash")?.[1] ?? "";
    const expected=await this.sign(pairs.filter(([k])=>k!=="hash").map(([,v])=>v));
    if (!supplied || supplied.toUpperCase()!==expected) throw new Error("Unverified Paynow message");
    const data=Object.fromEntries(pairs); const rawStatus=data.status ?? "Unknown"; const normalized=rawStatus.toLowerCase().replace(/[^a-z]/g,"");
    const status = normalized === "paid" ? "paid"
      : normalized.includes("cancel") ? "cancelled" : normalized.includes("refund") || normalized.includes("revers") ? "reversed"
      : normalized.includes("fail") || normalized.includes("error") ? "failed" : "pending";
    return {merchantReference:data.reference ?? "",providerReference:data.paynowreference,pollUrl:data.pollurl,amount:data.amount ?? "",status,rawStatus,fingerprint:await sha256(raw)};
  }
  async initiateMobilePayment(input:InitiatePaymentInput) {
    const fields:[string,string][]=[["id",this.id],["reference",input.merchantReference],["amount",input.amount],["additionalinfo",input.description],["returnurl",input.returnUrl],["resulturl",input.resultUrl],["phone",input.customerPhone],["method","ecocash"],["status","Message"]];
    fields.push(["hash",await this.sign(fields.map(([,v])=>v))]);
    const response=await fetch("https://www.paynow.co.zw/interface/remotetransaction",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams(fields)});
    if (!response.ok) throw new Error(`Paynow initiation HTTP ${response.status}`);
    const raw=await response.text(); const pairs=parseOrdered(raw); const data=Object.fromEntries(pairs);
    const supplied=data.hash ?? ""; const expected=await this.sign(pairs.filter(([k])=>k!=="hash").map(([,v])=>v));
    if (!supplied || supplied.toUpperCase()!==expected) throw new Error("Unverified Paynow initiation response");
    return {provider:"paynow",providerReference:data.paynowreference,pollUrl:data.pollurl,instructions:data.instructions,status:data.status?.toLowerCase()==="ok"?"pending" as const:"failed" as const,rawStatus:data.status};
  }
  verifyCallback(rawBody:string) { return this.verifyAndMap(rawBody); }
  async pollStatus(pollUrl:string) {
    const url=new URL(pollUrl); if (url.protocol!=="https:" || !/(^|\.)paynow\.co\.zw$/i.test(url.hostname)) throw new Error("Invalid Paynow poll URL");
    const response=await fetch(url,{method:"POST",redirect:"error"}); if(!response.ok) throw new Error(`Paynow poll HTTP ${response.status}`);
    return this.verifyAndMap(await response.text());
  }
}

export function getPaymentProvider(): PaymentProvider {
  if ((Deno.env.get("PAYMENT_PROVIDER") ?? "paynow") !== "paynow") throw new Error("Unsupported payment provider");
  const id=Deno.env.get("PAYNOW_INTEGRATION_ID"), key=Deno.env.get("PAYNOW_INTEGRATION_KEY");
  if (!id || !key) throw new Error("Paynow test credentials are not configured");
  return new PaynowPaymentProvider(id,key);
}
