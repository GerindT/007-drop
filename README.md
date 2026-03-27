# 007-Drop

Secure, self-destructing file sharing built with Nuxt and Supabase.

`007-Drop` encrypts files in the browser before upload, shares the decryption key in the URL fragment (`#...`), and removes files after limits are reached or expiration time passes.

## Features

- Client-side AES-256-GCM encryption via Web Crypto API
- Optional password protection (PBKDF2-derived key combined with URL key)
- One-time, fixed-count, or unlimited downloads
- Automatic expiry (24 hours)
- Optional encrypted image preview thumbnails
- Discord/Slack-style webhook notifications on download
- Local "recent uploads" dashboard with delete support
- QR code generation for quick sharing

## Tech Stack

- `Nuxt 4` + `Vue 3`
- `@nuxtjs/supabase`
- `Supabase Storage` + `Supabase Postgres`
- `JSZip` for multi-file uploads
- `qrcode` for share QR generation
- `@vueuse/core` for clipboard/local storage utilities

## How It Works

1. File is encrypted in the browser.
2. Encrypted bytes are uploaded to Supabase Storage.
3. Metadata is stored in the `files` table.
4. Share link format: `/d/<id>#<key>`
5. Receiver downloads encrypted bytes and decrypts in browser.
6. File is cleaned up after expiration or download limit.

## Local Development

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the following values:

```env
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
CRON_SECRET=your-random-cleanup-secret
```

### 3) Create Supabase resources

Create a storage bucket named `drops`.

Create a table named `files`:

```sql
create table if not exists public.files (
  id uuid primary key,
  original_name text not null,
  storage_path text not null unique,
  file_size bigint not null,
  mime_type text not null,
  download_limit integer not null default 1, -- 0 = unlimited
  download_count integer not null default 0,
  expires_at timestamptz not null,
  is_password_protected boolean not null default false,
  password_salt text,
  has_preview boolean not null default false,
  delete_token uuid not null,
  webhook_url text,
  created_at timestamptz not null default now()
);

create index if not exists files_expires_at_idx on public.files (expires_at);
```

### 4) Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Cleanup Cron Endpoint

The endpoint `GET /api/cron/cleanup` deletes expired files and records.

Authenticate using either:

- `Authorization: Bearer <CRON_SECRET>`
- or query param `?key=<CRON_SECRET>`

Example:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/cleanup
```

Schedule this endpoint with your preferred cron service.

## API Routes (Server)

- `POST /api/upload` - upload encrypted file + metadata
- `GET /api/file/:id` - fetch file metadata and availability
- `GET /api/download/:id` - increment count + return signed download URL
- `GET /api/preview/:id` - return encrypted thumbnail bytes (if available)
- `DELETE /api/file/:id` - delete a file (requires `x-delete-token`)
- `GET /api/cron/cleanup` - cleanup expired/consumed files

## Security Notes

- Encryption and decryption happen client-side.
- Decryption key is stored in URL fragment, not sent to server.
- Optional password adds a second key factor.
- Service role key must never be exposed to the client.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run generate` - static generation

## Deployment

Deploy as a Nuxt/Nitro app (Node adapter or compatible hosting), configure env vars, and schedule `GET /api/cron/cleanup`.