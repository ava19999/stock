


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."base_mjm" (
    "part_number" "text" NOT NULL,
    "name" "text",
    "application" "text",
    "quantity" bigint,
    "shelf" "text",
    "brand" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."base_mjm" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fetch_base_data"() RETURNS SETOF "public"."base_mjm"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
SELECT * FROM base_mjm WHERE quantity > 5;
$$;


ALTER FUNCTION "public"."fetch_base_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_po_number"("store_code" character varying) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    next_num INTEGER;
    year_part VARCHAR;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYMM');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(po_number FROM 'PO-[A-Z]+-[0-9]{4}-([0-9]+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM supplier_orders
    WHERE po_number LIKE 'PO-' || UPPER(store_code) || '-' || year_part || '-%';
    
    RETURN 'PO-' || UPPER(store_code) || '-' || year_part || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;


ALTER FUNCTION "public"."get_next_po_number"("store_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_kilat_sale"("p_store" character varying, "p_part_number" character varying, "p_qty" integer, "p_no_pesanan" character varying, "p_resi" character varying, "p_customer" character varying, "p_harga" numeric, "p_ecommerce" character varying) RETURNS TABLE("matched" boolean, "kilat_id" "uuid", "matched_qty" integer, "remaining_qty" integer)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_kilat_id UUID;
  v_qty_sisa INTEGER;
  v_matched_qty INTEGER;
BEGIN
  -- Cari KILAT pending dengan part_number yang sama
  IF p_store = 'mjm' THEN
    SELECT id, (qty_kirim - qty_terjual) INTO v_kilat_id, v_qty_sisa
    FROM kilat_prestock_mjm
    WHERE part_number = p_part_number
      AND status IN ('MENUNGGU_TERJUAL', 'SEBAGIAN_TERJUAL')
      AND (qty_kirim - qty_terjual) > 0
    ORDER BY tanggal_kirim ASC -- FIFO: yang paling lama dulu
    LIMIT 1;
    
    IF v_kilat_id IS NOT NULL THEN
      -- Hitung qty yang bisa di-match
      v_matched_qty := LEAST(p_qty, v_qty_sisa);
      
      -- Update qty_terjual
      UPDATE kilat_prestock_mjm
      SET qty_terjual = qty_terjual + v_matched_qty
      WHERE id = v_kilat_id;
      
      -- Insert ke kilat_penjualan
      INSERT INTO kilat_penjualan_mjm (
        kilat_id, no_pesanan, resi_penjualan, customer,
        part_number, qty_jual, harga_jual, tanggal_jual,
        source, ecommerce
      ) VALUES (
        v_kilat_id, p_no_pesanan, p_resi, p_customer,
        p_part_number, v_matched_qty, p_harga, NOW(),
        'CSV', p_ecommerce
      );
      
      RETURN QUERY SELECT TRUE, v_kilat_id, v_matched_qty, (p_qty - v_matched_qty);
      RETURN;
    END IF;
  ELSE
    -- BJW store
    SELECT id, (qty_kirim - qty_terjual) INTO v_kilat_id, v_qty_sisa
    FROM kilat_prestock_bjw
    WHERE part_number = p_part_number
      AND status IN ('MENUNGGU_TERJUAL', 'SEBAGIAN_TERJUAL')
      AND (qty_kirim - qty_terjual) > 0
    ORDER BY tanggal_kirim ASC
    LIMIT 1;
    
    IF v_kilat_id IS NOT NULL THEN
      v_matched_qty := LEAST(p_qty, v_qty_sisa);
      
      UPDATE kilat_prestock_bjw
      SET qty_terjual = qty_terjual + v_matched_qty
      WHERE id = v_kilat_id;
      
      INSERT INTO kilat_penjualan_bjw (
        kilat_id, no_pesanan, resi_penjualan, customer,
        part_number, qty_jual, harga_jual, tanggal_jual,
        source, ecommerce
      ) VALUES (
        v_kilat_id, p_no_pesanan, p_resi, p_customer,
        p_part_number, v_matched_qty, p_harga, NOW(),
        'CSV', p_ecommerce
      );
      
      RETURN QUERY SELECT TRUE, v_kilat_id, v_matched_qty, (p_qty - v_matched_qty);
      RETURN;
    END IF;
  END IF;
  
  -- Tidak ada match
  RETURN QUERY SELECT FALSE, NULL::UUID, 0, p_qty;
END;
$$;


ALTER FUNCTION "public"."match_kilat_sale"("p_store" character varying, "p_part_number" character varying, "p_qty" integer, "p_no_pesanan" character varying, "p_resi" character varying, "p_customer" character varying, "p_harga" numeric, "p_ecommerce" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_data_agung_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_data_agung_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kilat_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Auto update status based on qty
    IF NEW.qty_terjual >= NEW.qty_kirim THEN
        NEW.status = 'HABIS_TERJUAL';
    ELSIF NEW.qty_terjual > 0 THEN
        NEW.status = 'SEBAGIAN_TERJUAL';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_kilat_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kirim_barang_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_kirim_barang_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_pending_supplier_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_pending_supplier_orders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."retur_mjm" (
    "id" bigint NOT NULL,
    "tanggal_pemesanan" timestamp without time zone,
    "resi" "text",
    "toko" "text",
    "customer" "text",
    "part_number" "text",
    "nama_barang" "text",
    "quantity" numeric,
    "harga_satuan" numeric,
    "harga_total" numeric,
    "tanggal_retur" timestamp without time zone,
    "keterangan" "text",
    "ecommerce" "text",
    "status" "text",
    "tipe_retur" "text"
);


ALTER TABLE "public"."retur_mjm" OWNER TO "postgres";


ALTER TABLE "public"."retur_mjm" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."RETUR_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."barang_keluar_bjw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kode_toko" "text",
    "tempo" "text",
    "ecommerce" "text",
    "customer" "text",
    "part_number" "text",
    "name" "text",
    "brand" "text",
    "application" "text",
    "rak" "text",
    "stock_ahir" numeric,
    "qty_keluar" numeric,
    "harga_satuan" numeric,
    "harga_total" numeric,
    "resi" "text",
    "created_at" timestamp with time zone,
    "order_id" "text",
    "tanggal" timestamp with time zone,
    "resellerdari" "text"
);


ALTER TABLE "public"."barang_keluar_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."barang_keluar_bjw" IS 'This is a duplicate of barang_keluar';



CREATE TABLE IF NOT EXISTS "public"."barang_keluar_mjm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kode_toko" "text",
    "tempo" "text",
    "ecommerce" "text",
    "customer" "text",
    "part_number" "text",
    "name" "text",
    "brand" "text",
    "application" "text",
    "rak" "text",
    "stock_ahir" numeric,
    "qty_keluar" numeric,
    "harga_total" numeric,
    "resi" "text",
    "created_at" timestamp without time zone,
    "order_id" "text",
    "tanggal" timestamp with time zone,
    "harga_satuan" numeric,
    "resellerdari" "text"
);


ALTER TABLE "public"."barang_keluar_mjm" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."barang_masuk_bjw" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "part_number" "text",
    "nama_barang" "text",
    "qty_masuk" numeric DEFAULT 0,
    "harga_satuan" numeric DEFAULT 0,
    "harga_total" numeric DEFAULT 0,
    "customer" "text",
    "ecommerce" "text",
    "tempo" "text",
    "stok_akhir" numeric DEFAULT 0,
    "brand" "text",
    "application" "text",
    "rak" "text",
    "tanggal" timestamp without time zone
);


ALTER TABLE "public"."barang_masuk_bjw" OWNER TO "postgres";


ALTER TABLE "public"."barang_masuk_bjw" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."barang_masuk_bjw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."barang_masuk_mjm" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "part_number" "text",
    "nama_barang" "text",
    "qty_masuk" numeric DEFAULT 0,
    "harga_satuan" numeric DEFAULT 0,
    "harga_total" numeric DEFAULT 0,
    "customer" "text",
    "ecommerce" "text",
    "tempo" "text",
    "stok_akhir" numeric DEFAULT 0,
    "brand" "text",
    "application" "text",
    "rak" "text",
    "tanggal" timestamp without time zone
);


