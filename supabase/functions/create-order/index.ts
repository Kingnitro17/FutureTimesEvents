import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cors,json } from "../_shared/http.ts";
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response(null,{headers:cors}); if(req.method!=="POST")return json({error:"Method not allowed"},405); try{
 const client=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("authorization")??""}}}); const {data:{user}}=await client.auth.getUser(); if(!user)return json({error:"Sign in to purchase paid tickets."},401);
 const body=await req.json(); if(typeof body?.eventId!=="string"||!Array.isArray(body?.items)||typeof body?.idempotencyKey!=="string")return json({error:"Invalid order request"},422);
 if(body.items.length<1||body.items.length>10||body.items.some((item:unknown)=>!item||typeof item!=="object"||typeof (item as {ticketTypeId?:unknown}).ticketTypeId!=="string"||!Number.isInteger((item as {quantity?:unknown}).quantity)))return json({error:"Invalid order items"},422);
 const {data,error}=await client.rpc("create_ticket_order_atomic",{p_user_id:user.id,p_event_id:body.eventId,p_items:body.items,p_idempotency_key:body.idempotencyKey,p_referral_code:typeof body.referralCode==="string"?body.referralCode:null}); if(error)throw error;
 const status=data?.result==="success"?201:data?.result==="existing"?200:["sold_out","claim_limit_exceeded"].includes(data?.result)?409:422; return json(data,status);
 }catch(error){console.error(JSON.stringify({function:"create-order",result:"error",message:error instanceof Error?error.message:"unknown"}));return json({error:"The order could not be created."},500)}});
