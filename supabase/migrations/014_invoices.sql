CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  purchase_id uuid REFERENCES purchases(id),
  user_id uuid REFERENCES auth.users(id),
  user_email text NOT NULL,
  user_name text,
  ebook_title text NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'XOF',
  status text DEFAULT 'paid' CHECK (status IN ('paid','refunded','cancelled')),
  company_name text,
  company_address text,
  company_rccm text,
  company_ifu text,
  company_phone text,
  pdf_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE next_num integer; year_str text;
BEGIN
  year_str := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'HJV-\d{4}-(\d+)') AS integer)), 0) + 1 INTO next_num FROM invoices WHERE invoice_number LIKE 'HJV-' || year_str || '-%';
  RETURN 'HJV-' || year_str || '-' || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
