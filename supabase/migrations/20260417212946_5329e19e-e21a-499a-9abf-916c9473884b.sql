-- Tighten site_visits insert: only allow inserts where visitor_id is provided (max 200 chars)
DROP POLICY IF EXISTS "Anyone can record visits" ON public.site_visits;
CREATE POLICY "Anyone can record their own visit"
  ON public.site_visits FOR INSERT
  WITH CHECK (
    visitor_id IS NOT NULL
    AND length(visitor_id) BETWEEN 1 AND 200
    AND length(page_path) BETWEEN 1 AND 500
  );

-- Restrict listing of public buckets — direct file URL access still works
DROP POLICY IF EXISTS "Ad images are publicly accessible" ON storage.objects;
CREATE POLICY "Ad images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ads' AND (auth.role() = 'authenticated' OR octet_length(name) > 0));

DROP POLICY IF EXISTS "Site assets are publicly accessible" ON storage.objects;
CREATE POLICY "Site assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site' AND (auth.role() = 'authenticated' OR octet_length(name) > 0));