ALTER TABLE "public"."barang_masuk_mjm" OWNER TO "postgres";


ALTER TABLE "public"."barang_masuk_mjm" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."barang_masuk_mjm_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."base_bjw" (
    "part_number" "text" NOT NULL,
    "name" "text",
    "application" "text",
    "quantity" numeric,
    "shelf" "text",
    "brand" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."base_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."base_bjw" IS 'This is a duplicate of base_mjm';



CREATE TABLE IF NOT EXISTS "public"."customer_reseller" (
    "id_customer" integer NOT NULL,
    "nama_customer" character varying(255) NOT NULL,
    "kontak_customer" character varying(20),
    "id_reseller" integer NOT NULL,
    "alamat_customer" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."customer_reseller" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."customer_reseller_id_customer_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customer_reseller_id_customer_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customer_reseller_id_customer_seq" OWNED BY "public"."customer_reseller"."id_customer";



CREATE TABLE IF NOT EXISTS "public"."data_agung_kosong_bjw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "name" character varying(255),
    "brand" character varying(100),
    "quantity" integer DEFAULT 0,
    "is_online_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_agung_kosong_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_agung_kosong_bjw" IS 'Produk BJW kosong yang di-off dari online';



CREATE TABLE IF NOT EXISTS "public"."data_agung_kosong_mjm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "name" character varying(255),
    "brand" character varying(100),
    "quantity" integer DEFAULT 0,
    "is_online_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_agung_kosong_mjm" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_agung_kosong_mjm" IS 'Produk MJM kosong yang di-off dari online';



CREATE TABLE IF NOT EXISTS "public"."data_agung_masuk_bjw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "name" character varying(255),
    "brand" character varying(100),
    "quantity" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_agung_masuk_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_agung_masuk_bjw" IS 'Produk BJW dengan qty > 0 yang masuk (auto-moved)';



CREATE TABLE IF NOT EXISTS "public"."data_agung_masuk_mjm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "name" character varying(255),
    "brand" character varying(100),
    "quantity" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_agung_masuk_mjm" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_agung_masuk_mjm" IS 'Produk MJM dengan qty > 0 yang masuk (auto-moved)';



CREATE TABLE IF NOT EXISTS "public"."data_agung_online_bjw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "name" character varying(255),
    "brand" character varying(100),
    "quantity" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_agung_online_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_agung_online_bjw" IS 'Produk BJW yang di-listing online untuk Data Agung';



CREATE TABLE IF NOT EXISTS "public"."data_agung_online_mjm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "name" character varying(255),
    "brand" character varying(100),
    "quantity" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."data_agung_online_mjm" OWNER TO "postgres";


COMMENT ON TABLE "public"."data_agung_online_mjm" IS 'Produk MJM yang di-listing online untuk Data Agung';



CREATE TABLE IF NOT EXISTS "public"."foto" (
    "id" bigint NOT NULL,
    "part_number" "text",
    "foto_1" "text",
    "foto_2" "text",
    "foto_3" "text",
    "foto_4" "text",
    "foto_5" "text",
    "foto_6" "text",
    "foto_7" "text",
    "foto_8" "text",
    "foto_9" "text",
    "foto_10" "text",
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."foto" OWNER TO "postgres";


COMMENT ON TABLE "public"."foto" IS 'Foto produk berdasarkan part_number/SKU';



COMMENT ON COLUMN "public"."foto"."part_number" IS 'Part number / SKU produk (unique)';



ALTER TABLE "public"."foto" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."foto_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."foto_link" (
    "sku" "text",
    "nama_csv" "text" NOT NULL,
    "foto_1" "text",
    "foto_2" "text",
    "foto_3" "text",
    "foto_4" "text",
    "foto_5" "text",
    "foto_6" "text",
    "foto_7" "text",
    "foto_8" "text",
    "foto_9" "text",
    "foto_10" "text"
);


ALTER TABLE "public"."foto_link" OWNER TO "postgres";


COMMENT ON TABLE "public"."foto_link" IS 'Mapping nama produk dari CSV e-commerce ke SKU gudang dengan foto';



COMMENT ON COLUMN "public"."foto_link"."sku" IS 'SKU/Part Number di gudang';



COMMENT ON COLUMN "public"."foto_link"."nama_csv" IS 'Nama produk dari file CSV e-commerce (primary key)';



CREATE TABLE IF NOT EXISTS "public"."importir_pembayaran" (
    "id" integer NOT NULL,
    "customer" character varying(255) NOT NULL,
    "tempo" character varying(50),
    "tanggal" "date" DEFAULT CURRENT_DATE NOT NULL,
    "jumlah" numeric(15,2) DEFAULT 0 NOT NULL,
    "keterangan" "text",
    "store" character varying(10) DEFAULT 'all'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "for_months" "date",
    "toko" "text"
);


ALTER TABLE "public"."importir_pembayaran" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."importir_pembayaran_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."importir_pembayaran_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."importir_pembayaran_id_seq" OWNED BY "public"."importir_pembayaran"."id";



CREATE TABLE IF NOT EXISTS "public"."importir_tagihan" (
    "id" integer NOT NULL,
    "customer" character varying(255) NOT NULL,
    "tempo" character varying(50),
    "tanggal" "date" DEFAULT CURRENT_DATE NOT NULL,
    "jumlah" numeric(15,2) DEFAULT 0 NOT NULL,
    "keterangan" "text",
    "store" character varying(10) DEFAULT 'all'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."importir_tagihan" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."importir_tagihan_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."importir_tagihan_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."importir_tagihan_id_seq" OWNED BY "public"."importir_tagihan"."id";



CREATE TABLE IF NOT EXISTS "public"."inv_tagihan" (
    "id" bigint NOT NULL,
    "created_at" "date" NOT NULL,
    "toko" "text",
    "total" numeric,
    "status" "text",
    "inv" "text",
    "customer" "text",
    "tempo" character varying(50),
    "jatuh_tempo_bulan" character(7)
);


ALTER TABLE "public"."inv_tagihan" OWNER TO "postgres";


COMMENT ON TABLE "public"."inv_tagihan" IS 'Stores printed invoice receipts per customer/store/month.';



ALTER TABLE "public"."inv_tagihan" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inv_tagihan_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."invoice_print_flags" (
    "id" integer NOT NULL,
    "customer" character varying(255) NOT NULL,
    "tempo" character varying(50),
    "jatuh_tempo_bulan" character(7) NOT NULL,
    "store" character varying(10) DEFAULT 'all'::character varying,
    "invoice_no" character varying(50) NOT NULL,
    "printed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_print_flags" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_print_flags" IS 'Marks tagihan toko that have been printed (per customer / tempo / bulan / store).';



CREATE SEQUENCE IF NOT EXISTS "public"."invoice_print_flags_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoice_print_flags_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoice_print_flags_id_seq" OWNED BY "public"."invoice_print_flags"."id";



CREATE TABLE IF NOT EXISTS "public"."kilat_penjualan_bjw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kilat_id" "uuid",
    "no_pesanan" character varying(100),
    "resi_penjualan" character varying(100),
    "customer" character varying(200),
    "part_number" character varying(100),
    "nama_barang" character varying(500),
    "qty_jual" integer DEFAULT 1,
    "harga_satuan" numeric(15,2) DEFAULT 0,
    "harga_jual" numeric(15,2) DEFAULT 0,
    "tanggal_jual" timestamp without time zone,
    "source" character varying(20) DEFAULT 'CSV'::character varying,
    "ecommerce" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."kilat_penjualan_bjw" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kilat_penjualan_mjm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kilat_id" "uuid",
    "no_pesanan" character varying(100),
    "resi_penjualan" character varying(100),
    "customer" character varying(200),
    "part_number" character varying(100),
    "nama_barang" character varying(500),
    "qty_jual" integer DEFAULT 1,
    "harga_satuan" numeric(15,2) DEFAULT 0,
    "harga_jual" numeric(15,2) DEFAULT 0,
    "tanggal_jual" timestamp without time zone,
    "source" character varying(20) DEFAULT 'CSV'::character varying,
    "ecommerce" character varying(50),
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."kilat_penjualan_mjm" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kilat_prestock_bjw" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_resi_id" "uuid",
    "tanggal_kirim" timestamp without time zone DEFAULT "now"(),
    "resi_kirim" character varying(100),
    "part_number" character varying(100) NOT NULL,
    "nama_barang" character varying(500),
    "brand" character varying(100),
    "application" character varying(500),
    "qty_kirim" integer DEFAULT 1 NOT NULL,
    "qty_terjual" integer DEFAULT 0,
    "status" character varying(30) DEFAULT 'MENUNGGU_TERJUAL'::character varying,
    "toko" character varying(10) DEFAULT 'BJW'::character varying,
    "sub_toko" character varying(50),
    "created_by" character varying(100),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "stock_reduced" boolean DEFAULT false,
    "stock_reduced_at" timestamp without time zone
);


ALTER TABLE "public"."kilat_prestock_bjw" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kilat_prestock_mjm" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_resi_id" "uuid",
    "tanggal_kirim" timestamp without time zone DEFAULT "now"(),
    "resi_kirim" character varying(100),
    "part_number" character varying(100) NOT NULL,
    "nama_barang" character varying(500),
    "brand" character varying(100),
    "application" character varying(500),
    "qty_kirim" integer DEFAULT 1 NOT NULL,
    "qty_terjual" integer DEFAULT 0,
    "status" character varying(30) DEFAULT 'MENUNGGU_TERJUAL'::character varying,
    "toko" character varying(10) DEFAULT 'MJM'::character varying,
    "sub_toko" character varying(50),
    "created_by" character varying(100),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "stock_reduced" boolean DEFAULT false,
    "stock_reduced_at" timestamp without time zone
);


ALTER TABLE "public"."kilat_prestock_mjm" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kilat_summary_bjw" AS
 SELECT "id",
    "scan_resi_id",
    "tanggal_kirim",
    "resi_kirim",
    "part_number",
    "nama_barang",
    "brand",
    "application",
    "qty_kirim",
    "qty_terjual",
    "status",
    "toko",
    "sub_toko",
    "created_by",
    "created_at",
    "updated_at",
    "stock_reduced",
    "stock_reduced_at",
    ("qty_kirim" - "qty_terjual") AS "qty_sisa",
        CASE
            WHEN ("qty_terjual" >= "qty_kirim") THEN 'HABIS_TERJUAL'::"text"
            WHEN ("qty_terjual" > 0) THEN 'SEBAGIAN_TERJUAL'::"text"
            ELSE 'MENUNGGU_TERJUAL'::"text"
        END AS "status_calculated",
    EXTRACT(day FROM ("now"() - ("tanggal_kirim")::timestamp with time zone)) AS "aging_days"
   FROM "public"."kilat_prestock_bjw" "kp";


ALTER VIEW "public"."kilat_summary_bjw" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."kilat_summary_mjm" AS
 SELECT "id",
    "scan_resi_id",
    "tanggal_kirim",
    "resi_kirim",
    "part_number",
    "nama_barang",
    "brand",
    "application",
    "qty_kirim",
    "qty_terjual",
    "status",
    "toko",
    "sub_toko",
    "created_by",
    "created_at",
    "updated_at",
    "stock_reduced",
    "stock_reduced_at",
    ("qty_kirim" - "qty_terjual") AS "qty_sisa",
        CASE
            WHEN ("qty_terjual" >= "qty_kirim") THEN 'HABIS_TERJUAL'::"text"
            WHEN ("qty_terjual" > 0) THEN 'SEBAGIAN_TERJUAL'::"text"
            ELSE 'MENUNGGU_TERJUAL'::"text"
        END AS "status_calculated",
    EXTRACT(day FROM ("now"() - ("tanggal_kirim")::timestamp with time zone)) AS "aging_days"
   FROM "public"."kilat_prestock_mjm" "kp";


ALTER VIEW "public"."kilat_summary_mjm" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kirim_barang" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "from_store" character varying(10) NOT NULL,
    "to_store" character varying(10) NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "nama_barang" character varying(255) NOT NULL,
    "brand" character varying(100),
    "application" "text",
    "quantity" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "catatan" "text",
    "catatan_reject" "text",
    "requested_by" character varying(100),
    "approved_by" character varying(100),
    "sent_by" character varying(100),
    "received_by" character varying(100),
    "approved_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    CONSTRAINT "kirim_barang_from_store_check" CHECK ((("from_store")::"text" = ANY (ARRAY[('mjm'::character varying)::"text", ('bjw'::character varying)::"text"]))),
    CONSTRAINT "kirim_barang_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "kirim_barang_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('sent'::character varying)::"text", ('received'::character varying)::"text", ('rejected'::character varying)::"text"]))),
    CONSTRAINT "kirim_barang_to_store_check" CHECK ((("to_store")::"text" = ANY (ARRAY[('mjm'::character varying)::"text", ('bjw'::character varying)::"text"])))
);


