-- 1. Automating Mandatory User Registration Roles
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (id, role)
  VALUES (new.id, COALESCE((new.raw_user_meta_data->>'role')::user_role, 'anggota'::user_role));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 2. Simulasi Pinjaman (Replacer for PinjamanService@hitungSimulasi)
CREATE OR REPLACE FUNCTION public.hitung_simulasi_pinjaman(
    p_jumlah_pinjaman DECIMAL(15, 2),
    p_tenor_bulan INT,
    p_kategori_id BIGINT
)
RETURNS TABLE (
    jumlah_pinjaman DECIMAL(15, 2),
    tenor_bulan INT,
    bunga_persen DECIMAL(5, 2),
    angsuran_pokok DECIMAL(15, 2),
    angsuran_bunga DECIMAL(15, 2),
    total_angsuran DECIMAL(15, 2)
) AS $$
DECLARE
    v_bunga_persen DECIMAL(5, 2);
BEGIN
    SELECT bunga_persen INTO v_bunga_persen FROM public.kategori_pinjaman WHERE id = p_kategori_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kategori pinjaman tidak ditemukan.';
    END IF;

    RETURN QUERY
    SELECT 
        p_jumlah_pinjaman,
        p_tenor_bulan,
        v_bunga_persen,
        (p_jumlah_pinjaman / p_tenor_bulan)::DECIMAL(15, 2),
        (p_jumlah_pinjaman * (v_bunga_persen / 100))::DECIMAL(15, 2),
        ((p_jumlah_pinjaman / p_tenor_bulan) + (p_jumlah_pinjaman * (v_bunga_persen / 100)))::DECIMAL(15, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Validasi Syarat Pengajuan (Replacer for PinjamanService@validasiSyarat)
CREATE OR REPLACE FUNCTION public.validasi_syarat_pinjaman(
    p_anggota_id BIGINT,
    p_jumlah_pinjaman DECIMAL(15, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_anggota RECORD;
    v_syarat_bulan INT;
    v_bulan_gabung INT;
    v_has_active BOOLEAN;
    v_total_pokok DECIMAL(15, 2);
    v_total_wajib DECIMAL(15, 2);
    v_faktor INT;
    v_maks_statis DECIMAL(15, 2);
    v_maks_dinamis DECIMAL(15, 2);
    v_maks DECIMAL(15, 2);
BEGIN
    -- Fetch anggota
    SELECT * INTO v_anggota FROM public.anggota WHERE id = p_anggota_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anggota tidak ditemukan.';
    END IF;

    IF v_anggota.status = 'keluar' THEN
        RAISE EXCEPTION 'Anggota sudah tidak aktif (keluar).';
    END IF;

    -- 1. Masa Keanggotaan
    SELECT COALESCE(nilai, 3) INTO v_syarat_bulan FROM public.pengaturan WHERE kunci = 'syarat_masa_keanggotaan';
    v_bulan_gabung := EXTRACT(YEAR FROM age(CURRENT_DATE, v_anggota.tanggal_gabung)) * 12 + EXTRACT(MONTH FROM age(CURRENT_DATE, v_anggota.tanggal_gabung));
    IF v_bulan_gabung < v_syarat_bulan THEN
        RAISE EXCEPTION 'Belum memenuhi syarat masa keanggotaan minimal % bulan.', v_syarat_bulan;
    END IF;

    -- 2. Tidak ada pinjaman aktif
    SELECT EXISTS (
        SELECT 1 FROM public.pinjaman 
        WHERE anggota_id = p_anggota_id AND status IN ('pengajuan', 'disetujui', 'cair')
    ) INTO v_has_active;

    IF v_has_active THEN
        RAISE EXCEPTION 'Anggota masih memiliki pinjaman aktif yang belum lunas.';
    END IF;

    -- 3. Cek Maks Pinjaman
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_pokok FROM public.simpanan_pokok WHERE anggota_id = p_anggota_id;
    SELECT COALESCE(SUM(jumlah), 0) INTO v_total_wajib FROM public.simpanan_wajib WHERE anggota_id = p_anggota_id;

    SELECT COALESCE(nilai, 3) INTO v_faktor FROM public.pengaturan WHERE kunci = 'faktor_maks_pinjaman';
    SELECT COALESCE(nilai, 5000000) INTO v_maks_statis FROM public.pengaturan WHERE kunci = 'maks_pinjaman_statis';

    v_maks_dinamis := (v_total_pokok + v_total_wajib) * v_faktor;
    -- Max limit is the larger of the dynamic limit (based on savings) and the static limit (default 5 million)
    v_maks := GREATEST(v_maks_dinamis, v_maks_statis);

    IF p_jumlah_pinjaman > v_maks THEN
        RAISE EXCEPTION 'Jumlah pinjaman melebihi batas maksimal Rp %', to_char(v_maks, 'FM999,999,999,990');
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Setujui Pinjaman & Generate Jadwal Angsuran (Replacer for PinjamanService@setujui)
CREATE OR REPLACE FUNCTION public.setujui_pinjaman(
    p_pinjaman_id BIGINT,
    p_admin_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_pinjaman RECORD;
    v_jatuh_tempo DATE;
    v_counter INT;
BEGIN
    SELECT * INTO v_pinjaman FROM public.pinjaman WHERE id = p_pinjaman_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pinjaman tidak ditemukan.';
    END IF;

    IF v_pinjaman.status != 'pengajuan' THEN
        RAISE EXCEPTION 'Hanya pinjaman dengan status pengajuan yang dapat disetujui.';
    END IF;

    -- Update status
    UPDATE public.pinjaman 
    SET status = 'disetujui',
        disetujui_oleh = p_admin_id,
        tanggal_disetujui = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_pinjaman_id;

    -- Generate Angsuran rows
    v_jatuh_tempo := CURRENT_DATE + INTERVAL '1 month';

    FOR v_counter IN 1..v_pinjaman.tenor_bulan LOOP
        INSERT INTO public.angsuran (pinjaman_id, ke, tanggal_jatuh_tempo, pokok, bunga, denda, status)
        VALUES (p_pinjaman_id, v_counter, v_jatuh_tempo, v_pinjaman.angsuran_pokok, v_pinjaman.angsuran_bunga, 0, 'belum');
        v_jatuh_tempo := v_jatuh_tempo + INTERVAL '1 month';
    END LOOP;

    RETURN json_build_object(
        'sukses', true, 
        'pesan', 'Pinjaman berhasil disetujui dan jadwal angsuran terbentuk.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Bayar Angsuran (Replacer for AngsuranController@bayar)
CREATE OR REPLACE FUNCTION public.bayar_angsuran(
    p_angsuran_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_angsuran RECORD;
    v_total_bayar DECIMAL(15, 2);
    v_pinjaman_id BIGINT;
    v_sisa_belum_lunas INT;
BEGIN
    SELECT * INTO v_angsuran FROM public.angsuran WHERE id = p_angsuran_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Angsuran tidak ditemukan.';
    END IF;

    IF v_angsuran.status = 'lunas' THEN
        RAISE EXCEPTION 'Angsuran ini sudah lunas.';
    END IF;

    v_total_bayar := v_angsuran.pokok + v_angsuran.bunga + v_angsuran.denda;
    v_pinjaman_id := v_angsuran.pinjaman_id;

    -- Update angsuran to lunas
    UPDATE public.angsuran
    SET status = 'lunas',
        tanggal_bayar = CURRENT_DATE,
        total_bayar = v_total_bayar,
        updated_at = NOW()
    WHERE id = p_angsuran_id;

    -- Check if all installments for this loan are now paid
    SELECT COUNT(*) INTO v_sisa_belum_lunas
    FROM public.angsuran
    WHERE pinjaman_id = v_pinjaman_id AND status != 'lunas';

    IF v_sisa_belum_lunas = 0 THEN
        UPDATE public.pinjaman
        SET status = 'lunas',
            tanggal_lunas = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = v_pinjaman_id;
    END IF;

    RETURN json_build_object(
        'sukses', true, 
        'pesan', 'Pembayaran angsuran berhasil diproses.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Pelunasan Cepat (Replacer for PinjamanService@pelunasanCepat)
CREATE OR REPLACE FUNCTION public.pelunasan_cepat(
    p_pinjaman_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_pinjaman RECORD;
BEGIN
    SELECT * INTO v_pinjaman FROM public.pinjaman WHERE id = p_pinjaman_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pinjaman tidak ditemukan.';
    END IF;

    IF v_pinjaman.status != 'cair' THEN
        RAISE EXCEPTION 'Hanya pinjaman aktif (cair) yang bisa dilunasi cepat.';
    END IF;

    -- Update unpaid installments
    -- Write off future interest, pay principal only, set denda to 0
    UPDATE public.angsuran
    SET tanggal_bayar = CURRENT_DATE,
        bunga = 0.00,
        denda = 0.00,
        total_bayar = pokok,
        status = 'lunas',
        updated_at = NOW()
    WHERE pinjaman_id = p_pinjaman_id AND status != 'lunas';

    -- Update loan status
    UPDATE public.pinjaman
    SET status = 'lunas',
        tanggal_lunas = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_pinjaman_id;

    RETURN json_build_object(
        'sukses', true, 
        'pesan', 'Pelunasan cepat berhasil diproses. Sisa bunga dihapuskan.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Simpanan Sukarela Withdraw/Deposit Processor (Replacer for SimpananService)
CREATE OR REPLACE FUNCTION public.proses_simpanan_sukarela(
    p_anggota_id BIGINT,
    p_jenis simpanan_jenis,
    p_jumlah DECIMAL(15, 2),
    p_keterangan VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
    v_setor DECIMAL(15, 2);
    v_tarik DECIMAL(15, 2);
    v_saldo_saat_ini DECIMAL(15, 2);
    v_saldo_minimal DECIMAL(15, 2);
    v_saldo_setelah DECIMAL(15, 2);
BEGIN
    -- Get current balance
    SELECT COALESCE(SUM(jumlah), 0) INTO v_setor FROM public.simpanan_sukarela WHERE anggota_id = p_anggota_id AND jenis = 'setor';
    SELECT COALESCE(SUM(jumlah), 0) INTO v_tarik FROM public.simpanan_sukarela WHERE anggota_id = p_anggota_id AND jenis = 'tarik';
    v_saldo_saat_ini := v_setor - v_tarik;

    IF p_jenis = 'tarik' THEN
        SELECT COALESCE(nilai, 20000) INTO v_saldo_minimal FROM public.pengaturan WHERE kunci = 'saldo_minimal_sukarela';
        
        IF (v_saldo_saat_ini - p_jumlah) < v_saldo_minimal THEN
            RAISE EXCEPTION 'Penarikan gagal. Saldo minimal yang harus mengendap adalah Rp %', to_char(v_saldo_minimal, 'FM999,999,999,990');
        END IF;
        
        v_saldo_setelah := v_saldo_saat_ini - p_jumlah;
    ELSE
        v_saldo_setelah := v_saldo_saat_ini + p_jumlah;
    END IF;

    -- Record transaction
    INSERT INTO public.simpanan_sukarela (anggota_id, jenis, jumlah, saldo_setelah, tanggal, keterangan)
    VALUES (p_anggota_id, p_jenis, p_jumlah, v_saldo_setelah, CURRENT_DATE, p_keterangan);

    RETURN json_build_object(
        'sukses', true,
        'saldo_baru', v_saldo_setelah,
        'pesan', 'Transaksi simpanan sukarela berhasil disimpan.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Proses Keluar Anggota (Replacer for AnggotaService@prosesKeluar)
CREATE OR REPLACE FUNCTION public.proses_keluar_anggota(
    p_anggota_id BIGINT,
    p_keterangan TEXT
)
RETURNS JSON AS $$
DECLARE
    v_anggota RECORD;
    v_has_active_loan BOOLEAN;
    v_pokok DECIMAL(15, 2);
    v_wajib DECIMAL(15, 2);
    v_setor DECIMAL(15, 2);
    v_tarik DECIMAL(15, 2);
    v_sukarela DECIMAL(15, 2);
    v_total_refund DECIMAL(15, 2);
BEGIN
    SELECT * INTO v_anggota FROM public.anggota WHERE id = p_anggota_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anggota tidak ditemukan.';
    END IF;

    IF v_anggota.status = 'keluar' THEN
        RAISE EXCEPTION 'Anggota sudah berstatus keluar.';
    END IF;

    -- Check active loan
    SELECT EXISTS (
        SELECT 1 FROM public.pinjaman 
        WHERE anggota_id = p_anggota_id AND status IN ('pengajuan', 'disetujui', 'cair')
    ) INTO v_has_active_loan;

    IF v_has_active_loan THEN
        RAISE EXCEPTION 'Anggota masih memiliki pinjaman aktif yang belum lunas.';
    END IF;

    -- Calculate refunds
    SELECT COALESCE(SUM(jumlah), 0) INTO v_pokok FROM public.simpanan_pokok WHERE anggota_id = p_anggota_id;
    SELECT COALESCE(SUM(jumlah), 0) INTO v_wajib FROM public.simpanan_wajib WHERE anggota_id = p_anggota_id;
    SELECT COALESCE(SUM(jumlah), 0) INTO v_setor FROM public.simpanan_sukarela WHERE anggota_id = p_anggota_id AND jenis = 'setor';
    SELECT COALESCE(SUM(jumlah), 0) INTO v_tarik FROM public.simpanan_sukarela WHERE anggota_id = p_anggota_id AND jenis = 'tarik';
    v_sukarela := v_setor - v_tarik;
    
    v_total_refund := v_pokok + v_wajib + v_sukarela;

    -- Process departure
    UPDATE public.anggota
    SET status = 'keluar',
        tanggal_keluar = CURRENT_DATE,
        keterangan_keluar = p_keterangan,
        updated_at = NOW()
    WHERE id = p_anggota_id;

    -- Deactivate associated auth user if linked
    IF v_anggota.user_id IS NOT NULL THEN
        -- Mark as inactive in user profiles or metadata (handled inside auth or user_roles)
        -- In our case, we can toggle metadata or role mapping
        UPDATE public.user_roles SET role = 'anggota' WHERE id = v_anggota.user_id;
    END IF;

    RETURN json_build_object(
        'sukses', true,
        'pokok', v_pokok,
        'wajib', v_wajib,
        'sukarela', v_sukarela,
        'total_refund', v_total_refund,
        'pesan', 'Anggota berhasil dikeluarkan. Total dana refund Rp ' || to_char(v_total_refund, 'FM999,999,999,990')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. hitung_refund_anggota (helper for refund calculations)
CREATE OR REPLACE FUNCTION public.hitung_refund_anggota(p_anggota_id BIGINT)
RETURNS TABLE (
    pokok DECIMAL(15, 2),
    wajib DECIMAL(15, 2),
    sukarela DECIMAL(15, 2),
    total DECIMAL(15, 2)
) AS $$
DECLARE
    v_pokok DECIMAL(15, 2);
    v_wajib DECIMAL(15, 2);
    v_setor DECIMAL(15, 2);
    v_tarik DECIMAL(15, 2);
    v_sukarela DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(jumlah), 0) INTO v_pokok FROM public.simpanan_pokok WHERE anggota_id = p_anggota_id;
    SELECT COALESCE(SUM(jumlah), 0) INTO v_wajib FROM public.simpanan_wajib WHERE anggota_id = p_anggota_id;
    SELECT COALESCE(SUM(jumlah), 0) INTO v_setor FROM public.simpanan_sukarela WHERE anggota_id = p_anggota_id AND jenis = 'setor';
    SELECT COALESCE(SUM(jumlah), 0) INTO v_tarik FROM public.simpanan_sukarela WHERE anggota_id = p_anggota_id AND jenis = 'tarik';
    v_sukarela := v_setor - v_tarik;

    RETURN QUERY SELECT v_pokok, v_wajib, v_sukarela, (v_pokok + v_wajib + v_sukarela);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. hitung_denda_harian (daily denda calculation batch processor)
CREATE OR REPLACE FUNCTION public.hitung_denda_harian()
RETURNS INTEGER AS $$
DECLARE
    v_tipe_denda DECIMAL(15, 2);
    v_nilai_denda DECIMAL(15, 2);
    v_angsuran RECORD;
    v_hari_telat INTEGER;
    v_nominal_denda DECIMAL(15, 2);
    v_count INTEGER := 0;
BEGIN
    SELECT nilai INTO v_tipe_denda FROM public.pengaturan WHERE kunci = 'denda_tipe';
    SELECT nilai INTO v_nilai_denda FROM public.pengaturan WHERE kunci = 'denda_nilai';
    
    IF v_tipe_denda IS NULL THEN v_tipe_denda := 1.00; END IF;
    IF v_nilai_denda IS NULL THEN v_nilai_denda := 1000.00; END IF;

    FOR v_angsuran IN 
        SELECT * FROM public.angsuran 
        WHERE status IN ('belum', 'telat') AND tanggal_jatuh_tempo < CURRENT_DATE
    LOOP
        v_hari_telat := CURRENT_DATE - v_angsuran.tanggal_jatuh_tempo;
        
        IF v_hari_telat > 0 THEN
            IF v_tipe_denda = 1.00 THEN
                v_nominal_denda := v_hari_telat * v_nilai_denda;
            ELSIF v_tipe_denda = 2.00 THEN
                v_nominal_denda := v_angsuran.pokok * (v_nilai_denda / 100.00) * CEIL(v_hari_telat::DECIMAL / 30.00);
            ELSE
                v_nominal_denda := v_hari_telat * v_nilai_denda;
            END IF;

            -- Update angsuran status and denda amount
            UPDATE public.angsuran 
            SET status = 'telat', 
                denda = v_nominal_denda, 
                updated_at = NOW()
            WHERE id = v_angsuran.id;

            -- Log to denda details table
            INSERT INTO public.denda (angsuran_id, jumlah, hari_telat, tanggal_hitung)
            VALUES (v_angsuran.id, v_nominal_denda, v_hari_telat, CURRENT_DATE);

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. User Management Stored Procedures (Admin Only)
CREATE OR REPLACE FUNCTION public.get_users()
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    email VARCHAR,
    is_active BOOLEAN,
    role VARCHAR,
    anggota_id BIGINT
) AS $$
BEGIN
    IF public.get_current_user_role() != 'admin'::user_role THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mengelola pengguna.';
    END IF;

    RETURN QUERY
    SELECT 
        u.id,
        COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))::VARCHAR AS name,
        u.email::VARCHAR AS email,
        COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) AS is_active,
        ur.role::VARCHAR AS role,
        a.id AS anggota_id
    FROM auth.users u
    LEFT JOIN public.user_roles ur ON ur.id = u.id
    LEFT JOIN public.anggota a ON a.user_id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_user(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR,
    p_role VARCHAR
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF public.get_current_user_role() != 'admin'::user_role THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mengelola pengguna.';
    END IF;

    -- Check if email exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email sudah terdaftar.';
    END IF;

    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, 
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
        is_super_admin, created_at, updated_at,
        confirmation_token, recovery_token, email_change, 
        email_change_token_new, email_change_token_current, 
        phone_change_token, reauthentication_token
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('name', p_name, 'is_active', true),
        false,
        now(),
        now(),
        '', '', '', '', '', '', ''
    ) RETURNING id INTO v_user_id;

    -- Update user_roles
    UPDATE public.user_roles 
    SET role = p_role::user_role
    WHERE id = v_user_id;

    RETURN json_build_object(
        'sukses', true,
        'id', v_user_id,
        'pesan', 'Pengguna berhasil dibuat.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user(
    p_id UUID,
    p_name VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR,
    p_role VARCHAR
) RETURNS JSON AS $$
BEGIN
    IF public.get_current_user_role() != 'admin'::user_role THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mengelola pengguna.';
    END IF;

    -- Update auth.users email & metadata
    UPDATE auth.users
    SET 
        email = COALESCE(p_email, email),
        encrypted_password = CASE WHEN p_password IS NOT NULL AND p_password != '' THEN crypt(p_password, gen_salt('bf')) ELSE encrypted_password END,
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('name', p_name),
        updated_at = now()
    WHERE id = p_id;

    -- Update user_roles
    UPDATE public.user_roles 
    SET role = p_role::user_role
    WHERE id = p_id;

    RETURN json_build_object(
        'sukses', true,
        'pesan', 'Pengguna berhasil diperbarui.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.toggle_user_active(
    p_id UUID
) RETURNS JSON AS $$
DECLARE
    v_current_active BOOLEAN;
BEGIN
    IF public.get_current_user_role() != 'admin'::user_role THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mengelola pengguna.';
    END IF;

    SELECT COALESCE((raw_user_meta_data->>'is_active')::boolean, true) INTO v_current_active
    FROM auth.users WHERE id = p_id;

    UPDATE auth.users
    SET 
        raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_active', NOT v_current_active),
        updated_at = now()
    WHERE id = p_id;

    RETURN json_build_object(
        'sukses', true,
        'pesan', 'Status keaktifan pengguna berhasil diubah.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_user(
    p_id UUID
) RETURNS JSON AS $$
BEGIN
    IF public.get_current_user_role() != 'admin'::user_role THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya admin yang dapat mengelola pengguna.';
    END IF;

    DELETE FROM auth.users WHERE id = p_id;

    RETURN json_build_object(
        'sukses', true,
        'pesan', 'Pengguna berhasil dihapus.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
