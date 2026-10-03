# Real Estate Lead CRM API

A backend API for real estate companies to manage property listings and customer enquiries (leads). Website visitors submit enquiries, admins assign them to agents, and agents track each lead through a defined sales pipeline so no enquiry gets lost.

Built with **TypeScript, Express, Prisma, PostgreSQL, Zod and JWT**.

---

## Features

- **Authentication**: register and login with bcrypt password hashing and JWT tokens
- **Role-based access control**: `admin` and `agent` roles enforced through a reusable `requireRole` middleware
- **Property management**: admin-only create, update and delete; filtered and paginated listing for all users
- **Public lead capture**: website enquiry form endpoint that needs no login
- **Lead assignment**: admins assign leads to agents (only valid agents can be assigned)
- **Lead pipeline as a state machine**: status can only move through valid transitions
- **Ownership checks**: agents can only see and update leads assigned to them
- **Consistent API responses** and a global error handler that never leaks internal details

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Framework | Express 5 |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT (`jsonwebtoken`), `bcrypt` |

---

## Design Decisions

**Single source of truth for types.** Request types are inferred from Zod schemas with `z.infer`, and database enums (`Role`, `LeadStatus`, etc.) come from the Prisma schema. Adding a new enum value in one place surfaces type errors everywhere it must be handled.

**Lead status as a state machine.** Allowed transitions are defined in a `Record<LeadStatus, LeadStatus[]>` map:

```
new ──► contacted ──► site_visit ──► closed
 │          │             │
 └──────────┴─────────────┴──► lost
```

Invalid jumps such as `closed → new` or `new → closed` return `400`. Because the map is typed with `Record<LeadStatus, ...>`, forgetting a status is a compile-time error.

**Ownership returns 404, not 403.** When an agent requests a lead that belongs to someone else, the API responds exactly as if the lead does not exist. This avoids revealing which lead IDs exist (IDOR protection).

**No privilege escalation on signup.** The register endpoint does not accept a `role` field. Zod strips unknown keys, and every new user is created as an `agent`. Admins are promoted directly in the database.

**Login does not reveal which field was wrong.** Wrong email and wrong password return the same `401` message, preventing user enumeration.

**Passwords never leave the database.** User queries use Prisma `select` so the password hash is never returned in responses.

**Validated JWT payload.** `jwt.verify` returns `string | JwtPayload`, so the decoded token is validated with Zod before `req.user` is set.

**Fail fast on missing config.** The server refuses to start if `JWT_SECRET` is missing, instead of signing tokens with `undefined`.

**Soft delete over hard delete.** A property that has leads cannot be deleted (`409 Conflict`); the response suggests marking it as `sold` instead, preserving lead history.

**Business rules vs shape validation.** Zod validates the shape of input (phone format, enums, limits). Rules that depend on database state, such as "a sold property cannot receive enquiries", are checked in the route.

---

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an account (always `agent`) |
| POST | `/auth/login` | Public | Returns a JWT |
| GET | `/me` | Logged in | Current user from the token |

### Properties
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/properties` | Admin | Create a property |
| GET | `/properties` | Logged in | List with filters and pagination |
| PATCH | `/properties/:id` | Admin | Update a property |
| DELETE | `/properties/:id` | Admin | Delete (blocked with `409` if it has leads) |

**Query filters for `GET /properties`:** `city` (case-insensitive), `type`, `status`, `minPrice`, `maxPrice`, `page`, `limit` (max 50)

```
GET /properties?city=indore&type=villa&maxPrice=9000000&page=1&limit=10
```

### Leads
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/leads` | Public | Submit an enquiry for an available property |
| GET | `/leads` | Logged in | Admin sees all leads, agent sees only assigned leads |
| PATCH | `/leads/:id/assign` | Admin | Assign a lead to an agent |
| PATCH | `/leads/:id/status` | Admin or assigned agent | Move the lead to a valid next status |

### Response format

```json
{ "success": true, "data": { } }
{ "success": false, "message": "Lead not found" }
{ "success": false, "errors": [ /* Zod validation issues */ ] }
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL

### Setup

```bash
git clone <your-repo-url>
cd realestate-crm
npm install
```

Create a `.env` file in the project root:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/realestate_crm"
JWT_SECRET="a-long-random-secret"
```

Create the database tables:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

The API runs on `http://localhost:4000`.

### Creating the first admin

For security, there is no endpoint that creates admins. Register a user, then promote them in the database:

```sql
UPDATE "User" SET role = 'admin' WHERE email = 'admin@example.com';
```

Log in again after promotion to receive a token with the new role.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload (`tsx watch`) |
| `npm run typecheck` | Type-check without emitting files |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled build |

---

## Project Structure

```
src/
├── index.ts                  # App setup, routers, 404 and error handlers
├── lib/
│   ├── prisma.ts             # Shared Prisma client
│   └── env.ts                # Validated environment variables
├── middleware/
│   ├── auth.ts               # JWT verification, sets req.user
│   ├── requireRole.ts        # Role-based access control
│   └── errorHandler.ts       # Global error handler
├── routes/
│   ├── auth.routes.ts
│   ├── property.routes.ts
│   └── lead.routes.ts
├── schemas/                  # Zod schemas and inferred types
│   ├── auth.schema.ts
│   ├── property.schema.ts
│   └── lead.schema.ts
└── types/
    ├── api.ts                # Shared response type
    └── express.d.ts          # Adds typed req.user to Express
prisma/
└── schema.prisma             # Models and enums
```

---

## Future Improvements

- Rate limiting on the public lead endpoint to prevent spam
- Refresh tokens and token revocation on logout
- Automated tests (Vitest + Supertest)
- Docker setup for one-command local development
- OpenAPI / Swagger documentation
- Lead activity history (who changed the status and when)