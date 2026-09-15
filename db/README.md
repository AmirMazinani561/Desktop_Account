# `db/` — لایهٔ دادهٔ موتور مالی (فاز ۰)

مبنای این پوشه: **`DATA_MODEL.md` نسخه ۰.۴** (تأییدشدهٔ کارفرما) و **`PRD.md` نسخه ۰.۵**.

> ⚠️ این پوشه فعلاً **قابل‌حمل (portable)** است: تا وقتی «استراتژی کد» (ردیف ۵ جدول تصمیم‌های PRD)
> قطعی شود، همین‌جا می‌ماند و بعد از تصمیم، عیناً به ریشهٔ اپلیکیشن منتقل می‌شود
> (`db/prisma/` ← `prisma/` و `db/sql/` ← `prisma/sql/` یا `db/migrations/`).

## ساختار

```
db/
├── prisma/
│   └── schema.prisma                         # ۲۰ مدل + ۲۹ enum (فاز ۰ + موتور مالی + کدگذاری خودکار)
├── sql/
│   └── 0001_core_constraints_and_triggers.sql # CHECKها، یونیک‌های partial، تریگرها، توابع کدگذاری خودکار، viewها
├── seed/
│   └── system_accounts.sql                   # درخت کدینگ استاندارد ایران و حساب‌های سیستمی پیش‌فرض
└── README.md                                 # همین فایل
```

## تقسیم مسئولیت (مهم)

| مسئولیت | کجا | چرا |
|---|---|---|
| جدول‌ها، ستون‌ها، انواع، کلیدهای خارجی، ایندکس‌های ساده، یونیک کامل | `schema.prisma` | Prisma این‌ها را تولید و نسخه‌بندی می‌کند |
| قیدهای `CHECK` شرطی و چندستونی | `sql/0001_...` | Prisma از `CHECK` پشتیبانی نمی‌کند |
| ایندکس یونیک **partial** (`WHERE ...`) و **functional** (`lower(name)`, `COALESCE(...)`) | `sql/0001_...` | در Prisma بیان‌شدنی نیست |
| تریگرها (تضمین تراز، تغییرناپذیری سند، قفل دوره، درخت حساب، کدگذاری خودکار، `email_lower`) | `sql/0001_...` | منطق سطح دیتابیس؛ PRD آن را **اجباری** می‌داند |
| توابع سرویس (`fn_next_account_code`, `fn_next_counterparty_code`, `fn_next_serial`, `fn_apply_balance_delta`, `fn_rebuild_period_balances`) | `sql/0001_...` | باید اتمیک و داخل همان تراکنش دیتابیس اجرا شوند |
| درخت کدینگ و حساب‌های سیستمی پیش‌فرض (`fn_seed_company_chart_of_accounts`) | `seed/system_accounts.sql` | راه‌اندازی سریع هر مجموعهٔ جدید |
| viewها (`v_simple_transactions`, `v_account_ledger`, `v_trial_balance`, `v_unbalanced_journals`) | `sql/0001_...` | Prisma view را به‌عنوان مدل نمی‌شناسد |
| RLS (امنیت چندمجموعه‌ای) | **فاز ۳** (مهاجرت جدا) | طبق `DATA_MODEL.md` بند ۸ |

## ترتیب اجرا (اولین بار)

```bash
npm install ; npx prisma migrate dev --name phase0_init ; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/sql/0001_core_constraints_and_triggers.sql ; psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed/system_accounts.sql ; npx prisma db pull --print | head -40
```

نکته‌ها:
1. `ON_ERROR_STOP=1` **الزامی** است؛ بدون آن خطای یک قید می‌تواند بی‌صدا رد شود.
2. فایل‌های SQL عمداً **idempotent نیستند** (`ADD CONSTRAINT` تکراری خطا می‌دهد) تا «نیمه‌اجرا شده» نمانند.
3. پس از اجرا، `prisma db pull --print` را با `schema.prisma` مقایسه کنید؛ تفاوت‌های معنادار = نشانهٔ drift.
4. در CI این مراحل روی Postgres واقعی اجرا می‌شوند و سپس **تست‌های طلایی** موتور مالی پاس می‌شوند.

