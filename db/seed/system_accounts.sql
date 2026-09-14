-- =============================================================================
--  system_accounts.sql — ساختار استاندارد کدینگ و حساب‌های سیستمی پیش‌فرض
--  سند بالادستی: DATA_MODEL.md نسخه ۰.۴ • PRD.md نسخه ۰.۵
-- =============================================================================
--  این فایل تابع `fn_seed_company_chart_of_accounts` را تعریف می‌کند که هنگام
--  ساخت هر مجموعهٔ جدید (Company) فراخوانی می‌شود تا درخت کدینگ استاندارد
--  (گروه، کل، معین و تفصیلی‌های پایه) را خودکار ایجاد کند.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_seed_company_chart_of_accounts(
  p_company_id uuid,
  p_user_id uuid
) RETURNS void AS $fn$
DECLARE
  -- شناسه‌های ریشه (گروه‌ها)
  v_g_asset     uuid := gen_random_uuid();
  v_g_liab      uuid := gen_random_uuid();
  v_g_equity    uuid := gen_random_uuid();
  v_g_income    uuid := gen_random_uuid();
  v_g_expense   uuid := gen_random_uuid();

  -- شناسه‌های سطح کل
  v_k_cash_bank uuid := gen_random_uuid();
  v_k_receiv    uuid := gen_random_uuid();
  v_k_inv       uuid := gen_random_uuid();
  v_k_pay       uuid := gen_random_uuid();
  v_k_other_pay uuid := gen_random_uuid();
  v_k_cap       uuid := gen_random_uuid();
  v_k_re        uuid := gen_random_uuid();
  v_k_op_inc    uuid := gen_random_uuid();
  v_k_oth_inc   uuid := gen_random_uuid();
  v_k_gen_exp   uuid := gen_random_uuid();
  v_k_cogs      uuid := gen_random_uuid();

  -- شناسه‌های سطح معین
  v_m_cash      uuid := gen_random_uuid();
  v_m_bank      uuid := gen_random_uuid();
  v_m_petty     uuid := gen_random_uuid();
  v_m_debtors   uuid := gen_random_uuid();
  v_m_chq_recv  uuid := gen_random_uuid();
  v_m_chq_dep   uuid := gen_random_uuid();
  v_m_creditors uuid := gen_random_uuid();
  v_m_chq_pay   uuid := gen_random_uuid();
  v_m_vat_pay   uuid := gen_random_uuid();
  v_m_loans     uuid := gen_random_uuid();
  v_m_cogs      uuid := gen_random_uuid();
