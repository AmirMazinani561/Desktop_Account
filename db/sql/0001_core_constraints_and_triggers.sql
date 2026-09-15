-- =============================================================================
--  0001_core_constraints_and_triggers.sql — فاز ۰ موتور مالی
--  سند بالادستی: DATA_MODEL.md نسخه ۰.۲ (بندهای ۴.۴ تا ۴.۹ و ۶)
-- =============================================================================
--  چرا این فایل جدا از Prisma است؟
--    Prisma فقط جدول/ستون/FK/ایندکس ساده می‌سازد. موارد زیر در توان آن نیست:
--      • قیدهای CHECK چندستونی و شرطی
--      • ایندکس‌های یونیک partial و functional
--      • تریگرها و توابع PL/pgSQL (تضمین تراز، تغییرناپذیری، قفل دوره، درخت حساب)
--      • viewها
--    بنابراین: اول `prisma migrate dev` (ساخت جدول‌ها) و بعد اجرای این فایل.
--    ترتیب اجرا و بازتولیدپذیری در `db/README.md` توضیح داده شده است.
--
--  قاعدهٔ نام‌گذاری: chk_* (قید)، ux_* (یونیک)، ix_* (ایندکس)، fn_* (تابع)، trg_* (تریگر)، v_* (view)
--  پیام خطاها: **کد انگلیسی پایدار** + شرح فارسی (طبق Agents.md)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ۰) مقدمات: مقدار پیش‌فرض UUID سمت دیتابیس و به‌روزرسانی خودکار updated_at
-- -----------------------------------------------------------------------------

-- Prisma شناسهٔ uuid را سمت کلاینت می‌سازد؛ برای اسکریپت‌های seed و مهاجرتِ
-- نوشته‌شده با SQL خام، ستون `id` مقدار پیش‌فرض دیتابیس هم می‌گیرد.
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables  t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name  = 'id'
       AND c.data_type    = 'uuid'
       AND c.column_default IS NULL
       AND t.table_type   = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()', r.table_name);
  END LOOP;
END
$do$;

CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- تریگرِ «لمس updated_at» برای هر جدولی که این ستون را دارد (ساخت خودکار)
DO $do$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables  t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name  = 'updated_at'
       AND t.table_type   = 'BASE TABLE'
       AND NOT EXISTS (
             SELECT 1 FROM information_schema.triggers tg
              WHERE tg.event_object_table  = c.table_name
                AND tg.event_object_schema = 'public'
                AND tg.trigger_name        = 'trg_touch_updated_at')
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at()',
      r.table_name);
  END LOOP;
END
$do$;

-- -----------------------------------------------------------------------------
-- ۱) قیدهای CHECK — لایهٔ اول تضمین یکپارچگی (DATA_MODEL بند ۴.۴)
-- -----------------------------------------------------------------------------

ALTER TABLE journals
  ADD CONSTRAINT chk_journals_totals_nonneg
    CHECK (total_debit >= 0 AND total_credit >= 0 AND line_count >= 0),
  ADD CONSTRAINT chk_journals_balanced_when_posted
    CHECK (status <> 'POSTED' OR (total_debit = total_credit AND total_debit > 0 AND line_count >= 2)),
  ADD CONSTRAINT chk_journals_void_fields
    CHECK (status <> 'VOID' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)),
  ADD CONSTRAINT chk_journals_posted_fields
    CHECK (status <> 'POSTED' OR (posted_at IS NOT NULL AND posted_by IS NOT NULL AND serial_no IS NOT NULL)),
  ADD CONSTRAINT chk_journals_soft_delete_draft_only
    CHECK (deleted_at IS NULL OR status = 'DRAFT'),
  ADD CONSTRAINT chk_journals_source_pair
    CHECK (source_type IS NULL OR source_id IS NOT NULL),
  ADD CONSTRAINT chk_journals_jalali_range
    CHECK (jalali_month BETWEEN 1 AND 12 AND jalali_day BETWEEN 1 AND 31);

ALTER TABLE journal_lines
  ADD CONSTRAINT chk_journal_lines_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT chk_journal_lines_jalali_range
    CHECK (jalali_month BETWEEN 1 AND 12);

ALTER TABLE accounts
  ADD CONSTRAINT chk_accounts_depth_positive   CHECK (depth >= 1),
  ADD CONSTRAINT chk_accounts_opening_nonneg   CHECK (opening_balance >= 0),
  ADD CONSTRAINT chk_accounts_path_shape       CHECK (path LIKE '/%' AND path LIKE '%/' AND position(id::text IN path) > 0),
  ADD CONSTRAINT chk_accounts_code_needs_level CHECK (code IS NULL OR coding_level IS NOT NULL);

ALTER TABLE counterparties
  ADD CONSTRAINT chk_counterparties_credit_legal
    CHECK (credit_limit IS NULL OR type = 'LEGAL');