## قراردادهایی که در کد باید رعایت شوند

1. **ثبت سند همیشه در یک تراکنش:** ساخت `DRAFT` ← افزودن آرتیکل‌ها ← گرفتن شماره با `fn_next_serial` ← `UPDATE status='POSTED'`.
   اگر هر قدم شکست، کل تراکنش رول‌بک می‌شود (و شماره هم برمی‌گردد → بی‌شکاف).
2. **`total_debit`/`total_credit`/`line_count` را دستی ننویسید** — تریگر `trg_journal_lines_recompute` آن‌ها را نگه می‌دارد.
3. **سند ثبت‌شده را UPDATE نکنید** — تریگر رد می‌کند. اصلاح = سند معکوس (`reverse_of_journal_id`) + سند جدید.
4. **`accounts.path`، `depth` و `code` خودکار پر می‌شوند** — تریگر `trg_accounts_tree` و تابع `fn_next_account_code` مسیر و کد را می‌سازند.
5. **`counterparties.code` خودکار پر می‌شود** — تریگر `trg_counterparties_auto_code` با پیشوند `PR-` و `CO-` کد می‌دهد.
6. **`email_lower` را دستی ننویسید** — تریگر `trg_users_email_lower` از `email` مشتق می‌کند.
7. **`app.company_id` را در هر تراکنش دیتابیس ست کنید** (`SET LOCAL app.company_id = ...`)؛
   از فاز ۳ که RLS فعال شود، این تنها لایهٔ تفکیک دادهٔ مجموعه‌ها در سطح دیتابیس است.
8. **مبالغ فقط `BigInt` و فقط مثبت**؛ علامت از `side` و طبیعت حساب مشتق می‌شود.
9. **تاریخ شمسی:** `date` میلادیِ مدنی منبع حقیقت است و `jalali_*` با ماژول قطعی مشترک (`lib/jalali.ts`) پر می‌شود.

## وضعیت اعتبارسنجی در محیط فعلی

| بررسی | ابزار | نتیجه |
|---|---|---|
| ساختار `schema.prisma` (سازگاری دوطرفهٔ روابط، وجود ستون‌های ایندکس/یونیک، تعریف همهٔ enumها، غیرoptional بودن کلید اصلی) | پارسر `@mrleebo/prisma-ast` | ✅ پاس (۲۰ مدل، ۲۹ enum) |
| نحوِ کل فایل SQL تریگرها و قیدها | **پارسر واقعی PostgreSQL** (`libpg-query` نسخه ۱۷) | ✅ پاس (۶۳ جمله: ۱۵ تابع، ۱۱ `ALTER TABLE`، ۱۰ ایندکس، ۱۱ تریگر، ۴ view، ۲ بلوک `DO`) |
| نحوِ اسکریپت Seed حساب‌های سیستمی | **پارسر واقعی PostgreSQL** (`libpg-query` نسخه ۱۷) | ✅ پاس (`fn_seed_company_chart_of_accounts`) |
| ماژول تقویم شمسی (`lib/jalali.ts`) | تست تبدیل تاریخ امروز ۱۴۰۵/۰۶/۲۳، سال‌های کبیسه، نرمال‌سازی حروف ی/ک فارسی و فرمت‌دهی ارقام | ✅ ۱۰۰٪ پاس |
| تست‌های طلایی سناریوهای مالی (`tests/financial_engine_scenarios.ts`) | تست سناریوهای ۱۰.۱، ۱۰.۲، کدگذاری خودکار و تست‌های منفی سند ناتراز | ✅ ۱۰۰٪ پاس |
| اجرای واقعی تریگرها روی Postgres | — | ❌ در این سندباکس ممکن نیست (Postgres/Docker و `binaries.prisma.sh` در دسترس نیستند) → **باید در CI اجرا شود** |
