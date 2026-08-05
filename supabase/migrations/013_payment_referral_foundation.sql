-- Future Times Events: payment, reservation, referral, payout foundation.
-- ADDITIVE ONLY. Review and apply manually in the Supabase SQL editor.
BEGIN;

CREATE TABLE public.payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  provider TEXT NOT NULL DEFAULT 'paynow',
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  reservation_minutes INTEGER NOT NULL DEFAULT 15 CHECK (reservation_minutes BETWEEN 5 AND 60),
  fee_model TEXT NOT NULL DEFAULT 'organizer_absorbs' CHECK (fee_model IN ('organizer_absorbs','customer_pays','mixed')),
  service_fee_percent NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (service_fee_percent BETWEEN 0 AND 100),
  platform_commission_percent NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (platform_commission_percent BETWEEN 0 AND 100),
  referral_user_reward NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (referral_user_reward >= 0),
  referral_business_reward NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (referral_business_reward >= 0),
  referral_minimum_payout NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (referral_minimum_payout >= 0),
  ticket_referral_commission_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);
INSERT INTO public.payment_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (code ~ '^[A-Z0-9_-]{4,32}$'),
  campaign TEXT,
  referral_type_permissions TEXT[] NOT NULL DEFAULT ARRAY['user']::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promoter_user_id),
  UNIQUE (code)
);

CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id) ON DELETE RESTRICT,
  referrer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  referred_business_key TEXT,
  source TEXT NOT NULL DEFAULT 'web',
  campaign TEXT,
  status TEXT NOT NULL DEFAULT 'attributed' CHECK (status IN ('attributed','qualified','rejected','rewarded','reversed')),
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  CHECK (referred_user_id IS NOT NULL OR referred_business_key IS NOT NULL),
  CHECK (referred_user_id IS NULL OR referred_user_id <> referrer_user_id)
);
CREATE UNIQUE INDEX referrals_one_user_attribution ON public.referrals(referred_user_id) WHERE referred_user_id IS NOT NULL;
CREATE UNIQUE INDEX referrals_one_business_attribution ON public.referrals(referred_business_key) WHERE referred_business_key IS NOT NULL;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_reference TEXT NOT NULL UNIQUE DEFAULT ('FTE-' || upper(substr(replace(gen_random_uuid()::TEXT,'-',''),1,20))),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment' CHECK (status IN ('draft','awaiting_payment','payment_processing','paid','fulfilled','payment_failed','expired','cancelled','refund_pending','refunded','partially_refunded','reconciliation_required')),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  service_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  discount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  fee_model TEXT NOT NULL CHECK (fee_model IN ('organizer_absorbs','customer_pays','mixed')),
  platform_commission NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (platform_commission >= 0),
  idempotency_key UUID NOT NULL,
  reservation_expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  item_subtotal NUMERIC(12,2) NOT NULL CHECK (item_subtotal = round(unit_price * quantity, 2)),
  service_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
  ticket_type_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, ticket_type_id)
);

CREATE TABLE public.ticket_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','released','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  converted_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, ticket_type_id)
);

CREATE TABLE public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  merchant_reference TEXT NOT NULL UNIQUE,
  provider_reference TEXT,
  poll_url TEXT,
  masked_customer_phone TEXT,
  amount_requested NUMERIC(12,2) NOT NULL CHECK (amount_requested >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','sent','awaiting_customer','processing','paid','failed','cancelled','expired','reversed')),
  provider_status TEXT,
  failure_code TEXT,
  safe_failure_description TEXT,
  idempotency_key UUID NOT NULL,
  safe_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE (order_id, idempotency_key)
);
CREATE UNIQUE INDEX payment_attempts_provider_reference_unique ON public.payment_attempts(provider, provider_reference) WHERE provider_reference IS NOT NULL;
CREATE UNIQUE INDEX payment_attempts_one_active ON public.payment_attempts(order_id) WHERE status IN ('created','sent','awaiting_customer','processing');

