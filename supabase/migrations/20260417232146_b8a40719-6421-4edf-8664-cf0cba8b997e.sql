CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Areas are viewable by everyone" ON public.areas FOR SELECT USING (true);
CREATE POLICY "Only admins can insert areas" ON public.areas FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can update areas" ON public.areas FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Only admins can delete areas" ON public.areas FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.areas (name, display_order) VALUES
  ('الحي الأول', 1), ('الحي الثاني', 2), ('الحي الثالث', 3), ('الحي الرابع', 4),
  ('الحي الخامس', 5), ('الحي السادس', 6), ('الحي السابع', 7), ('الحي الثامن', 8),
  ('الحي التاسع', 9), ('الحي العاشر', 10), ('الحي الحادي عشر', 11), ('الحي الثاني عشر', 12);

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_payments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;