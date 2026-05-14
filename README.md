# BuiltBetter Lead Tracker

Local-first lead tracking app for BuiltBetter, designed for manual prospecting, public URL enrichment, follow-up tracking, CSV workflows, and outreach draft generation.

## What It Does

- Track small business leads locally in SQLite.
- Add, edit, delete, search, filter, and sort leads.
- Paste public links and autofill lead details when they can be found confidently.
- Track contacted state and follow-up dates.
- View overdue, today, this week, upcoming, and unscheduled follow-ups.
- Export leads to CSV with Google Sheets-friendly headers.
- Import leads from CSV with preview and duplicate skipping.
- Generate editable cold email, cold call, and follow-up drafts.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite
- Prisma 6
- Cheerio for public HTML parsing
- PapaParse for CSV import/export
- Zod for validation
- date-fns for dates
- lucide-react for icons

## Install

```powershell
npm install
```

Prisma should stay on version 6 for this project.

## Run Locally

```powershell
npm run dev
```

Then open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

## Prisma Migrations

Generate Prisma Client:

```powershell
npx prisma generate
```

Create/apply a migration after schema changes:

```powershell
npx prisma migrate dev --name migration-name
```

## Reset The Database

This app uses SQLite at `prisma/dev.db`.

To reset during development:

```powershell
npx prisma migrate reset
```

That deletes local data and reapplies migrations.

## Lead Enrichment / Autofill

On the Add Lead page:

1. Paste one or more public URLs into Source Links.
2. Click Autofill.
3. Review the detected values and confidence notes.
4. Edit anything before saving.

Autofill uses public page data only:

- HTML title
- Meta description
- Open Graph tags
- JSON-LD schema.org data
- Visible text
- Public links
- `mailto:` links
- `tel:` links

It does not log in, bypass bot protections, scrape private data, or invent missing fields. If a phone, email, city, or website is not confidently found, it is left blank or marked as `not found`.

## Enrichment Limitations

Some platforms limit public HTML heavily:

- Instagram often exposes very little public data. Add a Google Maps, Yelp, Facebook, or website link to improve autofill.
- Facebook may block or hide public details.
- Google Maps and Apple Maps often require JavaScript and may not expose full HTML details.
- Yelp may expose some public business metadata, but not always.
- DoorDash pages may expose restaurant names and descriptions but not full contact data.
- Wix, Square, and GoDaddy sites vary depending on how the business configured them.

The app prefers official business website data over third-party directory data.

## CSV Export

Use the Export button on the dashboard.

Exported headers are Google Sheets-friendly:

```text
Business,Niche,City,Website,Email,Phone Number,Issue Found,Priority,Contacted?,Follow-up Date,Google Maps?,Source Links,Notes,Status,Created At,Updated At
```

Phone numbers export as text-safe values such as:

```text
="(203) 923-4280"
```

This prevents Google Sheets from converting phone numbers into scientific notation.

## CSV Import

Use the Import button on the dashboard.

The importer accepts both readable headers and internal camelCase headers, including:

- `Phone Number` or `phoneNumber`
- `Issue Found` or `issueFound`
- `Follow-up Date` or `followUpDate`
- `Google Maps?` or `googleMaps`
- `Source Links` or `sourceLinks`

Rows preview before saving. Duplicates are skipped when an existing lead has the same business name plus phone number or website.

## Outreach Drafts

Open any lead detail page to generate:

- Cold email draft
- Cold call script
- Follow-up message

Drafts are editable before sending. They use the lead's business, niche, website, issue found, priority, notes, and source links. The tone is short, calm, conversational, and low-pressure.

The cold email signoff is:

```text
Best,
Sami

BuiltBetter
```

## Follow-Up Workflow

From the dashboard, lead detail page, or Follow-Ups page, you can:

- Mark contacted
- Mark not contacted
- Follow up tomorrow
- Follow up in 3 days
- Follow up in 7 days
- Clear follow-up

The Follow-Ups page includes:

- Needs Follow-Up Date
- Overdue
- Due Today
- Due This Week
- Upcoming

## Troubleshooting

### `npm run dev` fails

Try:

```powershell
npm install
npm run dev
```

If the error mentions a missing Prisma client:

```powershell
npx prisma generate
```

### Prisma errors

If Prisma says the client is missing or out of date:

```powershell
npx prisma generate
```

If the database does not match the schema:

```powershell
npx prisma migrate dev
```

### Database reset

For a clean local database:

```powershell
npx prisma migrate reset
```

### Enrichment returns `not found`

That usually means the public page did not expose enough HTML data, blocked the request, required JavaScript, or required login. Add another public source link such as the business website, Google Maps, Yelp, or Facebook page.

### Port already in use

Run Next.js on another port:

```powershell
npm run dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```