ALTER TABLE fiscal_years
  ADD CONSTRAINT chk_fiscal_years_range CHECK (start_date < end_date);

ALTER TABLE fiscal_periods
  ADD CONSTRAINT chk_fiscal_periods_range  CHECK (start_date <= end_date),
  ADD CONSTRAINT chk_fiscal_periods_index  CHECK (period_index BETWEEN 1 AND 12),
  ADD CONSTRAINT chk_fiscal_periods_month  CHECK (jalali_month BETWEEN 1 AND 12);

ALTER TABLE account_period_balances
  ADD CONSTRAINT chk_balances_nonneg CHECK (
        opening_debit >= 0 AND opening_credit >= 0
    AND period_debit  >= 0 AND period_credit  >= 0
    AND closing_debit >= 0 AND closing_credit >= 0);

ALTER TABLE serial_counters
  ADD CONSTRAINT chk_serial_counters_nonneg CHECK (last_no >= 0);

ALTER TABLE external_transactions
  ADD CONSTRAINT chk_external_tx_amount_positive CHECK (amount > 0),
  ADD CONSTRAINT chk_external_tx_posted_needs_journal
    CHECK (status <> 'POSTED' OR journal_id IS NOT NULL),
  ADD CONSTRAINT chk_external_tx_mapped_needs_account
    CHECK (status NOT IN ('POSTED','MAPPED') OR mapped_account_id IS NOT NULL);

ALTER TABLE account_mapping_rules
  ADD CONSTRAINT chk_mapping_rule_value CHECK (match_kind = 'DEFAULT' OR match_value IS NOT NULL),
  ADD CONSTRAINT chk_mapping_rule_different_accounts CHECK (debit_account_id <> credit_account_id);

ALTER TABLE settings
  ADD CONSTRAINT chk_settings_scoped CHECK (company_id IS NOT NULL OR key LIKE 'global.%');

-- -----------------------------------------------------------------------------
-- ۲) ایندکس‌های یونیک partial / functional — چیزی که Prisma نمی‌سازد
-- -----------------------------------------------------------------------------

