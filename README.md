# Charlie’s Chairs website

Upholstery, restoration, custom builds and fabric sales: Charles Parks, Grand Rapids, MI.
Plain HTML/CSS/JavaScript (no build step) on GitHub Pages, with Supabase for the database, private photo storage and the admin login.
Website by SAP Development Solutions, LLC.

## What’s built and tested

| Area | Status |
| --- | --- |
| Brand: chair-and-brass-tack mark, black/espresso/gold with cream reading sections, link preview image, icons | Built |
| Pages: Home, Our Work, Services, Shop, Fabrics, YouTube, About, FAQ & Process, Contact, Request a Quote, Policies, Admin, 404 | Built and tested |
| **Photo-first quote form**: up to 10 photos from phone camera or library, previews, remove, per-photo upload status, retry without re-uploading, reference number only after the request is saved | Built and tested |
| **Customer photos are private**: visitors can only add photos to a random folder; nobody but admins can list or open them (1-hour links) | Built and tested |
| Spam protection: hidden trap field, 5 requests per email per day, 60 per hour site-wide, server-side validation | Built and tested |
| **Admin** (`admin.html`): requests with photos, status, private notes, email/call/text buttons, CSV export; Our Work (before/after), Shop (draft/available/reserved/sold), Fabrics, YouTube videos, FAQ, Settings (contact, hours, address, YouTube channel, policies); audit log | Built and tested |
| Shop + fabrics: search and filters, detail view with photo gallery and full-screen viewer, “Ask about this piece”, “Request this fabric”, “Request a swatch” | Built and tested |
| Online checkout | **Not enabled on purpose.** Purchases and fabric orders go through an inquiry. Stripe or Square can be added later without rebuilding the catalog. |
| Email alerts for new requests | **Not set up yet.** Charles checks the Admin page (new requests show a red count). See “Later”. |
| Tests | 13 database tests + 156 browser checks (phone to desktop, keyboard, WCAG 2.2 AA scan, privacy and admin lockout) all pass |

Nothing is made up: no reviews, prices, inventory, hours, timelines, delivery promises or videos. Empty sections show a tidy “coming soon” until Charles adds real content in the Admin page.

## Put it online

### 1. Supabase (database + photo storage), about 15 minutes
Use **Charles’s own free Supabase account** (sign up at supabase.com with the business email) so the customer data belongs to the business.
1. Create a new project named `charlies-chairs`. Save the database password somewhere safe.
2. **SQL Editor → New query** → paste ALL of `supabase/migrations/0001_charlies_chairs.sql` → **Run**. (It also creates the two photo storage buckets.)
3. **Authentication → Sign In / Providers**: turn **Allow new users to sign up** OFF. Only Charles needs a login.
4. **Authentication → URL Configuration**: Site URL `https://junearness.github.io/charlies-chairs/admin.html`; add the same address under Redirect URLs.
5. **Authentication → Users → Add user**: Charles’s email and a strong password; tick **Auto Confirm User**.
6. **SQL Editor**: run `supabase/make-me-admin.sql` (with that email).
7. **Project Settings → API Keys**: copy the **Project URL** and the **publishable** key into `data.js` (`supabaseUrl`, `supabaseKey`). Never use the secret / service_role key.

### 2. GitHub Pages
1. Create a public repository named exactly `charlies-chairs`.
2. **Add file → Upload files**, select everything in this folder (Ctrl+A), drag in, **Commit changes**. There are no hidden files to worry about.
3. **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. Open `https://junearness.github.io/charlies-chairs/` and press Ctrl+Shift+R.

If the repository name is different, page addresses in the link previews and sitemap need updating (`SITE` in the page generator).

## Confirm with Charles before launch

- **Business name**: the cards say **Charlie’s Chairs**; the brief said “Charles’s Chairs.” The site uses the card. Confirm.
- **Address**: card says `436 Northpark NE, Grand Rapids, MI 49525`. A public listing shows “Brass Tack House of Upholstery” at `436 N Park St NE`. Until Charles confirms, the site shows the card wording with “Please call or email before visiting” and **no map**. Tick “Address confirmed” in Admin → Settings to show the map link.
- **“Brasstack”** on the card: what it means and whether to feature brass-tack / nailhead trim as a service. Not featured yet.
- Hours, service area, pickup/delivery, payment methods, returns (Admin → Settings).
- The YouTube channel link and videos (Admin → Settings and Videos).
- Real photos of finished work for Our Work, pieces for sale and fabrics. The chairs on the business cards are illustrations, not his work, so they aren’t used as project photos.
- Have the privacy notice and policies reviewed.

## Later

- **New-request email alerts**: a Supabase Database Webhook or Edge Function that emails Charles when a request arrives (needs an email sender such as Resend).
- **Online checkout** for pieces/fabric with Stripe or Square, once prices, tax, pickup/shipping and returns are decided.
- **Free plan pauses** a project after about a week without activity (as far as I know). A paused project can’t receive quote requests (the form then tells visitors to call or text Charles). Visit the Admin page weekly, or upgrade to Pro (about $25/month, estimate).

## Files

| File | Purpose |
| --- | --- |
| `data.js` | Supabase connection + fallback contact details + quote-form choices |
| `*.html` | Pages |
| `style.css` | Design (colors at the top) |
| `api.js` | Talks to Supabase |
| `site.js` | Fills public pages (shop, fabrics, work, videos, FAQ, contact) |
| `quote.js` | Quote form + photo uploads |
| `admin.js` | Admin dashboard |
| `supabase.js` | Official Supabase client (bundled) |
| `supabase/migrations/0001_charlies_chairs.sql` | Database, storage buckets and security rules |
| `supabase/make-me-admin.sql` | Gives Charles’s login admin access |
| `mark.svg`, `mark-dark.svg`, `favicon.svg`, `apple-touch-icon.png`, `og-image.jpg` | Brand files |
| `sitemap.xml`, `robots.txt` | Search engines |