CREATE TABLE public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_attempt_id UUID REFERENCES public.payment_attempts(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  event_fingerprint TEXT NOT NULL,
  merchant_reference TEXT,
  provider_reference TEXT,
  provider_status TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  safe_payload_digest TEXT NOT NULL,
  processing_result TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider, event_fingerprint)
);

CREATE TABLE public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  debit_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','available','locked','reversed','paid_out','rejected')),
  available_at TIMESTAMPTZ,
  reversal_of UUID REFERENCES public.financial_ledger(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((credit_amount > 0 AND debit_amount = 0) OR (debit_amount > 0 AND credit_amount = 0)),
  UNIQUE (entry_type, source_type, source_id, owner_user_id)
);

CREATE TABLE public.payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_amount NUMERIC(12,2) NOT NULL CHECK (requested_amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
  masked_ecocash_number TEXT NOT NULL,
  encrypted_destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','under_review','approved','processing','paid','rejected','cancelled','failed')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  external_payment_reference TEXT,
  paid_at TIMESTAMPTZ,
  idempotency_key UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promoter_user_id, idempotency_key)
);

CREATE INDEX orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX orders_event_status ON public.orders(event_id, status);
CREATE INDEX reservations_expiry ON public.ticket_reservations(status, expires_at);
CREATE INDEX payment_attempts_order ON public.payment_attempts(order_id);
CREATE INDEX payment_events_reference ON public.payment_events(merchant_reference);
CREATE INDEX ledger_owner_status ON public.financial_ledger(owner_user_id, status, created_at DESC);
CREATE INDEX payouts_status_created ON public.payout_requests(status, created_at);

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS fulfillment_index INTEGER;
CREATE UNIQUE INDEX tickets_order_fulfillment_unique ON public.tickets(order_id, fulfillment_index) WHERE order_id IS NOT NULL;

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_settings_admin_read ON public.payment_settings FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY referral_codes_own_read ON public.referral_codes FOR SELECT USING (promoter_user_id = auth.uid());
CREATE POLICY referrals_own_read ON public.referrals FOR SELECT USING (referrer_user_id = auth.uid());
CREATE POLICY orders_own_read ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY orders_admin_read ON public.orders FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY order_items_own_read ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY order_items_admin_read ON public.order_items FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY reservations_admin_read ON public.ticket_reservations FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY payment_attempts_own_read ON public.payment_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY payment_attempts_admin_read ON public.payment_attempts FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY payment_events_admin_read ON public.payment_events FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY ledger_own_read ON public.financial_ledger FOR SELECT USING (owner_user_id = auth.uid());
CREATE POLICY ledger_admin_read ON public.financial_ledger FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));
CREATE POLICY payouts_own_read ON public.payout_requests FOR SELECT USING (promoter_user_id = auth.uid());
CREATE POLICY payouts_admin_read ON public.payout_requests FOR SELECT USING (public.get_my_role() IN ('admin','super_admin'));

-- No INSERT/UPDATE/DELETE policies are granted to browser roles for financial tables.
REVOKE INSERT, UPDATE, DELETE ON public.orders, public.order_items, public.ticket_reservations,
  public.payment_attempts, public.payment_events, public.financial_ledger, public.payout_requests
  FROM anon, authenticated;

CREATE OR REPLACE VIEW public.referral_wallet_balances WITH (security_invoker = true) AS
SELECT owner_user_id,
  COALESCE(sum(credit_amount - debit_amount) FILTER (WHERE status = 'pending'),0)::NUMERIC(12,2) AS pending,
  COALESCE(sum(credit_amount - debit_amount) FILTER (WHERE status = 'available'),0)::NUMERIC(12,2) AS available,
  COALESCE(sum(debit_amount) FILTER (WHERE status = 'paid_out'),0)::NUMERIC(12,2) AS paid_out
FROM public.financial_ledger GROUP BY owner_user_id;