ALTER TABLE "public"."kirim_barang" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."list_harga_jual" (
    "part_number" character varying NOT NULL,
    "name" "text",
    "harga" numeric,
    "created_at" timestamp without time zone
);


ALTER TABLE "public"."list_harga_jual" OWNER TO "postgres";


COMMENT ON TABLE "public"."list_harga_jual" IS 'This is a duplicate of scan_resi';



CREATE TABLE IF NOT EXISTS "public"."order_supplier" (
    "id" integer NOT NULL,
    "store" character varying(16) NOT NULL,
    "supplier" character varying(64) NOT NULL,
    "part_number" character varying(64) NOT NULL,
    "name" character varying(128),
    "qty" integer NOT NULL,
    "price" integer DEFAULT 0,
    "status" character varying(16) DEFAULT 'PENDING'::character varying,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."order_supplier" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."order_supplier_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."order_supplier_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."order_supplier_id_seq" OWNED BY "public"."order_supplier"."id";



CREATE TABLE IF NOT EXISTS "public"."orders_bjw" (
    "tanggal" timestamp with time zone NOT NULL,
    "customer" "text",
    "part_number" "text",
    "nama_barang" "text",
    "quantity" numeric,
    "harga_satuan" numeric,
    "harga_total" numeric,
    "status" "text",
    "tempo" "text",
    "id" bigint NOT NULL
);


ALTER TABLE "public"."orders_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."orders_bjw" IS 'This is a duplicate of orders_mjm';



ALTER TABLE "public"."orders_bjw" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."orders_bjw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."orders_mjm" (
    "tanggal" timestamp with time zone,
    "customer" "text",
    "part_number" "text",
    "nama_barang" "text",
    "quantity" numeric,
    "harga_satuan" numeric,
    "harga_total" numeric,
    "status" "text",
    "tempo" "text",
    "id" bigint NOT NULL
);


ALTER TABLE "public"."orders_mjm" OWNER TO "postgres";


ALTER TABLE "public"."orders_mjm" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."orders_mjm_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."pending_supplier_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store" character varying(10) DEFAULT 'mjm'::character varying NOT NULL,
    "part_number" character varying(100) NOT NULL,
    "nama_barang" character varying(255) NOT NULL,
    "qty_requested" integer NOT NULL,
    "current_stock" integer DEFAULT 0,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "requested_by" character varying(100),
    "approved_by" character varying(100),
    "processed_by" character varying(100),
    "notes" "text",
    "approved_at" timestamp with time zone,
    "processed_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "supplier_order_id" integer,
    CONSTRAINT "pending_supplier_orders_qty_requested_check" CHECK (("qty_requested" > 0)),
    CONSTRAINT "pending_supplier_orders_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('approved'::character varying)::"text", ('processed'::character varying)::"text", ('rejected'::character varying)::"text"]))),
    CONSTRAINT "pending_supplier_orders_store_check" CHECK ((("store")::"text" = ANY (ARRAY[('mjm'::character varying)::"text", ('bjw'::character varying)::"text"])))
);


ALTER TABLE "public"."pending_supplier_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."petty_cash_bjw" (
    "id" bigint NOT NULL,
    "tgl" timestamp with time zone DEFAULT "now"(),
    "keterangan" "text",
    "type" "text" NOT NULL,
    "akun" "text" DEFAULT 'cash'::"text",
    "saldokeluarmasuk" numeric DEFAULT 0,
    "saldosaatini" numeric DEFAULT 0,
    "kegunaan" "text"
);


