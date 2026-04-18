-- 1) Add expires_at to ads + featured tracking
ALTER TABLE public.ads 
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expiry_warning_sent BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing ads (15 days from created_at)
UPDATE public.ads 
SET expires_at = created_at + INTERVAL '15 days'
WHERE expires_at IS NULL;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_ads_expires_at ON public.ads(expires_at);
CREATE INDEX IF NOT EXISTS idx_ads_status_featured ON public.ads(status, is_featured, created_at DESC);

-- 2) Trigger: when ad is approved, set approved_at + expires_at = approved_at + 15 days
CREATE OR REPLACE FUNCTION public.handle_ad_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When status changes to approved, set approved_at and recalc expiry
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    NEW.approved_at = COALESCE(NEW.approved_at, NOW());
    NEW.expires_at = NEW.approved_at + INTERVAL '15 days';
    NEW.expiry_warning_sent = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ads_approval ON public.ads;
CREATE TRIGGER trg_ads_approval
BEFORE INSERT OR UPDATE OF status ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.handle_ad_approval();

-- 3) Trigger: when payment is approved AND for an ad, mark ad as featured with featured_until = now + duration
CREATE OR REPLACE FUNCTION public.handle_payment_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration INT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    v_duration = COALESCE(NEW.feature_duration_days, 15);
    UPDATE public.ads
    SET is_featured = true,
        featured_until = NOW() + (v_duration || ' days')::INTERVAL
    WHERE id = NEW.ad_id;
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_approval ON public.ad_payments;
CREATE TRIGGER trg_payment_approval
BEFORE UPDATE OF status ON public.ad_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_approval();

-- 4) Messages table (user <-> admin chat)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_user_id UUID NOT NULL, -- the regular user this conversation belongs to
  sender_id UUID NOT NULL,            -- who actually sent (user or admin)
  is_from_admin BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_user_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation"
ON public.messages FOR SELECT
USING (auth.uid() = conversation_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can send to admin in their conversation"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND (
    (auth.uid() = conversation_user_id AND is_from_admin = false)
    OR (public.has_role(auth.uid(), 'admin') AND is_from_admin = true)
  )
);

CREATE POLICY "Participants can mark as read"
ON public.messages FOR UPDATE
USING (auth.uid() = conversation_user_id OR public.has_role(auth.uid(), 'admin'));

-- 5) Set default expires_at on insert if not provided (pending ads expire too)
ALTER TABLE public.ads ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '15 days');

-- 6) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;