CREATE OR REPLACE FUNCTION public.create_ticket_order_atomic(
  p_user_id UUID, p_event_id UUID, p_items JSONB, p_idempotency_key UUID,
  p_referral_code TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_event public.events%ROWTYPE; v_settings public.payment_settings%ROWTYPE;
  v_order public.orders%ROWTYPE; v_item JSONB; v_type public.ticket_types%ROWTYPE;
  v_qty INTEGER; v_reserved INTEGER; v_subtotal NUMERIC(12,2) := 0;
  v_service_fee NUMERIC(12,2); v_total NUMERIC(12,2); v_referral UUID; v_expires TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL OR p_user_id <> auth.uid() THEN RETURN jsonb_build_object('result','forbidden'); END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 10 THEN
    RETURN jsonb_build_object('result','invalid_items');
  END IF;
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result','event_not_found'); END IF;
  IF v_event.status <> 'published' THEN RETURN jsonb_build_object('result','event_not_available'); END IF;
  SELECT * INTO v_settings FROM public.payment_settings WHERE id = TRUE;
  SELECT * INTO v_order FROM public.orders WHERE user_id=p_user_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN RETURN jsonb_build_object('result','existing','order_id',v_order.id,'merchant_reference',v_order.merchant_reference,'total',v_order.total,'currency',v_order.currency,'expires_at',v_order.reservation_expires_at); END IF;
  IF p_referral_code IS NOT NULL THEN
    SELECT r.id INTO v_referral FROM public.referrals r JOIN public.referral_codes c ON c.id=r.referral_code_id
    WHERE c.code=upper(btrim(p_referral_code)) AND c.is_active AND c.promoter_user_id<>p_user_id
      AND (c.expires_at IS NULL OR c.expires_at>now()) AND r.referred_user_id=p_user_id LIMIT 1;
  END IF;
  v_expires := now() + make_interval(mins => v_settings.reservation_minutes);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN v_qty := (v_item->>'quantity')::INTEGER; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('result','invalid_quantity'); END;
    IF v_qty < 1 OR v_qty > 10 THEN RETURN jsonb_build_object('result','invalid_quantity'); END IF;
    SELECT * INTO v_type FROM public.ticket_types WHERE id=(v_item->>'ticketTypeId')::UUID AND event_id=p_event_id FOR UPDATE;
    IF NOT FOUND OR NOT v_type.is_active OR NOT v_type.is_visible THEN RETURN jsonb_build_object('result','invalid_ticket_type'); END IF;
    IF v_type.claim_opens_at IS NOT NULL AND now()<v_type.claim_opens_at THEN RETURN jsonb_build_object('result','sales_not_open'); END IF;
    IF v_type.claim_closes_at IS NOT NULL AND now()>v_type.claim_closes_at THEN RETURN jsonb_build_object('result','sales_closed'); END IF;
    IF v_qty > LEAST(10,v_type.claim_limit_per_contact) THEN RETURN jsonb_build_object('result','claim_limit_exceeded'); END IF;
    SELECT COALESCE(sum(quantity),0)::INTEGER INTO v_reserved FROM public.ticket_reservations
      WHERE ticket_type_id=v_type.id AND status='active' AND expires_at>now();
    IF v_type.quantity_available - v_reserved < v_qty THEN RETURN jsonb_build_object('result','sold_out','available',greatest(v_type.quantity_available-v_reserved,0)); END IF;
    v_subtotal := v_subtotal + round(v_type.price*v_qty,2);
  END LOOP;
  v_service_fee := CASE WHEN v_settings.fee_model IN ('customer_pays','mixed') THEN round(v_subtotal*v_settings.service_fee_percent/100,2) ELSE 0 END;
  v_total := v_subtotal + v_service_fee;
  INSERT INTO public.orders(user_id,event_id,referral_id,subtotal,service_fee,total,fee_model,platform_commission,idempotency_key,reservation_expires_at,status)
  VALUES(p_user_id,p_event_id,v_referral,v_subtotal,v_service_fee,v_total,v_settings.fee_model,round(v_subtotal*v_settings.platform_commission_percent/100,2),p_idempotency_key,v_expires,CASE WHEN v_total=0 THEN 'awaiting_payment' ELSE 'awaiting_payment' END) RETURNING * INTO v_order;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_qty := (v_item->>'quantity')::INTEGER;
    SELECT * INTO v_type FROM public.ticket_types WHERE id=(v_item->>'ticketTypeId')::UUID;
    INSERT INTO public.order_items(order_id,ticket_type_id,quantity,unit_price,item_subtotal,service_fee,ticket_type_name)
      VALUES(v_order.id,v_type.id,v_qty,v_type.price,round(v_type.price*v_qty,2),0,v_type.name);
    INSERT INTO public.ticket_reservations(event_id,ticket_type_id,order_id,quantity,expires_at)
      VALUES(p_event_id,v_type.id,v_order.id,v_qty,v_expires);
  END LOOP;
  INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,after_state)
    VALUES(p_user_id,'order_created','order',v_order.id,jsonb_build_object('status',v_order.status,'total',v_total,'currency',v_order.currency));
  RETURN jsonb_build_object('result','success','order_id',v_order.id,'merchant_reference',v_order.merchant_reference,'subtotal',v_subtotal,'service_fee',v_service_fee,'discount',0,'total',v_total,'currency',v_order.currency,'expires_at',v_expires);