ALTER TABLE "public"."petty_cash_bjw" OWNER TO "postgres";


ALTER TABLE "public"."petty_cash_bjw" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."petty_cash_bjw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."petty_cash_mjm" (
    "id" bigint NOT NULL,
    "tgl" timestamp with time zone DEFAULT "now"(),
    "keterangan" "text",
    "type" "text" NOT NULL,
    "akun" "text" DEFAULT 'cash'::"text",
    "saldokeluarmasuk" numeric DEFAULT 0,
    "saldosaatini" numeric DEFAULT 0,
    "kegunaan" "text"
);


ALTER TABLE "public"."petty_cash_mjm" OWNER TO "postgres";


ALTER TABLE "public"."petty_cash_mjm" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."petty_cash_mjm_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_alias" (
    "id" integer NOT NULL,
    "part_number" "text" NOT NULL,
    "alias_name" "text" NOT NULL,
    "source" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_alias" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_alias" IS 'Alias/nama alternatif untuk produk, digunakan untuk fitur pencarian';



COMMENT ON COLUMN "public"."product_alias"."part_number" IS 'Part number produk di gudang';



COMMENT ON COLUMN "public"."product_alias"."alias_name" IS 'Nama alternatif (misal: nama dari CSV e-commerce)';



COMMENT ON COLUMN "public"."product_alias"."source" IS 'Sumber alias: manual, foto_link, csv_upload, etc';



CREATE SEQUENCE IF NOT EXISTS "public"."product_alias_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_alias_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_alias_id_seq" OWNED BY "public"."product_alias"."id";



CREATE TABLE IF NOT EXISTS "public"."reseller" (
    "id_reseller" integer NOT NULL,
    "nama_reseller" character varying(255) NOT NULL,
    "kontak_reseller" character varying(20),
    "toko_terkait" character varying(10) NOT NULL,
    "alamat_reseller" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."reseller" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."reseller_id_reseller_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."reseller_id_reseller_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."reseller_id_reseller_seq" OWNED BY "public"."reseller"."id_reseller";



CREATE TABLE IF NOT EXISTS "public"."resi_items_bjw" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" "text",
    "status_pesanan" "text",
    "opsi_pengiriman" "text",
    "customer" "text",
    "total_harga_produk" numeric,
    "jumlah" numeric,
    "nama_produk" "text",
    "ecommerce" "text",
    "toko" "text",
    "part_number" "text",
    "resi" "text",
    "status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."resi_items_bjw" OWNER TO "postgres";


ALTER TABLE "public"."resi_items_bjw" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."resi_items_bjw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."resi_items_mjm" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" "text",
    "status_pesanan" "text",
    "opsi_pengiriman" "text",
    "customer" "text",
    "total_harga_produk" numeric,
    "jumlah" numeric,
    "nama_produk" "text",
    "ecommerce" "text",
    "toko" "text",
    "part_number" "text",
    "resi" "text",
    "status" "text" DEFAULT 'pending'::"text"
);


ALTER TABLE "public"."resi_items_mjm" OWNER TO "postgres";


ALTER TABLE "public"."resi_items_mjm" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."resi_items_mjm_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."retur_bjw" (
    "id" bigint NOT NULL,
    "tanggal_pemesanan" timestamp without time zone,
    "resi" "text",
    "toko" "text",
    "customer" "text",
    "part_number" "text",
    "nama_barang" "text",
    "quantity" numeric,
    "harga_satuan" numeric,
    "harga_total" numeric,
    "tanggal_retur" timestamp without time zone,
    "keterangan" "text",
    "ecommerce" "text",
    "status" "text",
    "tipe_retur" "text"
);


ALTER TABLE "public"."retur_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."retur_bjw" IS 'This is a duplicate of retur';



ALTER TABLE "public"."retur_bjw" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."retur_bjw_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."scan_resi_bjw" (
    "tanggal" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ecommerce" "text",
    "toko" "text",
    "customer" "text",
    "part_number" "text",
    "barang" "text",
    "brand" "text",
    "application" "text",
    "stok_saatini" numeric,
    "qty_out" numeric,
    "total_harga" numeric,
    "harga_satuan" numeric,
    "resi" "text" DEFAULT ''::"text" NOT NULL,
    "no_pesanan" "text",
    "is_split" boolean DEFAULT false,
    "id_reseller" integer,
    "id_customer" integer,
    "negara_ekspor" "text",
    "stage1_scanned" boolean,
    "stage1_scanned_at" timestamp with time zone,
    "stage1_scanned_by" "text",
    "status" "text",
    "sub_toko" "text",
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "stage2_verified" boolean,
    "stage2_verified_at" timestamp without time zone,
    "stage2_verified_by" "text",
    "stage3_completed" boolean DEFAULT false,
    "stage3_completed_at" timestamp without time zone,
    "order_id" "text",
    "resellerdari" "text"
);


ALTER TABLE "public"."scan_resi_bjw" OWNER TO "postgres";


COMMENT ON TABLE "public"."scan_resi_bjw" IS 'This is a duplicate of scan_resi_mjm';



CREATE TABLE IF NOT EXISTS "public"."scan_resi_mjm" (
    "tanggal" timestamp with time zone DEFAULT "now"(),
    "ecommerce" "text",
    "customer" "text",
    "part_number" "text",
    "qty_out" numeric,
    "total_harga" numeric,
    "harga_satuan" numeric,
    "resi" "text" DEFAULT ''::"text" NOT NULL,
    "no_pesanan" "text",
    "is_split" boolean DEFAULT false,
    "split_group_id" "text",
    "id_reseller" integer,
    "id_customer" integer,
    "negara_ekspor" "text",
    "stage1_scanned" boolean,
    "stage1_scanned_at" timestamp with time zone,
    "stage1_scanned_by" "text",
    "status" "text",
    "sub_toko" "text",
    "stage2_verified" boolean,
    "stage2_verified_at" "text",
    "stage2_verified_by" "text",
    "stage3_completed" boolean DEFAULT false,
    "stage3_completed_at" timestamp without time zone,
    "order_id" "text",
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "resellerdari" "text"
);


ALTER TABLE "public"."scan_resi_mjm" OWNER TO "postgres";


COMMENT ON TABLE "public"."scan_resi_mjm" IS 'This is a duplicate of orders';