BEGIN
  -- اگر قبلاً برای این مجموعه حساب سیستمی ساخته شده، خروج
  IF EXISTS (SELECT 1 FROM accounts WHERE company_id = p_company_id AND is_system = true) THEN
    RETURN;
  END IF;

  -- ---------------------------------------------------------------------------
  -- ۱) گروه ۱: دارایی‌ها
  -- ---------------------------------------------------------------------------
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_g_asset, p_company_id, NULL, '1', 1, 'ASSET', 'OTHER', false, 'دارایی‌ها', true, true, p_user_id, '/' || v_g_asset::text || '/', 1);

  -- کل: موجودی نقد و بانک
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_cash_bank, p_company_id, v_g_asset, '101', 2, 'ASSET', 'OTHER', false, 'موجودی نقد و بانک', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_cash_bank::text || '/', 2);

  -- معین: صندوق‌ها
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_cash, p_company_id, v_k_cash_bank, '10101', 3, 'ASSET', 'CASH', false, 'صندوق‌ها', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_cash_bank::text || '/' || v_m_cash::text || '/', 3);

  -- تفصیلی: صندوق اصلی
  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_favorite, is_active, created_by, icon, color)
  VALUES (p_company_id, v_m_cash, '10101001', 4, 'ASSET', 'CASH', true, 'صندوق اصلی', true, true, true, p_user_id, 'wallet', '#10B981');

  -- معین: بانک‌ها
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_bank, p_company_id, v_k_cash_bank, '10102', 3, 'ASSET', 'BANK', false, 'بانک‌ها', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_cash_bank::text || '/' || v_m_bank::text || '/', 3);

  -- تفصیلی: بانک پیش‌فرض
  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_favorite, is_active, created_by, icon, color)
  VALUES (p_company_id, v_m_bank, '10102001', 4, 'ASSET', 'BANK', true, 'بانک پیش‌فرض', true, true, true, p_user_id, 'building-2', '#3B82F6');

  -- کل: حساب‌ها و اسناد دریافتنی
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_receiv, p_company_id, v_g_asset, '102', 2, 'ASSET', 'PERSON', false, 'حساب‌ها و اسناد دریافتنی', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_receiv::text || '/', 2);

  -- معین: بدهکاران تجاری (اشخاص)
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_debtors, p_company_id, v_k_receiv, '10201', 3, 'ASSET', 'PERSON', false, 'بدهکاران تجاری (اشخاص)', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_receiv::text || '/' || v_m_debtors::text || '/', 3);

  -- معین: اسناد دریافتنی نزد صندوق (چک‌های دریافتنی)
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_chq_recv, p_company_id, v_k_receiv, '10202', 3, 'ASSET', 'CONTROL', true, 'اسناد دریافتنی نزد صندوق', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_receiv::text || '/' || v_m_chq_recv::text || '/', 3);

  -- معین: اسناد دریافتنی در جریان وصول
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_chq_dep, p_company_id, v_k_receiv, '10203', 3, 'ASSET', 'CONTROL', true, 'اسناد دریافتنی در جریان وصول', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_receiv::text || '/' || v_m_chq_dep::text || '/', 3);

  -- کل: موجودی کالا و مواد
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_inv, p_company_id, v_g_asset, '103', 2, 'ASSET', 'CONTROL', false, 'موجودی مواد و کالا', true, true, p_user_id, '/' || v_g_asset::text || '/' || v_k_inv::text || '/', 2);

  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by)
  VALUES (p_company_id, v_k_inv, '10301', 3, 'ASSET', 'CONTROL', true, 'انبار کالا', true, true, p_user_id),
         (p_company_id, v_k_inv, '10302', 3, 'ASSET', 'CONTROL', true, 'انبار مواد اولیه', true, true, p_user_id),
         (p_company_id, v_k_inv, '10303', 3, 'ASSET', 'CONTROL', true, 'کالای در جریان ساخت', true, true, p_user_id);

  -- ---------------------------------------------------------------------------
  -- ۲) گروه ۲: بدهی‌ها
  -- ---------------------------------------------------------------------------
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_g_liab, p_company_id, NULL, '2', 1, 'LIABILITY', 'OTHER', false, 'بدهی‌ها', true, true, p_user_id, '/' || v_g_liab::text || '/', 1);

  -- کل: حساب‌ها و اسناد پرداختنی تجاری
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_pay, p_company_id, v_g_liab, '201', 2, 'LIABILITY', 'PERSON', false, 'حساب‌ها و اسناد پرداختنی تجاری', true, true, p_user_id, '/' || v_g_liab::text || '/' || v_k_pay::text || '/', 2);

  -- معین: بستانکاران تجاری (اشخاص)
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_creditors, p_company_id, v_k_pay, '20101', 3, 'LIABILITY', 'PERSON', false, 'بستانکاران تجاری (اشخاص)', true, true, p_user_id, '/' || v_g_liab::text || '/' || v_k_pay::text || '/' || v_m_creditors::text || '/', 3);

  -- معین: اسناد پرداختنی (چک‌های صادره)
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_m_chq_pay, p_company_id, v_k_pay, '20102', 3, 'LIABILITY', 'CONTROL', true, 'اسناد پرداختنی (چک‌ها)', true, true, p_user_id, '/' || v_g_liab::text || '/' || v_k_pay::text || '/' || v_m_chq_pay::text || '/', 3);

  -- کل: سایر حساب‌های پرداختنی
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_other_pay, p_company_id, v_g_liab, '202', 2, 'LIABILITY', 'OTHER', false, 'سایر پرداختنی‌ها و تسهیلات', true, true, p_user_id, '/' || v_g_liab::text || '/' || v_k_other_pay::text || '/', 2);

  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by)
  VALUES (p_company_id, v_k_other_pay, '20201', 3, 'LIABILITY', 'CONTROL', true, 'مالیات بر ارزش افزوده پرداختنی', true, true, p_user_id),
         (p_company_id, v_k_other_pay, '20202', 3, 'LIABILITY', 'CONTROL', true, 'تسهیلات و وام‌های مالی دریافتنی', true, true, p_user_id);

  -- ---------------------------------------------------------------------------
  -- ۳) گروه ۳: حقوق صاحبان سرمایه
  -- ---------------------------------------------------------------------------
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_g_equity, p_company_id, NULL, '3', 1, 'EQUITY', 'OTHER', false, 'حقوق صاحبان سهام و سرمایه', true, true, p_user_id, '/' || v_g_equity::text || '/', 1);

  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_cap, p_company_id, v_g_equity, '301', 2, 'EQUITY', 'OTHER', true, 'سرمایه اولیه', true, true, p_user_id, '/' || v_g_equity::text || '/' || v_k_cap::text || '/', 2);

  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_re, p_company_id, v_g_equity, '302', 2, 'EQUITY', 'OTHER', false, 'سود و زیان', true, true, p_user_id, '/' || v_g_equity::text || '/' || v_k_re::text || '/', 2);

  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by)
  VALUES (p_company_id, v_k_re, '30201', 3, 'EQUITY', 'CONTROL', true, 'سود و زیان انباشته', true, true, p_user_id),
         (p_company_id, v_k_re, '30202', 3, 'EQUITY', 'CONTROL', true, 'خلاصه سود و زیان (بستن سال مالی)', true, true, p_user_id);

  -- ---------------------------------------------------------------------------
  -- ۴) گروه ۴: درآمدها
  -- ---------------------------------------------------------------------------
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_g_income, p_company_id, NULL, '4', 1, 'INCOME', 'OTHER', false, 'درآمدها', true, true, p_user_id, '/' || v_g_income::text || '/', 1);

  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_op_inc, p_company_id, v_g_income, '401', 2, 'INCOME', 'INCOME_HEADING', false, 'درآمدهای عملیاتی و کسب درآمد', true, true, p_user_id, '/' || v_g_income::text || '/' || v_k_op_inc::text || '/', 2);

  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, icon, color)
  VALUES (p_company_id, v_k_op_inc, '40101', 3, 'INCOME', 'INCOME_HEADING', true, 'حقوق و دستمزد', false, true, p_user_id, 'briefcase', '#10B981'),
         (p_company_id, v_k_op_inc, '40102', 3, 'INCOME', 'INCOME_HEADING', true, 'پروژه و فریلنسری', false, true, p_user_id, 'laptop', '#3B82F6'),
         (p_company_id, v_k_op_inc, '40103', 3, 'INCOME', 'INCOME_HEADING', true, 'فروش کالا و خدمات', true, true, p_user_id, 'shopping-bag', '#8B5CF6');

  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_oth_inc, p_company_id, v_g_income, '402', 2, 'INCOME', 'INCOME_HEADING', true, 'سایر درآمدها و سود سپرده', true, true, p_user_id, '/' || v_g_income::text || '/' || v_k_oth_inc::text || '/', 2);

  -- ---------------------------------------------------------------------------
  -- ۵) گروه ۵: هزینه‌ها
  -- ---------------------------------------------------------------------------
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_g_expense, p_company_id, NULL, '5', 1, 'EXPENSE', 'OTHER', false, 'هزینه‌ها', true, true, p_user_id, '/' || v_g_expense::text || '/', 1);

  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_gen_exp, p_company_id, v_g_expense, '501', 2, 'EXPENSE', 'EXPENSE_HEADING', false, 'هزینه‌های عمومی، اداری و زندگی', true, true, p_user_id, '/' || v_g_expense::text || '/' || v_k_gen_exp::text || '/', 2);

  INSERT INTO accounts (company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, icon, color)
  VALUES (p_company_id, v_k_gen_exp, '50101', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'خوراک و اقلام روزمره', false, true, p_user_id, 'utensils', '#EF4444'),
         (p_company_id, v_k_gen_exp, '50102', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'مسکن، اجاره و شارژ', false, true, p_user_id, 'home', '#F59E0B'),
         (p_company_id, v_k_gen_exp, '50103', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'حمل و نقل و سوخت', false, true, p_user_id, 'car', '#6366F1'),
         (p_company_id, v_k_gen_exp, '50104', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'بهداشت و درمان', false, true, p_user_id, 'heart-pulse', '#EC4899'),
         (p_company_id, v_k_gen_exp, '50105', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'آموزش و تفریح', false, true, p_user_id, 'book-open', '#14B8A6'),
         (p_company_id, v_k_gen_exp, '50106', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'قبوض (آب، برق، گاز، اینترنت)', false, true, p_user_id, 'zap', '#84CC16'),
         (p_company_id, v_k_gen_exp, '50107', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'سود و کارمزد تسهیلات و وام‌ها', true, true, p_user_id, 'percent', '#F97316'),
         (p_company_id, v_k_gen_exp, '50108', 3, 'EXPENSE', 'EXPENSE_HEADING', true, 'هزینه کارمزد بانکی', true, true, p_user_id, 'credit-card', '#64748B');

  -- کل: بهای تمام‌شده کالای فروش‌رفته (COGS)
  INSERT INTO accounts (id, company_id, parent_id, code, coding_level, account_class, account_kind, is_postable, name, is_system, is_active, created_by, path, depth)
  VALUES (v_k_cogs, p_company_id, v_g_expense, '502', 2, 'EXPENSE', 'CONTROL', true, 'بهای تمام‌شده کالای فروش‌رفته (COGS)', true, true, p_user_id, '/' || v_g_expense::text || '/' || v_k_cogs::text || '/', 2);

END;
$fn$ LANGUAGE plpgsql;
