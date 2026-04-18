-- ==================== ENUMS ====================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.ad_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');

-- ==================== UPDATED_AT TRIGGER FUNCTION ====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  whatsapp_number TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== USER ROLES ====================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ==================== HANDLE NEW USER (auto profile + auto admin) ====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );

  -- Default role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Auto-promote main admin
  IF NEW.email = 'a.mostafa4051@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================== CATEGORIES ====================
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT USING (true);
CREATE POLICY "Only admins can insert categories"
  ON public.categories FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update categories"
  ON public.categories FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete categories"
  ON public.categories FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.categories (name, slug, icon, display_order) VALUES
  ('سيارات', 'cars', 'Car', 1),
  ('عقارات', 'real-estate', 'Home', 2),
  ('إلكترونيات', 'electronics', 'Smartphone', 3),
  ('أثاث منزلي', 'furniture', 'Sofa', 4),
  ('وظائف', 'jobs', 'Briefcase', 5),
  ('خدمات', 'services', 'Wrench', 6),
  ('ملابس', 'fashion', 'Shirt', 7),
  ('متفرقات', 'other', 'Package', 8);

-- ==================== ADS ====================
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'EGP',
  location TEXT,
  whatsapp_number TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  status ad_status NOT NULL DEFAULT 'pending',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  featured_until TIMESTAMPTZ,
  views_count INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ads_status ON public.ads(status);
CREATE INDEX idx_ads_category ON public.ads(category_id);
CREATE INDEX idx_ads_user ON public.ads(user_id);
CREATE INDEX idx_ads_featured ON public.ads(is_featured) WHERE is_featured = true;
CREATE INDEX idx_ads_created ON public.ads(created_at DESC);

CREATE POLICY "Approved ads are viewable by everyone"
  ON public.ads FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create ads"
  ON public.ads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ads"
  ON public.ads FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete their own ads"
  ON public.ads FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== AD PAYMENTS (for featured ads) ====================
CREATE TABLE public.ad_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  receipt_url TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  feature_duration_days INTEGER NOT NULL DEFAULT 7,
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON public.ad_payments FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their own payments"
  ON public.ad_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Only admins can update payments"
  ON public.ad_payments FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete payments"
  ON public.ad_payments FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ad_payments_updated_at
  BEFORE UPDATE ON public.ad_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== SITE SETTINGS ====================
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'إعلانات مدينة العبور',
  site_description TEXT NOT NULL DEFAULT 'موقع الإعلانات المبوبة الأول في مدينة العبور',
  logo_url TEXT,
  favicon_url TEXT,
  keywords TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  featured_ad_price NUMERIC(10, 2) NOT NULL DEFAULT 50,
  featured_ad_duration_days INTEGER NOT NULL DEFAULT 7,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings are viewable by everyone"
  ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update site settings"
  ON public.site_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can insert site settings"
  ON public.site_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.site_settings (site_name, site_description, keywords)
VALUES (
  'إعلانات مدينة العبور',
  'موقع الإعلانات المبوبة الأول في مدينة العبور — بيع، اشتري، أعلن مجاناً',
  'مدينة العبور, إعلانات, إعلانات مبوبة, سيارات, عقارات, وظائف, خدمات'
);

-- ==================== PAYMENT METHODS ====================
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  method_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT,
  instructions TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active payment methods are viewable by everyone"
  ON public.payment_methods FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can insert payment methods"
  ON public.payment_methods FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update payment methods"
  ON public.payment_methods FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete payment methods"
  ON public.payment_methods FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed payment methods
INSERT INTO public.payment_methods (method_type, display_name, account_number, account_name, icon, display_order) VALUES
  ('instapay', 'إنستاباي', 'example@instapay', 'مدينة العبور للإعلانات', 'CreditCard', 1),
  ('vodafone_cash', 'فودافون كاش', '01000000000', 'مدينة العبور للإعلانات', 'Smartphone', 2);

-- ==================== SITE VISITS ====================
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT,
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_visits_created ON public.site_visits(created_at DESC);

CREATE POLICY "Anyone can record visits"
  ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can view visits"
  ON public.site_visits FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ==================== STORAGE BUCKETS ====================
INSERT INTO storage.buckets (id, name, public) VALUES ('ads', 'ads', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('payments', 'payments', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('site', 'site', true);

-- Ads bucket policies
CREATE POLICY "Ad images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'ads');
CREATE POLICY "Authenticated users can upload ad images"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own ad images"
  ON storage.objects FOR UPDATE USING (bucket_id = 'ads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own ad images"
  ON storage.objects FOR DELETE USING (bucket_id = 'ads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Payments bucket policies (private)
CREATE POLICY "Users can view their own payment receipts"
  ON storage.objects FOR SELECT USING (bucket_id = 'payments' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Users can upload their own payment receipts"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Site bucket policies
CREATE POLICY "Site assets are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'site');
CREATE POLICY "Only admins can upload site assets"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update site assets"
  ON storage.objects FOR UPDATE USING (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete site assets"
  ON storage.objects FOR DELETE USING (bucket_id = 'site' AND public.has_role(auth.uid(), 'admin'));