CREATE TABLE IF NOT EXISTS "public"."supplier_order_items" (
    "id" integer NOT NULL,
    "order_id" integer,
    "part_number" character varying(100) NOT NULL,
    "nama_barang" character varying(255),
    "qty" integer DEFAULT 1 NOT NULL,
    "harga_satuan" numeric(15,2) DEFAULT 0,
    "harga_total" numeric(15,2) DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_order_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."supplier_order_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."supplier_order_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."supplier_order_items_id_seq" OWNED BY "public"."supplier_order_items"."id";



CREATE TABLE IF NOT EXISTS "public"."supplier_orders" (
    "id" integer NOT NULL,
    "po_number" character varying(20) NOT NULL,
    "supplier" character varying(255) NOT NULL,
    "store" character varying(10) DEFAULT 'mjm'::character varying NOT NULL,
    "tempo" character varying(20) DEFAULT 'CASH'::character varying,
    "total_items" integer DEFAULT 0,
    "total_value" numeric(15,2) DEFAULT 0,
    "notes" "text",
    "status" character varying(20) DEFAULT 'PENDING'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."supplier_orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."supplier_orders_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."supplier_orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."supplier_orders_id_seq" OWNED BY "public"."supplier_orders"."id";



CREATE TABLE IF NOT EXISTS "public"."toko_pembayaran" (
    "id" integer NOT NULL,
    "customer" character varying(255) NOT NULL,
    "tempo" character varying(50),
    "tanggal" "date" NOT NULL,
    "jumlah" numeric(15,2) DEFAULT 0 NOT NULL,
    "keterangan" "text",
    "store" character varying(10) DEFAULT 'all'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "for_months" "date"
);


ALTER TABLE "public"."toko_pembayaran" OWNER TO "postgres";


COMMENT ON TABLE "public"."toko_pembayaran" IS 'Stores payment records from customer stores (toko) for tempo sales';



CREATE SEQUENCE IF NOT EXISTS "public"."toko_pembayaran_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."toko_pembayaran_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."toko_pembayaran_id_seq" OWNED BY "public"."toko_pembayaran"."id";



CREATE OR REPLACE VIEW "public"."v_stock_online_bjw" AS
 SELECT "i"."part_number",
    "i"."name",
    "i"."brand",
    "i"."quantity" AS "stock",
    "s"."qty_keluar",
    "s"."tanggal",
    "bm"."customer" AS "supplier",
    "bm"."created_at" AS "supplier_date",
    "bm"."harga_satuan" AS "supplier_price"
   FROM (("public"."base_bjw" "i"
     JOIN ( SELECT "barang_keluar_bjw"."part_number",
            "sum"("barang_keluar_bjw"."qty_keluar") AS "qty_keluar",
            ("barang_keluar_bjw"."created_at")::"date" AS "tanggal"
           FROM "public"."barang_keluar_bjw"
          WHERE ("barang_keluar_bjw"."created_at" >= (CURRENT_DATE - '6 days'::interval))
          GROUP BY "barang_keluar_bjw"."part_number", (("barang_keluar_bjw"."created_at")::"date")) "s" ON (("i"."part_number" = "s"."part_number")))
     LEFT JOIN LATERAL ( SELECT "barang_masuk_bjw"."customer",
            "barang_masuk_bjw"."created_at",
            "barang_masuk_bjw"."harga_satuan"
           FROM "public"."barang_masuk_bjw"
          WHERE (("barang_masuk_bjw"."part_number" = "i"."part_number") AND ("barang_masuk_bjw"."customer" IS NOT NULL) AND ("barang_masuk_bjw"."customer" <> ''::"text") AND ("barang_masuk_bjw"."customer" <> '-'::"text"))
          ORDER BY "barang_masuk_bjw"."created_at" DESC
         LIMIT 1) "bm" ON (true))
  WHERE (("i"."quantity" >= (0)::numeric) AND ("i"."quantity" <= (2)::numeric))
  ORDER BY "s"."tanggal" DESC, "i"."part_number";


ALTER VIEW "public"."v_stock_online_bjw" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_stock_online_mjm" AS
 SELECT "i"."part_number",
    "i"."name",
    "i"."brand",
    "i"."quantity" AS "stock",
    "s"."qty_keluar",
    "s"."tanggal",
    "bm"."customer" AS "supplier",
    "bm"."created_at" AS "supplier_date",
    "bm"."harga_satuan" AS "supplier_price"
   FROM (("public"."base_mjm" "i"
     JOIN ( SELECT "barang_keluar_mjm"."part_number",
            "sum"("barang_keluar_mjm"."qty_keluar") AS "qty_keluar",
            ("barang_keluar_mjm"."created_at")::"date" AS "tanggal"
           FROM "public"."barang_keluar_mjm"
          WHERE ("barang_keluar_mjm"."created_at" >= (CURRENT_DATE - '6 days'::interval))
          GROUP BY "barang_keluar_mjm"."part_number", (("barang_keluar_mjm"."created_at")::"date")) "s" ON (("i"."part_number" = "s"."part_number")))
     LEFT JOIN LATERAL ( SELECT "barang_masuk_mjm"."customer",
            "barang_masuk_mjm"."created_at",
            "barang_masuk_mjm"."harga_satuan"
           FROM "public"."barang_masuk_mjm"
          WHERE (("barang_masuk_mjm"."part_number" = "i"."part_number") AND ("barang_masuk_mjm"."customer" IS NOT NULL) AND ("barang_masuk_mjm"."customer" <> ''::"text") AND ("barang_masuk_mjm"."customer" <> '-'::"text"))
          ORDER BY "barang_masuk_mjm"."created_at" DESC
         LIMIT 1) "bm" ON (true))
  WHERE (("i"."quantity" >= 0) AND ("i"."quantity" <= 2))
  ORDER BY "s"."tanggal" DESC, "i"."part_number";


ALTER VIEW "public"."v_stock_online_mjm" OWNER TO "postgres";


ALTER TABLE ONLY "public"."customer_reseller" ALTER COLUMN "id_customer" SET DEFAULT "nextval"('"public"."customer_reseller_id_customer_seq"'::"regclass");



ALTER TABLE ONLY "public"."importir_pembayaran" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."importir_pembayaran_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."importir_tagihan" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."importir_tagihan_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."invoice_print_flags" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."invoice_print_flags_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."order_supplier" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."order_supplier_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_alias" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_alias_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."reseller" ALTER COLUMN "id_reseller" SET DEFAULT "nextval"('"public"."reseller_id_reseller_seq"'::"regclass");



ALTER TABLE ONLY "public"."supplier_order_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."supplier_order_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."supplier_orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."supplier_orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."toko_pembayaran" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."toko_pembayaran_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."retur_mjm"
    ADD CONSTRAINT "RETUR_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barang_keluar_bjw"
    ADD CONSTRAINT "barang_keluar_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barang_keluar_mjm"
    ADD CONSTRAINT "barang_keluar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barang_masuk_bjw"
    ADD CONSTRAINT "barang_masuk_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."barang_masuk_mjm"
    ADD CONSTRAINT "barang_masuk_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."base_bjw"
    ADD CONSTRAINT "base_bjw_pkey" PRIMARY KEY ("part_number");



ALTER TABLE ONLY "public"."base_mjm"
    ADD CONSTRAINT "base_mjm_pkey" PRIMARY KEY ("part_number");



ALTER TABLE ONLY "public"."customer_reseller"
    ADD CONSTRAINT "customer_reseller_pkey" PRIMARY KEY ("id_customer");



ALTER TABLE ONLY "public"."data_agung_kosong_bjw"
    ADD CONSTRAINT "data_agung_kosong_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_agung_kosong_mjm"
    ADD CONSTRAINT "data_agung_kosong_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_agung_masuk_bjw"
    ADD CONSTRAINT "data_agung_masuk_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_agung_masuk_mjm"
    ADD CONSTRAINT "data_agung_masuk_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_agung_online_bjw"
    ADD CONSTRAINT "data_agung_online_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."data_agung_online_mjm"
    ADD CONSTRAINT "data_agung_online_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."foto_link"
    ADD CONSTRAINT "foto_link_pkey" PRIMARY KEY ("nama_csv");



ALTER TABLE ONLY "public"."foto"
    ADD CONSTRAINT "foto_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."importir_pembayaran"
    ADD CONSTRAINT "importir_pembayaran_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."importir_tagihan"
    ADD CONSTRAINT "importir_tagihan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inv_tagihan"
    ADD CONSTRAINT "inv_tagihan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_print_flags"
    ADD CONSTRAINT "invoice_print_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kilat_penjualan_bjw"
    ADD CONSTRAINT "kilat_penjualan_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kilat_penjualan_mjm"
    ADD CONSTRAINT "kilat_penjualan_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kilat_prestock_bjw"
    ADD CONSTRAINT "kilat_prestock_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kilat_prestock_mjm"
    ADD CONSTRAINT "kilat_prestock_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kirim_barang"
    ADD CONSTRAINT "kirim_barang_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."list_harga_jual"
    ADD CONSTRAINT "list_harga_jual_part_number_key" UNIQUE ("part_number");



ALTER TABLE ONLY "public"."list_harga_jual"
    ADD CONSTRAINT "list_harga_jual_pkey" PRIMARY KEY ("part_number");



ALTER TABLE ONLY "public"."order_supplier"
    ADD CONSTRAINT "order_supplier_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders_bjw"
    ADD CONSTRAINT "orders_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders_mjm"
    ADD CONSTRAINT "orders_mjm_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."orders_mjm"
    ADD CONSTRAINT "orders_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pending_supplier_orders"
    ADD CONSTRAINT "pending_supplier_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."petty_cash_bjw"
    ADD CONSTRAINT "petty_cash_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."petty_cash_mjm"
    ADD CONSTRAINT "petty_cash_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_alias"
    ADD CONSTRAINT "product_alias_part_number_alias_name_key" UNIQUE ("part_number", "alias_name");



ALTER TABLE ONLY "public"."product_alias"
    ADD CONSTRAINT "product_alias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reseller"
    ADD CONSTRAINT "reseller_pkey" PRIMARY KEY ("id_reseller");



ALTER TABLE ONLY "public"."resi_items_bjw"
    ADD CONSTRAINT "resi_items_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resi_items_mjm"
    ADD CONSTRAINT "resi_items_mjm_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."retur_bjw"
    ADD CONSTRAINT "retur_bjw_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scan_resi_bjw"
    ADD CONSTRAINT "scan_resi_bjw_pkey" PRIMARY KEY ("id", "resi");



ALTER TABLE ONLY "public"."scan_resi_mjm"
    ADD CONSTRAINT "scan_resi_mjm_pkey" PRIMARY KEY ("resi", "id");



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."supplier_orders"
    ADD CONSTRAINT "supplier_orders_po_number_key" UNIQUE ("po_number");



ALTER TABLE ONLY "public"."toko_pembayaran"
    ADD CONSTRAINT "toko_pembayaran_pkey" PRIMARY KEY ("id");



CREATE INDEX "barang_keluar_bjw_created_at_idx" ON "public"."barang_keluar_bjw" USING "btree" ("created_at" DESC);



CREATE INDEX "barang_keluar_bjw_part_number_created_at_idx" ON "public"."barang_keluar_bjw" USING "btree" ("part_number", "created_at" DESC);



CREATE INDEX "idx_alias_search" ON "public"."product_alias" USING "gin" ("to_tsvector"('"indonesian"'::"regconfig", "alias_name"));



CREATE INDEX "idx_barang_keluar_created" ON "public"."barang_keluar_mjm" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_barang_keluar_lookup" ON "public"."barang_keluar_mjm" USING "btree" ("part_number", "created_at" DESC);



CREATE INDEX "idx_base_bjw_part" ON "public"."base_bjw" USING "btree" ("part_number");



CREATE INDEX "idx_base_mjm_part" ON "public"."base_mjm" USING "btree" ("part_number");



CREATE INDEX "idx_data_agung_kosong_bjw_part_number" ON "public"."data_agung_kosong_bjw" USING "btree" ("part_number");



CREATE INDEX "idx_data_agung_kosong_mjm_part_number" ON "public"."data_agung_kosong_mjm" USING "btree" ("part_number");



CREATE INDEX "idx_data_agung_masuk_bjw_part_number" ON "public"."data_agung_masuk_bjw" USING "btree" ("part_number");



CREATE INDEX "idx_data_agung_masuk_mjm_part_number" ON "public"."data_agung_masuk_mjm" USING "btree" ("part_number");



CREATE INDEX "idx_data_agung_online_bjw_part_number" ON "public"."data_agung_online_bjw" USING "btree" ("part_number");



CREATE INDEX "idx_data_agung_online_mjm_part_number" ON "public"."data_agung_online_mjm" USING "btree" ("part_number");



CREATE INDEX "idx_foto_link_sku" ON "public"."foto_link" USING "btree" ("sku");



CREATE INDEX "idx_foto_part_number" ON "public"."foto" USING "btree" ("part_number");



CREATE INDEX "idx_inv_tagihan_customer" ON "public"."inv_tagihan" USING "btree" ("customer");



CREATE INDEX "idx_inv_tagihan_month" ON "public"."inv_tagihan" USING "btree" ("jatuh_tempo_bulan");



CREATE INDEX "idx_inv_tagihan_status" ON "public"."inv_tagihan" USING "btree" ("status");



CREATE INDEX "idx_invoice_print_flags_customer" ON "public"."invoice_print_flags" USING "btree" ("customer");



CREATE INDEX "idx_invoice_print_flags_invoice" ON "public"."invoice_print_flags" USING "btree" ("invoice_no");



CREATE INDEX "idx_invoice_print_flags_month" ON "public"."invoice_print_flags" USING "btree" ("jatuh_tempo_bulan");



CREATE INDEX "idx_invoice_print_flags_store" ON "public"."invoice_print_flags" USING "btree" ("store");



CREATE INDEX "idx_kilat_penjualan_bjw_kilat_id" ON "public"."kilat_penjualan_bjw" USING "btree" ("kilat_id");



CREATE INDEX "idx_kilat_penjualan_bjw_no_pesanan" ON "public"."kilat_penjualan_bjw" USING "btree" ("no_pesanan");



CREATE INDEX "idx_kilat_penjualan_bjw_part_number" ON "public"."kilat_penjualan_bjw" USING "btree" ("part_number");



CREATE INDEX "idx_kilat_penjualan_bjw_resi" ON "public"."kilat_penjualan_bjw" USING "btree" ("resi_penjualan");



CREATE INDEX "idx_kilat_penjualan_mjm_kilat_id" ON "public"."kilat_penjualan_mjm" USING "btree" ("kilat_id");



CREATE INDEX "idx_kilat_penjualan_mjm_no_pesanan" ON "public"."kilat_penjualan_mjm" USING "btree" ("no_pesanan");



CREATE INDEX "idx_kilat_penjualan_mjm_part_number" ON "public"."kilat_penjualan_mjm" USING "btree" ("part_number");



CREATE INDEX "idx_kilat_penjualan_mjm_resi" ON "public"."kilat_penjualan_mjm" USING "btree" ("resi_penjualan");



CREATE INDEX "idx_kilat_prestock_bjw_created" ON "public"."kilat_prestock_bjw" USING "btree" ("created_at");



CREATE INDEX "idx_kilat_prestock_bjw_part_number" ON "public"."kilat_prestock_bjw" USING "btree" ("part_number");



CREATE INDEX "idx_kilat_prestock_bjw_resi_kirim" ON "public"."kilat_prestock_bjw" USING "btree" ("resi_kirim");



CREATE INDEX "idx_kilat_prestock_bjw_scan_resi" ON "public"."kilat_prestock_bjw" USING "btree" ("scan_resi_id");



CREATE INDEX "idx_kilat_prestock_bjw_status" ON "public"."kilat_prestock_bjw" USING "btree" ("status");



CREATE INDEX "idx_kilat_prestock_mjm_created" ON "public"."kilat_prestock_mjm" USING "btree" ("created_at");



CREATE INDEX "idx_kilat_prestock_mjm_part_number" ON "public"."kilat_prestock_mjm" USING "btree" ("part_number");



CREATE INDEX "idx_kilat_prestock_mjm_resi_kirim" ON "public"."kilat_prestock_mjm" USING "btree" ("resi_kirim");



CREATE INDEX "idx_kilat_prestock_mjm_scan_resi" ON "public"."kilat_prestock_mjm" USING "btree" ("scan_resi_id");



CREATE INDEX "idx_kilat_prestock_mjm_status" ON "public"."kilat_prestock_mjm" USING "btree" ("status");



CREATE INDEX "idx_kirim_barang_created_at" ON "public"."kirim_barang" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_kirim_barang_from_store" ON "public"."kirim_barang" USING "btree" ("from_store");



CREATE INDEX "idx_kirim_barang_part_number" ON "public"."kirim_barang" USING "btree" ("part_number");



CREATE INDEX "idx_kirim_barang_status" ON "public"."kirim_barang" USING "btree" ("status");



CREATE INDEX "idx_kirim_barang_to_store" ON "public"."kirim_barang" USING "btree" ("to_store");



CREATE INDEX "idx_order_supplier_part_number" ON "public"."order_supplier" USING "btree" ("part_number");



CREATE INDEX "idx_order_supplier_store" ON "public"."order_supplier" USING "btree" ("store");



CREATE INDEX "idx_order_supplier_supplier" ON "public"."order_supplier" USING "btree" ("supplier");



CREATE INDEX "idx_pending_supplier_orders_created_at" ON "public"."pending_supplier_orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pending_supplier_orders_part_number" ON "public"."pending_supplier_orders" USING "btree" ("part_number");



CREATE INDEX "idx_pending_supplier_orders_requested_by" ON "public"."pending_supplier_orders" USING "btree" ("requested_by");



CREATE INDEX "idx_pending_supplier_orders_status" ON "public"."pending_supplier_orders" USING "btree" ("status");



CREATE INDEX "idx_pending_supplier_orders_store" ON "public"."pending_supplier_orders" USING "btree" ("store");



CREATE INDEX "idx_product_alias_alias_name" ON "public"."product_alias" USING "btree" ("alias_name");



CREATE INDEX "idx_product_alias_part_number" ON "public"."product_alias" USING "btree" ("part_number");



CREATE INDEX "idx_resi_items_bjw_resi" ON "public"."resi_items_bjw" USING "btree" ("resi");



CREATE INDEX "idx_resi_items_bjw_status" ON "public"."resi_items_bjw" USING "btree" ("status");



CREATE INDEX "idx_resi_items_mjm_resi" ON "public"."resi_items_mjm" USING "btree" ("resi");



CREATE INDEX "idx_resi_items_mjm_status" ON "public"."resi_items_mjm" USING "btree" ("status");



CREATE INDEX "idx_scan_resi_bjw_resi" ON "public"."scan_resi_bjw" USING "btree" ("resi");



CREATE INDEX "idx_scan_resi_mjm_resi" ON "public"."scan_resi_mjm" USING "btree" ("resi");



CREATE INDEX "idx_supplier_order_items_order_id" ON "public"."supplier_order_items" USING "btree" ("order_id");



CREATE INDEX "idx_supplier_order_items_part_number" ON "public"."supplier_order_items" USING "btree" ("part_number");



CREATE INDEX "idx_supplier_orders_created_at" ON "public"."supplier_orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_supplier_orders_status" ON "public"."supplier_orders" USING "btree" ("status");



CREATE INDEX "idx_supplier_orders_store" ON "public"."supplier_orders" USING "btree" ("store");



CREATE INDEX "idx_supplier_orders_supplier" ON "public"."supplier_orders" USING "btree" ("supplier");



CREATE INDEX "idx_toko_pembayaran_customer" ON "public"."toko_pembayaran" USING "btree" ("customer");



CREATE INDEX "idx_toko_pembayaran_tanggal" ON "public"."toko_pembayaran" USING "btree" ("tanggal");



CREATE INDEX "idx_toko_pembayaran_tempo" ON "public"."toko_pembayaran" USING "btree" ("tempo");



CREATE OR REPLACE TRIGGER "trigger_update_data_agung_kosong_bjw" BEFORE UPDATE ON "public"."data_agung_kosong_bjw" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_agung_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_data_agung_kosong_mjm" BEFORE UPDATE ON "public"."data_agung_kosong_mjm" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_agung_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_data_agung_masuk_bjw" BEFORE UPDATE ON "public"."data_agung_masuk_bjw" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_agung_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_data_agung_masuk_mjm" BEFORE UPDATE ON "public"."data_agung_masuk_mjm" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_agung_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_data_agung_online_bjw" BEFORE UPDATE ON "public"."data_agung_online_bjw" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_agung_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_data_agung_online_mjm" BEFORE UPDATE ON "public"."data_agung_online_mjm" FOR EACH ROW EXECUTE FUNCTION "public"."update_data_agung_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_kirim_barang_timestamp" BEFORE UPDATE ON "public"."kirim_barang" FOR EACH ROW EXECUTE FUNCTION "public"."update_kirim_barang_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_pending_supplier_orders_timestamp" BEFORE UPDATE ON "public"."pending_supplier_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_pending_supplier_orders_updated_at"();



CREATE OR REPLACE TRIGGER "update_invoice_print_flags_updated_at" BEFORE UPDATE ON "public"."invoice_print_flags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_kilat_prestock_bjw_updated_at" BEFORE UPDATE ON "public"."kilat_prestock_bjw" FOR EACH ROW EXECUTE FUNCTION "public"."update_kilat_updated_at"();



CREATE OR REPLACE TRIGGER "update_kilat_prestock_mjm_updated_at" BEFORE UPDATE ON "public"."kilat_prestock_mjm" FOR EACH ROW EXECUTE FUNCTION "public"."update_kilat_updated_at"();



CREATE OR REPLACE TRIGGER "update_toko_pembayaran_updated_at" BEFORE UPDATE ON "public"."toko_pembayaran" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."customer_reseller"
    ADD CONSTRAINT "customer_reseller_id_reseller_fkey" FOREIGN KEY ("id_reseller") REFERENCES "public"."reseller"("id_reseller") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kilat_penjualan_bjw"
    ADD CONSTRAINT "kilat_penjualan_bjw_kilat_id_fkey" FOREIGN KEY ("kilat_id") REFERENCES "public"."kilat_prestock_bjw"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kilat_penjualan_mjm"
    ADD CONSTRAINT "kilat_penjualan_mjm_kilat_id_fkey" FOREIGN KEY ("kilat_id") REFERENCES "public"."kilat_prestock_mjm"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pending_supplier_orders"
    ADD CONSTRAINT "pending_supplier_orders_supplier_order_id_fkey" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_resi_bjw"
    ADD CONSTRAINT "scan_resi_bjw_id_customer_fkey" FOREIGN KEY ("id_customer") REFERENCES "public"."customer_reseller"("id_customer") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_resi_bjw"
    ADD CONSTRAINT "scan_resi_bjw_id_reseller_fkey" FOREIGN KEY ("id_reseller") REFERENCES "public"."reseller"("id_reseller") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_resi_mjm"
    ADD CONSTRAINT "scan_resi_mjm_id_customer_fkey" FOREIGN KEY ("id_customer") REFERENCES "public"."customer_reseller"("id_customer") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scan_resi_mjm"
    ADD CONSTRAINT "scan_resi_mjm_id_reseller_fkey" FOREIGN KEY ("id_reseller") REFERENCES "public"."reseller"("id_reseller") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."supplier_order_items"
    ADD CONSTRAINT "supplier_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all for authenticated" ON "public"."kilat_penjualan_bjw" USING (true);



CREATE POLICY "Allow all for authenticated" ON "public"."kilat_penjualan_mjm" USING (true);



CREATE POLICY "Allow all for authenticated" ON "public"."kilat_prestock_bjw" USING (true);



CREATE POLICY "Allow all for authenticated" ON "public"."kilat_prestock_mjm" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."data_agung_kosong_bjw" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."data_agung_kosong_mjm" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."data_agung_masuk_bjw" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."data_agung_masuk_mjm" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."data_agung_online_bjw" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."data_agung_online_mjm" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."foto" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."foto_link" USING (true);



CREATE POLICY "Allow all for authenticated users" ON "public"."product_alias" USING (true);



CREATE POLICY "Allow all for supplier_order_items" ON "public"."supplier_order_items" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all for supplier_orders" ON "public"."supplier_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on inv_tagihan" ON "public"."inv_tagihan" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on invoice_print_flags" ON "public"."invoice_print_flags" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on kirim_barang" ON "public"."kirim_barang" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on pending_supplier_orders" ON "public"."pending_supplier_orders" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all operations on toko_pembayaran" ON "public"."toko_pembayaran" USING (true) WITH CHECK (true);



CREATE POLICY "Allow delete foto_link" ON "public"."foto_link" FOR DELETE USING (true);



CREATE POLICY "Allow insert foto_link" ON "public"."foto_link" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow read foto_link" ON "public"."foto_link" FOR SELECT USING (true);



CREATE POLICY "Allow update foto_link" ON "public"."foto_link" FOR UPDATE USING (true);



CREATE POLICY "Enable all access" ON "public"."barang_keluar_mjm" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."barang_keluar_bjw";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."barang_keluar_mjm";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."resi_items_bjw";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."resi_items_mjm";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scan_resi_bjw";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scan_resi_mjm";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;

























































































































































GRANT ALL ON TABLE "public"."base_mjm" TO "anon";
GRANT ALL ON TABLE "public"."base_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."base_mjm" TO "service_role";


















GRANT ALL ON TABLE "public"."retur_mjm" TO "anon";
GRANT ALL ON TABLE "public"."retur_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."retur_mjm" TO "service_role";



GRANT ALL ON SEQUENCE "public"."RETUR_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."RETUR_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."RETUR_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."barang_keluar_bjw" TO "anon";
GRANT ALL ON TABLE "public"."barang_keluar_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."barang_keluar_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."barang_keluar_mjm" TO "anon";
GRANT ALL ON TABLE "public"."barang_keluar_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."barang_keluar_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."barang_masuk_bjw" TO "anon";
GRANT ALL ON TABLE "public"."barang_masuk_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."barang_masuk_bjw" TO "service_role";



GRANT ALL ON SEQUENCE "public"."barang_masuk_bjw_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."barang_masuk_bjw_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."barang_masuk_bjw_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."barang_masuk_mjm" TO "anon";
GRANT ALL ON TABLE "public"."barang_masuk_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."barang_masuk_mjm" TO "service_role";



GRANT ALL ON SEQUENCE "public"."barang_masuk_mjm_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."barang_masuk_mjm_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."barang_masuk_mjm_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."base_bjw" TO "anon";
GRANT ALL ON TABLE "public"."base_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."base_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."customer_reseller" TO "anon";
GRANT ALL ON TABLE "public"."customer_reseller" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_reseller" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_reseller_id_customer_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_reseller_id_customer_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_reseller_id_customer_seq" TO "service_role";



GRANT ALL ON TABLE "public"."data_agung_kosong_bjw" TO "anon";
GRANT ALL ON TABLE "public"."data_agung_kosong_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."data_agung_kosong_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."data_agung_kosong_mjm" TO "anon";
GRANT ALL ON TABLE "public"."data_agung_kosong_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."data_agung_kosong_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."data_agung_masuk_bjw" TO "anon";
GRANT ALL ON TABLE "public"."data_agung_masuk_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."data_agung_masuk_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."data_agung_masuk_mjm" TO "anon";
GRANT ALL ON TABLE "public"."data_agung_masuk_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."data_agung_masuk_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."data_agung_online_bjw" TO "anon";
GRANT ALL ON TABLE "public"."data_agung_online_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."data_agung_online_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."data_agung_online_mjm" TO "anon";
GRANT ALL ON TABLE "public"."data_agung_online_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."data_agung_online_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."foto" TO "anon";
GRANT ALL ON TABLE "public"."foto" TO "authenticated";
GRANT ALL ON TABLE "public"."foto" TO "service_role";



GRANT ALL ON SEQUENCE "public"."foto_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."foto_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."foto_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."foto_link" TO "anon";
GRANT ALL ON TABLE "public"."foto_link" TO "authenticated";
GRANT ALL ON TABLE "public"."foto_link" TO "service_role";



GRANT ALL ON TABLE "public"."importir_pembayaran" TO "anon";
GRANT ALL ON TABLE "public"."importir_pembayaran" TO "authenticated";
GRANT ALL ON TABLE "public"."importir_pembayaran" TO "service_role";



GRANT ALL ON SEQUENCE "public"."importir_pembayaran_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."importir_pembayaran_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."importir_pembayaran_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."importir_tagihan" TO "anon";
GRANT ALL ON TABLE "public"."importir_tagihan" TO "authenticated";
GRANT ALL ON TABLE "public"."importir_tagihan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."importir_tagihan_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."importir_tagihan_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."importir_tagihan_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inv_tagihan" TO "anon";
GRANT ALL ON TABLE "public"."inv_tagihan" TO "authenticated";
GRANT ALL ON TABLE "public"."inv_tagihan" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inv_tagihan_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inv_tagihan_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inv_tagihan_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_print_flags" TO "anon";
GRANT ALL ON TABLE "public"."invoice_print_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_print_flags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoice_print_flags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoice_print_flags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoice_print_flags_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."kilat_penjualan_bjw" TO "anon";
GRANT ALL ON TABLE "public"."kilat_penjualan_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."kilat_penjualan_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."kilat_penjualan_mjm" TO "anon";
GRANT ALL ON TABLE "public"."kilat_penjualan_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."kilat_penjualan_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."kilat_prestock_bjw" TO "anon";
GRANT ALL ON TABLE "public"."kilat_prestock_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."kilat_prestock_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."kilat_prestock_mjm" TO "anon";
GRANT ALL ON TABLE "public"."kilat_prestock_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."kilat_prestock_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."kirim_barang" TO "anon";
GRANT ALL ON TABLE "public"."kirim_barang" TO "authenticated";
GRANT ALL ON TABLE "public"."kirim_barang" TO "service_role";



GRANT ALL ON TABLE "public"."list_harga_jual" TO "anon";
GRANT ALL ON TABLE "public"."list_harga_jual" TO "authenticated";
GRANT ALL ON TABLE "public"."list_harga_jual" TO "service_role";



GRANT ALL ON TABLE "public"."order_supplier" TO "anon";
GRANT ALL ON TABLE "public"."order_supplier" TO "authenticated";
GRANT ALL ON TABLE "public"."order_supplier" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_supplier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_supplier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_supplier_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders_bjw" TO "anon";
GRANT ALL ON TABLE "public"."orders_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_bjw" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_bjw_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_bjw_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_bjw_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders_mjm" TO "anon";
GRANT ALL ON TABLE "public"."orders_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."orders_mjm" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_mjm_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_mjm_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_mjm_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."pending_supplier_orders" TO "anon";
GRANT ALL ON TABLE "public"."pending_supplier_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."pending_supplier_orders" TO "service_role";



GRANT ALL ON TABLE "public"."petty_cash_bjw" TO "anon";
GRANT ALL ON TABLE "public"."petty_cash_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."petty_cash_bjw" TO "service_role";



GRANT ALL ON SEQUENCE "public"."petty_cash_bjw_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."petty_cash_bjw_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."petty_cash_bjw_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."petty_cash_mjm" TO "anon";
GRANT ALL ON TABLE "public"."petty_cash_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."petty_cash_mjm" TO "service_role";



GRANT ALL ON SEQUENCE "public"."petty_cash_mjm_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."petty_cash_mjm_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."petty_cash_mjm_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_alias" TO "anon";
GRANT ALL ON TABLE "public"."product_alias" TO "authenticated";
GRANT ALL ON TABLE "public"."product_alias" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_alias_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_alias_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_alias_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reseller" TO "anon";
GRANT ALL ON TABLE "public"."reseller" TO "authenticated";
GRANT ALL ON TABLE "public"."reseller" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reseller_id_reseller_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reseller_id_reseller_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reseller_id_reseller_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resi_items_bjw" TO "anon";
GRANT ALL ON TABLE "public"."resi_items_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."resi_items_bjw" TO "service_role";



GRANT ALL ON SEQUENCE "public"."resi_items_bjw_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."resi_items_bjw_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."resi_items_bjw_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."resi_items_mjm" TO "anon";
GRANT ALL ON TABLE "public"."resi_items_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."resi_items_mjm" TO "service_role";



GRANT ALL ON SEQUENCE "public"."resi_items_mjm_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."resi_items_mjm_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."resi_items_mjm_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."retur_bjw" TO "anon";
GRANT ALL ON TABLE "public"."retur_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."retur_bjw" TO "service_role";



GRANT ALL ON SEQUENCE "public"."retur_bjw_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."retur_bjw_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."retur_bjw_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scan_resi_bjw" TO "anon";
GRANT ALL ON TABLE "public"."scan_resi_bjw" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_resi_bjw" TO "service_role";



GRANT ALL ON TABLE "public"."scan_resi_mjm" TO "anon";
GRANT ALL ON TABLE "public"."scan_resi_mjm" TO "authenticated";
GRANT ALL ON TABLE "public"."scan_resi_mjm" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_order_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."supplier_orders" TO "anon";
GRANT ALL ON TABLE "public"."supplier_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."supplier_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."supplier_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."supplier_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."toko_pembayaran" TO "anon";
GRANT ALL ON TABLE "public"."toko_pembayaran" TO "authenticated";
GRANT ALL ON TABLE "public"."toko_pembayaran" TO "service_role";



GRANT ALL ON SEQUENCE "public"."toko_pembayaran_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."toko_pembayaran_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."toko_pembayaran_id_seq" TO "service_role";






