END; $$;

CREATE OR REPLACE FUNCTION public.expire_ticket_reservations(p_limit INTEGER DEFAULT 500)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH expired AS (SELECT id,order_id FROM public.ticket_reservations WHERE status='active' AND expires_at<=now() ORDER BY expires_at FOR UPDATE SKIP LOCKED LIMIT greatest(1,least(p_limit,2000))),
  updated AS (UPDATE public.ticket_reservations r SET status='expired',released_at=now() FROM expired e WHERE r.id=e.id RETURNING r.order_id)
  UPDATE public.orders o SET status='expired',updated_at=now() WHERE o.id IN (SELECT order_id FROM updated) AND o.status IN ('awaiting_payment','payment_processing');
  GET DIAGNOSTICS v_count = ROW_COUNT; RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.confirm_order_payment_and_issue_tickets(
  p_order_id UUID, p_payment_attempt_id UUID, p_qr_token_hashes TEXT[]
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_order public.orders%ROWTYPE; v_attempt public.payment_attempts%ROWTYPE;
  v_profile public.profiles%ROWTYPE; v_item public.order_items%ROWTYPE;
  v_reservation public.ticket_reservations%ROWTYPE; v_total_quantity INTEGER;
  v_index INTEGER := 0; v_local INTEGER; v_sequence BIGINT; v_ticket_number TEXT;
  v_claim UUID; v_tickets JSONB;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('result','order_not_found'); END IF;
  IF v_order.status='fulfilled' THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('ticket_id',id,'ticket_number',ticket_number) ORDER BY fulfillment_index),'[]'::jsonb)
      INTO v_tickets FROM public.tickets WHERE order_id=v_order.id;
    RETURN jsonb_build_object('result','already_fulfilled','tickets',v_tickets);
  END IF;
  SELECT * INTO v_attempt FROM public.payment_attempts WHERE id=p_payment_attempt_id AND order_id=v_order.id FOR UPDATE;
  IF NOT FOUND OR v_attempt.status<>'paid' OR v_order.status<>'paid' THEN RETURN jsonb_build_object('result','payment_not_verified'); END IF;
  IF v_attempt.amount_requested<>v_order.total OR v_attempt.currency<>v_order.currency THEN
    UPDATE public.orders SET status='reconciliation_required',updated_at=now() WHERE id=v_order.id;
    RETURN jsonb_build_object('result','amount_mismatch');
  END IF;
  SELECT COALESCE(sum(quantity),0)::INTEGER INTO v_total_quantity FROM public.order_items WHERE order_id=v_order.id;
  IF cardinality(p_qr_token_hashes)<>v_total_quantity OR EXISTS (SELECT 1 FROM unnest(p_qr_token_hashes) h WHERE h!~'^[0-9a-f]{64}$')
    THEN RETURN jsonb_build_object('result','invalid_token_hashes'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_order.user_id;
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id=v_order.id ORDER BY id LOOP
    SELECT * INTO v_reservation FROM public.ticket_reservations WHERE order_id=v_order.id AND ticket_type_id=v_item.ticket_type_id FOR UPDATE;
    IF NOT FOUND OR v_reservation.status<>'active' OR v_reservation.expires_at<=now() THEN
      UPDATE public.orders SET status='reconciliation_required',updated_at=now() WHERE id=v_order.id;
      RETURN jsonb_build_object('result','reservation_expired');
    END IF;
    UPDATE public.ticket_types SET quantity_available=quantity_available-v_item.quantity,updated_at=now()
      WHERE id=v_item.ticket_type_id AND quantity_available>=v_item.quantity;
    IF NOT FOUND THEN UPDATE public.orders SET status='reconciliation_required',updated_at=now() WHERE id=v_order.id; RETURN jsonb_build_object('result','inventory_conflict'); END IF;
    INSERT INTO public.ticket_claims(event_id,ticket_type_id,user_id,quantity,attendee_name,attendee_email,status,idempotency_key,source)
      VALUES(v_order.event_id,v_item.ticket_type_id,v_order.user_id,v_item.quantity,COALESCE(NULLIF(v_profile.display_name,''),'Future Times Guest'),v_profile.email,'confirmed',v_order.id::TEXT||':'||v_item.id::TEXT,'paid_order') RETURNING id INTO v_claim;
    FOR v_local IN 1..v_item.quantity LOOP
      v_index:=v_index+1; v_sequence:=nextval('public.ticket_number_seq'); v_ticket_number:='FTE-'||lpad(v_sequence::TEXT,GREATEST(8,char_length(v_sequence::TEXT)),'0');
      INSERT INTO public.tickets(ticket_number,ticket_sequence,event_id,ticket_type_id,claim_id,order_id,fulfillment_index,user_id,attendee_name,attendee_email,qr_token_hash,quantity,status,issued_at,metadata)
      VALUES(v_ticket_number,v_sequence,v_order.event_id,v_item.ticket_type_id,v_claim,v_order.id,v_index,v_order.user_id,COALESCE(NULLIF(v_profile.display_name,''),'Future Times Guest'),v_profile.email,p_qr_token_hashes[v_index],1,'issued',now(),jsonb_build_object('payment_attempt_id',v_attempt.id));
    END LOOP;
    UPDATE public.ticket_reservations SET status='converted',converted_at=now() WHERE id=v_reservation.id;
  END LOOP;
  UPDATE public.orders SET status='fulfilled',fulfilled_at=now(),updated_at=now() WHERE id=v_order.id;
  INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,after_state) VALUES(NULL,'paid_order_fulfilled','order',v_order.id,jsonb_build_object('ticket_count',v_total_quantity,'payment_attempt_id',v_attempt.id));
  SELECT jsonb_agg(jsonb_build_object('ticket_id',id,'ticket_number',ticket_number) ORDER BY fulfillment_index) INTO v_tickets FROM public.tickets WHERE order_id=v_order.id;
  RETURN jsonb_build_object('result','success','tickets',v_tickets);
END; $$;

REVOKE ALL ON FUNCTION public.create_ticket_order_atomic(UUID,UUID,JSONB,UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_ticket_order_atomic(UUID,UUID,JSONB,UUID,TEXT) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.expire_ticket_reservations(INTEGER) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_ticket_reservations(INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.confirm_order_payment_and_issue_tickets(UUID,UUID,TEXT[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment_and_issue_tickets(UUID,UUID,TEXT[]) TO service_role;

COMMENT ON TABLE public.financial_ledger IS 'Append-only financial source of truth. Never update or delete entries; post reversals.';
COMMENT ON COLUMN public.payout_requests.encrypted_destination IS 'Application-encrypted destination; never return to ordinary clients.';
COMMIT;
