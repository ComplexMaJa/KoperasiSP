-- Helper function to check role of currently logged in user
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.user_roles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS for all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori_pinjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simpanan_pokok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simpanan_wajib ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simpanan_sukarela ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.angsuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.denda ENABLE ROW LEVEL SECURITY;

-- 1. user_roles Policies
CREATE POLICY "Users can view their own role" ON public.user_roles
    FOR SELECT TO authenticated USING (id = auth.uid() OR public.get_current_user_role() = 'admin');

CREATE POLICY "Only Admin can insert/modify roles" ON public.user_roles
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');

-- 2. pengaturan Policies
CREATE POLICY "Anyone authenticated can view settings" ON public.pengaturan
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Admin can manage settings" ON public.pengaturan
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');

-- 3. anggota Policies
CREATE POLICY "Admin & Pengurus can manage all members" ON public.anggota
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own profile" ON public.anggota
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. kategori_pinjaman Policies
CREATE POLICY "Anyone authenticated can view categories" ON public.kategori_pinjaman
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only Admin can manage categories" ON public.kategori_pinjaman
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'admin');

-- Helper to check if a member id belongs to the current user
CREATE OR REPLACE FUNCTION public.is_current_user_member(p_anggota_id BIGINT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.anggota 
    WHERE id = p_anggota_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. simpanan_pokok Policies
CREATE POLICY "Admin & Pengurus can manage all simpanan pokok" ON public.simpanan_pokok
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own simpanan pokok" ON public.simpanan_pokok
    FOR SELECT TO authenticated USING (public.is_current_user_member(anggota_id));

-- 6. simpanan_wajib Policies
CREATE POLICY "Admin & Pengurus can manage all simpanan wajib" ON public.simpanan_wajib
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own simpanan wajib" ON public.simpanan_wajib
    FOR SELECT TO authenticated USING (public.is_current_user_member(anggota_id));

-- 7. simpanan_sukarela Policies
CREATE POLICY "Admin & Pengurus can manage all simpanan sukarela" ON public.simpanan_sukarela
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own simpanan sukarela" ON public.simpanan_sukarela
    FOR SELECT TO authenticated USING (public.is_current_user_member(anggota_id));

-- 8. pinjaman Policies
CREATE POLICY "Admin & Pengurus can manage all pinjaman" ON public.pinjaman
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own pinjaman" ON public.pinjaman
    FOR SELECT TO authenticated USING (public.is_current_user_member(anggota_id));

CREATE POLICY "Members can submit their own pinjaman application" ON public.pinjaman
    FOR INSERT TO authenticated WITH CHECK (
        public.is_current_user_member(anggota_id) AND
        status = 'pengajuan'::pinjaman_status
    );

-- 9. angsuran Policies
CREATE POLICY "Admin & Pengurus can manage all angsuran" ON public.angsuran
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own angsuran" ON public.angsuran
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.pinjaman 
            WHERE id = pinjaman_id AND public.is_current_user_member(anggota_id)
        )
    );

-- 10. denda Policies
CREATE POLICY "Admin & Pengurus can manage all denda" ON public.denda
    FOR ALL TO authenticated USING (public.get_current_user_role() IN ('admin', 'pengurus'));

CREATE POLICY "Members can view their own denda" ON public.denda
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.angsuran a
            JOIN public.pinjaman p ON p.id = a.pinjaman_id
            WHERE a.id = angsuran_id AND public.is_current_user_member(p.anggota_id)
        )
    );
