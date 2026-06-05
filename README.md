<img width="2497" height="1247" alt="image" src="https://github.com/user-attachments/assets/8900b0b4-4eca-4798-84c8-3116dbef2c6c" />


<h1 align="center">KoperasiSP</h1>

<p align="center">
  <strong>Modern cooperative savings and loan management dashboard for members, savings, loans, installments, reports, and role-based operations.</strong>
</p>

<p align="center">
  <img alt="Status" src="https://img.shields.io/badge/status-active-10B981?style=for-the-badge" />
  <img alt="React" src="https://img.shields.io/badge/React_19-101828?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img alt="Laravel" src="https://img.shields.io/badge/Laravel_13-101828?style=for-the-badge&logo=laravel&logoColor=FF2D20" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase_SQL-101828?style=for-the-badge&logo=supabase&logoColor=3ECF8E" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-101828?style=for-the-badge&logo=typescript&logoColor=3178C6" />
</p>

---

## Overview

**KoperasiSP** is a full-stack cooperative management system built for **Koperasi Simpan Pinjam** workflows. It brings daily cooperative operations into one structured dashboard: member registration, savings balances, loan submission and approval, installment tracking, late-fee handling, financial summaries, SHU reporting, and permission-aware user access.

The project is organized as a practical hybrid stack: a React/Vite dashboard powered by Supabase SQL functions and policies, plus a Laravel API implementation for structured backend routes, roles, exports, and server-side workflows.

---

## Core Features

- **Role-aware dashboard** with admin, pengurus, and anggota access patterns.
- **Member lifecycle management** for active members, profile data, balances, and member exit/refund flows.
- **Savings workflows** covering simpanan pokok, simpanan wajib, and simpanan sukarela deposits/withdrawals.
- **Loan operations** with categories, simulations, validation rules, approval/rejection, disbursement, and early payoff handling.
- **Installment tracking** for due dates, payments, overdue status, and generated denda.
- **Financial reporting** for transaction summaries, SHU allocation, savings reports, loan reports, installment reports, and export-ready data.
- **Secure data model** with Supabase RLS policies, SQL functions, enums, and seed data for cooperative defaults.
- **Polished frontend tooling** using React 19, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts, jsPDF, and ExcelJS.

---

## Project Map

```text
KoperasiSP/
|-- koperasi-app/       React + TypeScript dashboard
|-- koperasi-api/       Laravel API, roles, reports, exports, seeders
`-- supabase/           SQL schema, functions, RLS policies, seed data
```

---

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| State & Data | Zustand, TanStack Query, Supabase JS |
| Charts & Exports | Recharts, jsPDF, jsPDF AutoTable, ExcelJS |
| Backend API | Laravel 13, PHP 8.3, Sanctum, Spatie Permission |
| Reports | DomPDF, Maatwebsite Excel |
| Database | Supabase/PostgreSQL SQL schema, functions, RLS policies |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ComplexMaJa/KoperasiSP.git
cd KoperasiSP
```

### 2. Prepare Supabase

Create a Supabase project, then run the SQL files in this order from the Supabase SQL editor:

```text
supabase/schema.sql
supabase/functions.sql
supabase/security.sql
supabase/seed.sql
```

Create `koperasi-app/.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the frontend dashboard

```bash
cd koperasi-app
pnpm install
pnpm dev
```

If you prefer npm, use `npm install` and `npm run dev` with the same scripts.

### 4. Run the Laravel API

```bash
cd koperasi-api
composer install
cp .env.example .env
php artisan key:generate
php -r "file_exists('database/database.sqlite') || touch('database/database.sqlite');"
php artisan migrate --seed
php artisan serve
```

For the Laravel development bundle, you can also run:

```bash
composer run dev
```

---

## Available Scripts

| Location | Command | Purpose |
| --- | --- | --- |
| `koperasi-app` | `pnpm dev` | Start the Vite dashboard |
| `koperasi-app` | `pnpm build` | Type-check and build the frontend |
| `koperasi-app` | `pnpm lint` | Run ESLint |
| `koperasi-app` | `pnpm preview` | Preview the production build |
| `koperasi-api` | `php artisan serve` | Start the Laravel API server |
| `koperasi-api` | `php artisan test` | Run backend tests |
| `koperasi-api` | `composer run dev` | Run Laravel server, queue, logs, and Vite together |

---

## Domain Modules

| Module | What it handles |
| --- | --- |
| Dashboard | Active members, savings totals, active loans, overdue installments, due-today reminders |
| Anggota | Registration, member profile data, active/exit status, balance refund logic |
| Simpanan | Required monthly savings, voluntary deposits, voluntary withdrawals, balance tracking |
| Pinjaman | Loan categories, simulations, application validation, approval, disbursement, payoff |
| Angsuran | Payment schedule, due dates, paid/late status, denda generation |
| Laporan | Transaction recap, SHU calculation, savings/loan/installment reports, exports |
| Pengguna | Admin and operator access through roles and permissions |

---

## Roadmap

- Add a screenshot gallery for the dashboard and major workflows.
- Add deployment notes for Supabase, frontend hosting, and the Laravel API.
- Add CI checks for frontend lint/build and backend tests.
- Replace the default subfolder READMEs with module-specific documentation.

---

<p align="center">
  <strong>Built for clear cooperative operations, clean financial flows, and assignment-grade polish.</strong>
</p>