-- نام تکراری در یک سطح ممنوع (NULL در parent_id با UUID صفر نرمال شده تا
-- ریشه‌ها هم مشمول یونیک بودن بشوند)
CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_sibling_name
  ON accounts (company_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
  WHERE deleted_at IS NULL;

-- شمارهٔ سند در هر (مجموعه، سال مالی) یکتا است
CREATE UNIQUE INDEX IF NOT EXISTS ux_journals_serial
  ON journals (company_id, fiscal_year_id, serial_no)
  WHERE serial_no IS NOT NULL;

-- ضدتکرار: یک منبع خارجی نمی‌تواند دو سند برای یک رویداد بسازد
CREATE UNIQUE INDEX IF NOT EXISTS ux_journals_source
  ON journals (source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- کد حساب در فاز ۳ پر می‌شود؛ از حالا یونیکِ scoped است
CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_code
  ON accounts (company_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_external_sources_name
  ON external_sources (company_id, lower(name))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_counterparties_name
  ON counterparties (company_id, type, lower(name))
  WHERE deleted_at IS NULL;

-- کد یکتای طرف‌حساب (تولید خودکار یا دستی)
CREATE UNIQUE INDEX IF NOT EXISTS ux_counterparties_code
  ON counterparties (company_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

-- ایندکس‌های کمکی گزارش‌گیری (partial تا حجم کم بماند)
CREATE INDEX IF NOT EXISTS ix_journal_lines_posted_period
  ON journal_lines (company_id, account_id, jalali_year, jalali_month, amount)
  WHERE side = 'DEBIT';

CREATE INDEX IF NOT EXISTS ix_journals_posted
  ON journals (company_id, date DESC, serial_no DESC)
  WHERE status = 'POSTED';

CREATE INDEX IF NOT EXISTS ix_external_tx_review_queue
  ON external_transactions (company_id, received_at)
  WHERE status IN ('NEEDS_REVIEW', 'RECEIVED', 'REJECTED');

-- -----------------------------------------------------------------------------
-- ۳) تریگرها — لایهٔ دوم تضمین یکپارچگی (DATA_MODEL بند ۴.۶)
-- -----------------------------------------------------------------------------

-- ۳.۱ کاربر: ایمیل lowercase برای یونیک بودن بدون نیاز به citext
CREATE OR REPLACE FUNCTION fn_users_email_lower() RETURNS trigger AS $fn$
BEGIN
  NEW.email       := btrim(NEW.email);
  NEW.email_lower := lower(NEW.email);
  IF NEW.email_lower = '' THEN
    RAISE EXCEPTION 'EMAIL_REQUIRED: ایمیل نمی‌تواند خالی باشد';
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_email_lower ON users;
CREATE TRIGGER trg_users_email_lower
  BEFORE INSERT OR UPDATE OF email ON users
  FOR EACH ROW EXECUTE FUNCTION fn_users_email_lower();

-- ۳.۲ حساب: نگهداری path/depth و جلوگیری از حلقه در درخت
CREATE OR REPLACE FUNCTION fn_accounts_tree() RETURNS trigger AS $fn$
DECLARE
  v_parent_path  text;
  v_parent_depth integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path  := '/' || NEW.id::text || '/';
    NEW.depth := 1;
  ELSE
    SELECT a.path, a.depth
      INTO v_parent_path, v_parent_depth
      FROM accounts a
     WHERE a.id = NEW.parent_id AND a.company_id = NEW.company_id;

    IF v_parent_path IS NULL THEN
      RAISE EXCEPTION 'PARENT_ACCOUNT_NOT_FOUND: حساب والد در همین مجموعه پیدا نشد';
    END IF;
    IF position('/' || NEW.id::text || '/' IN v_parent_path) > 0 THEN
      RAISE EXCEPTION 'ACCOUNT_CYCLE_DETECTED: حساب نمی‌تواند زیرمجموعهٔ خودش باشد';
    END IF;

    NEW.path  := v_parent_path || NEW.id::text || '/';
    NEW.depth := v_parent_depth + 1;
  END IF;

  -- کدگذاری خودکار اگر کد وارد نشده باشد
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := fn_next_account_code(NEW.company_id, NEW.parent_id, NEW.account_class);
  END IF;
  IF NEW.coding_level IS NULL THEN
    NEW.coding_level := LEAST(NEW.depth, 4::smallint);
  END IF;

  -- اگر والد عوض شد، مسیر زیردرخت هم باید بازنشانی شود
  IF TG_OP = 'UPDATE' AND OLD.parent_id IS DISTINCT FROM NEW.parent_id THEN
    UPDATE accounts c
       SET path  = replace(c.path, OLD.path, NEW.path),
           depth = c.depth + (NEW.depth - OLD.depth)
      WHERE c.path LIKE OLD.path || '%'
        AND c.id <> NEW.id
        AND c.company_id = NEW.company_id;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_tree ON accounts;
CREATE TRIGGER trg_accounts_tree
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION fn_accounts_tree();

-- ۳.۳ حساب: محافظت از حساب سیستمی و حساب دارای گردش
CREATE OR REPLACE FUNCTION fn_accounts_guard() RETURNS trigger AS $fn$
DECLARE v_line_count bigint;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_system THEN
      RAISE EXCEPTION 'SYSTEM_ACCOUNT_PROTECTED: حساب سیستمی قابل حذف نیست';
    END IF;
    SELECT count(*) INTO v_line_count FROM journal_lines WHERE account_id = OLD.id;
    IF v_line_count > 0 THEN
      RAISE EXCEPTION 'ACCOUNT_HAS_ACTIVITY: حساب دارای % آرتیکل است و حذف نمی‌شود (به‌جای آن غیرفعال کنید)', v_line_count;
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.is_system THEN
    IF NEW.account_class <> OLD.account_class OR NEW.is_system <> OLD.is_system THEN
      RAISE EXCEPTION 'SYSTEM_ACCOUNT_PROTECTED: نوع و پرچم حساب سیستمی قابل تغییر نیست';
    END IF;
    IF NEW.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'SYSTEM_ACCOUNT_PROTECTED: حساب سیستمی قابل حذف منطقی نیست';
    END IF;
  END IF;

  IF NEW.is_postable = false AND EXISTS (SELECT 1 FROM journal_lines WHERE account_id = NEW.id) THEN
    RAISE EXCEPTION 'ACCOUNT_HAS_ACTIVITY: حسابی که آرتیکل دارد نمی‌تواند غیرقابل‌ثبت شود';
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_accounts_guard ON accounts;
CREATE TRIGGER trg_accounts_guard
  BEFORE UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION fn_accounts_guard();

-- ۳.۳.ب طرف‌حساب: کدگذاری خودکار در صورت وارد نشدن کد
CREATE OR REPLACE FUNCTION fn_counterparties_auto_code() RETURNS trigger AS $fn$
BEGIN
  IF NEW.code IS NULL OR btrim(NEW.code) = '' THEN
    NEW.code := fn_next_counterparty_code(NEW.company_id, NEW.type);
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_counterparties_auto_code ON counterparties;
CREATE TRIGGER trg_counterparties_auto_code
  BEFORE INSERT ON counterparties
  FOR EACH ROW EXECUTE FUNCTION fn_counterparties_auto_code();

-- ۳.۴ آرتیکل: پیش‌بررسی (تغییرناپذیری سند، حساب قابل‌ثبت، قفل دوره)
CREATE OR REPLACE FUNCTION fn_journal_lines_precheck() RETURNS trigger AS $fn$
DECLARE
  v_journal_status text;
  v_journal_company uuid;
  v_is_postable  boolean;
  v_period_status text;
BEGIN
  SELECT j.status::text, j.company_id
    INTO v_journal_status, v_journal_company
    FROM journals j
   WHERE j.id = NEW.journal_id;

  IF v_journal_status IS NULL THEN
    RAISE EXCEPTION 'JOURNAL_NOT_FOUND: سند مرجع آرتیکل وجود ندارد';
  END IF;
  IF v_journal_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'IMMUTABLE_JOURNAL: آرتیکل‌های سند % قابل افزودن/تغییر نیستند (برای اصلاح، سند معکوس بسازید)', v_journal_status;
  END IF;
  IF NEW.company_id <> v_journal_company THEN
    RAISE EXCEPTION 'COMPANY_MISMATCH: مجموعهٔ آرتیکل با مجموعهٔ سند یکی نیست';
  END IF;

  SELECT a.is_postable INTO v_is_postable FROM accounts a WHERE a.id = NEW.account_id;
  IF NOT COALESCE(v_is_postable, false) THEN
    RAISE EXCEPTION 'ACCOUNT_NOT_POSTABLE: حساب انتخاب‌شده برگ/تفصیلی نیست و آرتیکل نمی‌گیرد';
  END IF;

  SELECT fp.status::text INTO v_period_status FROM fiscal_periods fp WHERE fp.id = NEW.fiscal_period_id;
  IF v_period_status = 'LOCKED' THEN
    RAISE EXCEPTION 'PERIOD_LOCKED: دورهٔ مالی بسته است و ثبت در آن مجاز نیست';
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_lines_precheck ON journal_lines;
CREATE TRIGGER trg_journal_lines_precheck
  BEFORE INSERT OR UPDATE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION fn_journal_lines_precheck();

-- ۳.۵ آرتیکل: حذف فقط وقتی سند پیش‌نویس است
CREATE OR REPLACE FUNCTION fn_journal_lines_delete_guard() RETURNS trigger AS $fn$
DECLARE v_status text;
BEGIN
  SELECT j.status::text INTO v_status FROM journals j WHERE j.id = OLD.journal_id;
  IF COALESCE(v_status, 'DRAFT') <> 'DRAFT' THEN
    RAISE EXCEPTION 'IMMUTABLE_JOURNAL: آرتیکل‌های سند ثبت‌شده قابل حذف نیستند';
  END IF;
  RETURN OLD;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_lines_delete_guard ON journal_lines;
CREATE TRIGGER trg_journal_lines_delete_guard
  BEFORE DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION fn_journal_lines_delete_guard();

-- ۳.۶ بازمحاسبهٔ جمع‌های سند — قلب «تراز اجباری در سطح دیتابیس»
--      تعداد آرتیکل‌های هر سند کوچک است (معمولاً ۲ تا ۲۰)، پس تریگر سطری
--      هزینهٔ محسوسی ندارد و در عوض همیشه دقیق است.
CREATE OR REPLACE FUNCTION fn_journal_lines_recompute() RETURNS trigger AS $fn$
DECLARE
  v_journal_id uuid;
BEGIN
  v_journal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.journal_id ELSE NEW.journal_id END;

  UPDATE journals j
     SET total_debit  = COALESCE((SELECT sum(l.amount) FROM journal_lines l
                                   WHERE l.journal_id = v_journal_id AND l.side = 'DEBIT'), 0),
         total_credit = COALESCE((SELECT sum(l.amount) FROM journal_lines l
                                   WHERE l.journal_id = v_journal_id AND l.side = 'CREDIT'), 0),
         line_count   = COALESCE((SELECT count(*) FROM journal_lines l
                                   WHERE l.journal_id = v_journal_id), 0)::smallint
   WHERE j.id = v_journal_id;

  RETURN NULL; -- تریگر AFTER است
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_lines_recompute ON journal_lines;
CREATE TRIGGER trg_journal_lines_recompute
  AFTER INSERT OR UPDATE OR DELETE ON journal_lines
  FOR EACH ROW EXECUTE FUNCTION fn_journal_lines_recompute();

-- ۳.۷ سند: محافظت از وضعیت و فیلدهای کلیدی + قفل دوره هنگام ثبت
CREATE OR REPLACE FUNCTION fn_journals_guard() RETURNS trigger AS $fn$
DECLARE v_period_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status::text <> 'DRAFT' THEN
      RAISE EXCEPTION 'POSTED_JOURNAL_NOT_DELETABLE: سند % حذف‌شدنی نیست (فقط ابطال یا سند اصلاحی)', OLD.status::text;
    END IF;
    RETURN OLD;
  END IF;

  -- پیش‌نویس شدنِ دوبارهٔ سند ثبت/ابطال‌شده ممنوع
  IF OLD.status::text <> 'DRAFT' AND NEW.status::text = 'DRAFT' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: بازگرداندن سند به پیش‌نویس مجاز نیست';
  END IF;

  -- فیلدهای هویتی سند ثبت‌شده تغییرناپذیرند
  IF OLD.status::text <> 'DRAFT' AND (
        NEW.date             <> OLD.date
     OR NEW.fiscal_period_id <> OLD.fiscal_period_id
     OR NEW.fiscal_year_id   <> OLD.fiscal_year_id
     OR NEW.company_id       <> OLD.company_id
     OR NEW.kind             <> OLD.kind
     OR NEW.serial_no        IS DISTINCT FROM OLD.serial_no
  ) THEN
    RAISE EXCEPTION 'IMMUTABLE_POSTED_JOURNAL: تاریخ/دوره/شماره/نوع سند ثبت‌شده قابل تغییر نیست';
  END IF;

  -- ابطال بدون بازگشت به پیش‌نویس مجاز است، ولی از POSTED به VOID نیاز به دلیل دارد (قید CHECK)
  IF OLD.status::text = 'VOID' AND NEW.status::text <> 'VOID' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: سند ابطال‌شده بازگشت‌پذیر نیست';
  END IF;

  -- قفل دوره: هنگام ثبت یا جابه‌جایی دوره بررسی می‌شود
  IF NEW.status::text = 'POSTED' OR NEW.fiscal_period_id <> OLD.fiscal_period_id THEN
    SELECT fp.status::text INTO v_period_status FROM fiscal_periods fp WHERE fp.id = NEW.fiscal_period_id;
    IF v_period_status = 'LOCKED' THEN
      RAISE EXCEPTION 'PERIOD_LOCKED: دورهٔ مالی بسته است؛ ثبت سند در آن مجاز نیست';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journals_guard ON journals;
CREATE TRIGGER trg_journals_guard
  BEFORE UPDATE OR DELETE ON journals
  FOR EACH ROW EXECUTE FUNCTION fn_journals_guard();

-- ۳.۸ سند جدید: قفل دوره و هم‌خوانی مجموعه با دوره
CREATE OR REPLACE FUNCTION fn_journals_insert_check() RETURNS trigger AS $fn$
DECLARE
  v_period_status text;
  v_period_company uuid;
  v_year_company   uuid;
BEGIN
  SELECT fp.status::text, fp.company_id INTO v_period_status, v_period_company
    FROM fiscal_periods fp WHERE fp.id = NEW.fiscal_period_id;
  SELECT fy.company_id INTO v_year_company
    FROM fiscal_years fy WHERE fy.id = NEW.fiscal_year_id;

  IF v_period_status IS NULL THEN
    RAISE EXCEPTION 'PERIOD_NOT_FOUND: دورهٔ مالی سند وجود ندارد';
  END IF;
  IF v_period_company <> NEW.company_id OR COALESCE(v_year_company, NEW.company_id) <> NEW.company_id THEN
    RAISE EXCEPTION 'COMPANY_MISMATCH: دوره/سال مالی متعلق به این مجموعه نیست';
  END IF;
  IF v_period_status = 'LOCKED' THEN
    RAISE EXCEPTION 'PERIOD_LOCKED: دورهٔ مالی بسته است';
  END IF;
  IF NEW.status::text <> 'DRAFT' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: سند باید با وضعیت پیش‌نویس ساخته و سپس ثبت شود';
  END IF;

  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journals_insert_check ON journals;
CREATE TRIGGER trg_journals_insert_check
  BEFORE INSERT ON journals
  FOR EACH ROW EXECUTE FUNCTION fn_journals_insert_check();

-- ۳.۹ دورهٔ مالی: وقتی دوره قفل شد، دیگر پیش‌نویسی در آن ثبت نشود
CREATE OR REPLACE FUNCTION fn_fiscal_periods_lock_guard() RETURNS trigger AS $fn$
DECLARE v_draft_count bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status::text <> 'LOCKED' AND NEW.status::text = 'LOCKED' THEN
    SELECT count(*) INTO v_draft_count
      FROM journals
     WHERE fiscal_period_id = NEW.id AND status::text = 'DRAFT' AND deleted_at IS NULL;
    IF v_draft_count > 0 THEN
      RAISE EXCEPTION 'PERIOD_HAS_DRAFTS: دوره % سند پیش‌نویس دارد؛ اول آن‌ها را ثبت یا حذف کنید', v_draft_count;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status::text = 'LOCKED' AND NEW.status::text <> 'LOCKED' THEN
    RAISE EXCEPTION 'PERIOD_UNLOCK_FORBIDDEN: بازکردن دورهٔ قفل‌شده فقط با سند اصلاحی سطح OWNER و ثبت در ممیزی مجاز است';
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fiscal_periods_lock_guard ON fiscal_periods;
CREATE TRIGGER trg_fiscal_periods_lock_guard
  BEFORE UPDATE ON fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION fn_fiscal_periods_lock_guard();

-- -----------------------------------------------------------------------------
-- ۴) توابع سرویس — شماره‌گذاری و کدگذاری خودکار، شماره‌گذاری بی‌شکاف و مانده
-- -----------------------------------------------------------------------------

-- تولید کد خودکار سلسله‌مراتبی برای حساب‌ها (گروه/کل/معین/تفصیلی)
CREATE OR REPLACE FUNCTION fn_next_account_code(
  p_company_id uuid,
  p_parent_id uuid,
  p_account_class "AccountClass"
) RETURNS varchar AS $fn$
DECLARE
  v_parent_code varchar;
  v_parent_depth integer;
  v_next_suffix integer;
  v_pad_len integer;
  v_code varchar;
BEGIN
  IF p_parent_id IS NULL THEN
    v_code := CASE p_account_class::text
      WHEN 'ASSET'     THEN '1'
      WHEN 'LIABILITY' THEN '2'
      WHEN 'EQUITY'    THEN '3'
      WHEN 'INCOME'    THEN '4'
      WHEN 'EXPENSE'   THEN '5'
      ELSE '9'
    END;
    IF EXISTS (SELECT 1 FROM accounts WHERE company_id = p_company_id AND parent_id IS NULL AND code = v_code AND deleted_at IS NULL) THEN
      SELECT COALESCE(max(code::integer), v_code::integer) + 1 INTO v_next_suffix
        FROM accounts
       WHERE company_id = p_company_id AND parent_id IS NULL AND code ~ '^[0-9]+$' AND deleted_at IS NULL;
      v_code := v_next_suffix::varchar;
    END IF;
    RETURN v_code;
  END IF;

  SELECT a.code, a.depth INTO v_parent_code, v_parent_depth
    FROM accounts a
   WHERE a.id = p_parent_id AND a.company_id = p_company_id;

  IF v_parent_code IS NULL THEN
    v_parent_code := '101';
    v_parent_depth := 1;
  END IF;

  v_pad_len := CASE WHEN v_parent_depth <= 2 THEN 2 ELSE 3 END;

  SELECT COALESCE(max(substring(a.code from length(v_parent_code) + 1)::integer), 0) + 1
    INTO v_next_suffix
    FROM accounts a
   WHERE a.company_id = p_company_id
     AND a.parent_id = p_parent_id
     AND a.code LIKE v_parent_code || '%'
     AND substring(a.code from length(v_parent_code) + 1) ~ '^[0-9]+$'
     AND a.deleted_at IS NULL;

  RETURN v_parent_code || lpad(v_next_suffix::varchar, v_pad_len, '0');
END;
$fn$ LANGUAGE plpgsql;

-- تولید کد خودکار برای اشخاص و طرف‌حساب‌ها (مثلاً PR-01001 یا CO-01001)
CREATE OR REPLACE FUNCTION fn_next_counterparty_code(
  p_company_id uuid,
  p_type "CounterpartyType"
) RETURNS varchar AS $fn$
DECLARE
  v_prefix varchar;
  v_next_no bigint;
BEGIN
  v_prefix := CASE WHEN p_type::text = 'LEGAL' THEN 'CO-' ELSE 'PR-' END;
  
  SELECT COALESCE(max(substring(c.code from length(v_prefix) + 1)::bigint), 1000) + 1
    INTO v_next_no
    FROM counterparties c
   WHERE c.company_id = p_company_id
     AND c.code LIKE v_prefix || '%'
     AND substring(c.code from length(v_prefix) + 1) ~ '^[0-9]+$'
     AND c.deleted_at IS NULL;

  RETURN v_prefix || lpad(v_next_no::varchar, 5, '0');
END;
$fn$ LANGUAGE plpgsql;

-- شمارهٔ بعدی سند/فاکتور/چک. قفل سطری تا پایان تراکنش نگه داشته می‌شود،
-- پس اگر تراکنش رول‌بک شود شماره هم برمی‌گردد → شمارهٔ شکاف‌دار ایجاد نمی‌شود.
CREATE OR REPLACE FUNCTION fn_next_serial(
  p_company_id uuid,
  p_fiscal_year_id uuid,
  p_kind "SerialKind"
) RETURNS bigint AS $fn$
DECLARE v_no bigint;
BEGIN
  INSERT INTO serial_counters (company_id, fiscal_year_id, kind, last_no)
  VALUES (p_company_id, p_fiscal_year_id, p_kind, 1)
  ON CONFLICT (company_id, fiscal_year_id, kind)
  DO UPDATE SET last_no = serial_counters.last_no + 1
  RETURNING last_no INTO v_no;

  RETURN v_no;
END;
$fn$ LANGUAGE plpgsql;

-- اعمال دلتای مانده روی اسنپ‌شات دوره (اتمیک؛ در همان تراکنشِ ثبت سند صدا زده می‌شود)
CREATE OR REPLACE FUNCTION fn_apply_balance_delta(
  p_company_id uuid,
  p_account_id uuid,
  p_fiscal_period_id uuid,
  p_jalali_year integer,
  p_jalali_month smallint,
  p_debit bigint,
  p_credit bigint
) RETURNS void AS $fn$
BEGIN
  INSERT INTO account_period_balances AS b (
    company_id, account_id, fiscal_period_id, jalali_year, jalali_month,
    opening_debit, opening_credit, period_debit, period_credit, closing_debit, closing_credit
  )
  VALUES (
    p_company_id, p_account_id, p_fiscal_period_id, p_jalali_year, p_jalali_month,
    0, 0, p_debit, p_credit, p_debit, p_credit
  )
  ON CONFLICT (company_id, account_id, fiscal_period_id)
  DO UPDATE SET
    period_debit  = b.period_debit  + EXCLUDED.period_debit,
    period_credit = b.period_credit + EXCLUDED.period_credit,
    closing_debit = b.opening_debit  + (b.period_debit  + EXCLUDED.period_debit),
    closing_credit= b.opening_credit + (b.period_credit + EXCLUDED.period_credit);
END;
$fn$ LANGUAGE plpgsql;

-- بازسازی کامل اسنپ‌شات یک دوره از روی آرتیکل‌ها (منبع حقیقت = آرتیکل‌ها)
-- در زمان بستن دوره و توسط job مغایرت‌گیری شبانه استفاده می‌شود.
CREATE OR REPLACE FUNCTION fn_rebuild_period_balances(
  p_company_id uuid,
  p_fiscal_period_id uuid
) RETURNS bigint AS $fn$
DECLARE v_rows bigint;
BEGIN
  DELETE FROM account_period_balances
   WHERE company_id = p_company_id AND fiscal_period_id = p_fiscal_period_id;

  INSERT INTO account_period_balances (
    company_id, account_id, fiscal_period_id, jalali_year, jalali_month,
    period_debit, period_credit, closing_debit, closing_credit
  )
  SELECT l.company_id, l.account_id, l.fiscal_period_id, l.jalali_year, l.jalali_month::smallint,
         COALESCE(sum(l.amount) FILTER (WHERE l.side::text = 'DEBIT'), 0),
         COALESCE(sum(l.amount) FILTER (WHERE l.side::text = 'CREDIT'), 0),
         COALESCE(sum(l.amount) FILTER (WHERE l.side::text = 'DEBIT'), 0),
         COALESCE(sum(l.amount) FILTER (WHERE l.side::text = 'CREDIT'), 0)
    FROM journal_lines l
    JOIN journals j ON j.id = l.journal_id
   WHERE l.company_id = p_company_id
     AND l.fiscal_period_id = p_fiscal_period_id
     AND j.status::text = 'POSTED'
   GROUP BY l.company_id, l.account_id, l.fiscal_period_id, l.jalali_year, l.jalali_month
  ON CONFLICT (company_id, account_id, fiscal_period_id) DO NOTHING;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$fn$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- ۵) viewها
-- -----------------------------------------------------------------------------

-- نمای «تراکنش ساده» برای UI شخصی: مبدا ← مقصد (+ کارمزد) بدون مواجهه با سند
CREATE OR REPLACE VIEW v_simple_transactions AS
SELECT j.company_id,
       j.id,
       j.date,
       j.jalali_year,
       j.jalali_month,
       j.jalali_day,
       j.kind,
       j.status,
       j.serial_no,
       j.description,
       j.ref_no,
       j.source_type,
       j.source_id,
       j.created_by,
       j.posted_at,
       src.account_id AS source_account_id,
       dst.account_id AS destination_account_id,
       dst.amount     AS amount,
       COALESCE(fee.amount, 0) AS fee
  FROM journals j
  JOIN LATERAL (SELECT l.account_id, l.amount FROM journal_lines l
                 WHERE l.journal_id = j.id AND l.line_role::text = 'SOURCE'
                 ORDER BY l.line_no LIMIT 1) src ON true
  JOIN LATERAL (SELECT l.account_id, l.amount FROM journal_lines l
                 WHERE l.journal_id = j.id AND l.line_role::text = 'DESTINATION'
                 ORDER BY l.line_no LIMIT 1) dst ON true
  LEFT JOIN LATERAL (SELECT l.amount FROM journal_lines l
                 WHERE l.journal_id = j.id AND l.line_role::text = 'FEE'
                 ORDER BY l.line_no LIMIT 1) fee ON true
 WHERE j.kind::text IN ('TRANSACTION', 'RECURRING', 'SMS', 'IMPORT')
   AND j.deleted_at IS NULL;

-- ابزار مغایرت‌گیری: اسنادی که جمع سربرگ با جمع آرتیکل‌ها نمی‌خواند
-- (کمربند و بند؛ تریگرها نباید اجازهٔ وجود چنین رکوردی را بدهند)
CREATE OR REPLACE VIEW v_unbalanced_journals AS
SELECT j.id,
       j.company_id,
       j.serial_no,
       j.status,
       j.total_debit,
       j.total_credit,
       j.line_count,
       COALESCE(x.real_debit, 0)  AS real_debit,
       COALESCE(x.real_credit, 0) AS real_credit,
       COALESCE(x.real_count, 0)  AS real_count
  FROM journals j
  LEFT JOIN LATERAL (
        SELECT sum(l.amount) FILTER (WHERE l.side::text = 'DEBIT')  AS real_debit,
               sum(l.amount) FILTER (WHERE l.side::text = 'CREDIT') AS real_credit,
               count(*)                                            AS real_count
          FROM journal_lines l
         WHERE l.journal_id = j.id) x ON true
 WHERE j.total_debit <> COALESCE(x.real_debit, 0)
    OR j.total_credit <> COALESCE(x.real_credit, 0)
    OR j.line_count   <> COALESCE(x.real_count, 0)
    OR (j.status::text = 'POSTED' AND COALESCE(x.real_debit, 0) <> COALESCE(x.real_credit, 0));

-- گردش یک حساب با ماندهٔ لحظه‌ای (مقیاس‌پذیر: محاسبه در دیتابیس، صفحه‌بندی keyset در لایهٔ API)
CREATE OR REPLACE VIEW v_account_ledger AS
SELECT l.company_id,
       l.account_id,
       j.date,
       j.serial_no,
       j.id AS journal_id,
       l.id AS line_id,
       l.line_no,
       l.side,
       l.amount,
       l.jalali_year,
       l.jalali_month,
       l.jalali_month AS period_month,
       j.description  AS journal_description,
       l.description  AS line_description,
       l.counterparty_id,
       a.account_class,
       CASE WHEN a.account_class::text IN ('ASSET', 'EXPENSE')
            THEN CASE WHEN l.side::text = 'DEBIT' THEN l.amount ELSE -l.amount END
            ELSE CASE WHEN l.side::text = 'CREDIT' THEN l.amount ELSE -l.amount END
       END AS signed_amount,
       sum(CASE WHEN a.account_class::text IN ('ASSET', 'EXPENSE')
                THEN CASE WHEN l.side::text = 'DEBIT' THEN l.amount ELSE -l.amount END
                ELSE CASE WHEN l.side::text = 'CREDIT' THEN l.amount ELSE -l.amount END
           END)
         OVER (PARTITION BY l.company_id, l.account_id
               ORDER BY j.date, j.serial_no, l.line_no
               ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_balance
  FROM journal_lines l
  JOIN journals j ON j.id = l.journal_id
  JOIN accounts a ON a.id = l.account_id
 WHERE j.status::text = 'POSTED';

-- تراز آزمایشی دو ستونی بر پایهٔ اسنپ‌شات دوره‌ها (سریع؛ بدون پیمایش آرتیکل‌ها)
CREATE OR REPLACE VIEW v_trial_balance AS
SELECT b.company_id,
       b.jalali_year,
       b.account_id,
       a.name          AS account_name,
       a.code          AS account_code,
       a.account_class,
       a.depth,
       sum(b.period_debit)  AS period_debit,
       sum(b.period_credit) AS period_credit,
       sum(b.closing_debit) AS closing_debit,
       sum(b.closing_credit) AS closing_credit
  FROM account_period_balances b
  JOIN accounts a ON a.id = b.account_id
 GROUP BY b.company_id, b.jalali_year, b.account_id, a.name, a.code, a.account_class, a.depth;

-- -----------------------------------------------------------------------------
-- ۶) یادداشت‌های اجرایی
-- -----------------------------------------------------------------------------
-- • RLS (امنیت چندمجموعه‌ای در سطح دیتابیس) عمداً در این مهاجرت فعال **نشده**؛
--   طبق DATA_MODEL بند ۸ در فاز ۳ و با مهاجرت جداگانه اضافه می‌شود.
-- • job مغایرت‌گیری شبانه باید این دو پرس‌وجو را اجرا و نتیجه را در audit_logs
--   با action='RECONCILE_MISMATCH' ثبت کند:
--     SELECT count(*) FROM v_unbalanced_journals;
--     SELECT count(*) FROM account_period_balances b WHERE NOT EXISTS (...)
-- • این فایل **idempotent نیست** (ADD CONSTRAINT تکراری خطا می‌دهد)؛ فقط یک‌بار
--   و به‌ترتیب پس از مهاجرت Prisma اجرا شود. جزئیات در db/README.md.
