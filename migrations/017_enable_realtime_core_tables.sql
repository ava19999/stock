-- Enable realtime replication for core collaborative tables
DO $$
DECLARE
  t text;
  arr text[] := ARRAY[
    'base_mjm',
    'base_bjw',
    'orders_mjm',
    'orders_bjw',
    'barang_masuk_mjm',
    'barang_masuk_bjw',
    'barang_keluar_mjm',
    'barang_keluar_bjw',
    'foto'
  ];
BEGIN
  FOREACH t IN ARRAY arr LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END IF;
  END LOOP;
END
$$;
