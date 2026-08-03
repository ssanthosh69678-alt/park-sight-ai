-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PARKING AREAS
CREATE TABLE public.parking_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  parking_type TEXT NOT NULL DEFAULT 'outdoor',
  camera_image_url TEXT,
  demo_mode BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_areas TO authenticated;
GRANT ALL ON public.parking_areas TO service_role;
ALTER TABLE public.parking_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own areas" ON public.parking_areas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PARKING SLOTS
CREATE TABLE public.parking_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.parking_areas ON DELETE CASCADE,
  slot_number TEXT NOT NULL,
  coordinates JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'unknown',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.parking_slots (area_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_slots TO authenticated;
GRANT ALL ON public.parking_slots TO service_role;
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own slots" ON public.parking_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()));

-- PARKING RECORDS
CREATE TABLE public.parking_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.parking_areas ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occupied INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 0,
  occupancy_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'demo'
);
CREATE INDEX ON public.parking_records (area_id, recorded_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_records TO authenticated;
GRANT ALL ON public.parking_records TO service_role;
ALTER TABLE public.parking_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own records" ON public.parking_records FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()));

-- PREDICTIONS
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.parking_areas ON DELETE CASCADE,
  prediction_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  predicted_occupancy NUMERIC(5,2) NOT NULL DEFAULT 0,
  predicted_occupied INTEGER NOT NULL DEFAULT 0,
  predicted_available INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'MODERATE',
  confidence NUMERIC(5,2),
  model_version TEXT NOT NULL DEFAULT 'demo-rf-v1',
  is_simulated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.predictions (area_id, prediction_time DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own predictions" ON public.predictions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()));

-- CAMERA SESSIONS
CREATE TABLE public.camera_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.parking_areas ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  detection_count INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT 'demo'
);
CREATE INDEX ON public.camera_sessions (area_id, started_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_sessions TO authenticated;
GRANT ALL ON public.camera_sessions TO service_role;
ALTER TABLE public.camera_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sessions" ON public.camera_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.parking_areas a WHERE a.id = area_id AND a.user_id = auth.uid()));

-- ALERTS
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  area_id UUID REFERENCES public.parking_areas ON DELETE CASCADE,
  alert_type TEXT NOT NULL DEFAULT 'info',
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.alerts (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts" ON public.alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER t_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_areas_updated BEFORE UPDATE ON public.parking_areas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_slots_updated BEFORE UPDATE ON public.parking_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          COALESCE(NEW.email, ''),
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();