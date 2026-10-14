# GearUp 🏋️

**Rent Sports & Outdoor Gear Instantly**

GearUp is a backend REST API for a sports and outdoor equipment rental service. Customers browse gear, place rental orders and pay online with Stripe. Providers manage their gear inventory and fulfil orders. Admins oversee users, listings and rentals.

## Links

| Item | Link |
|------|------|
| Live API | https://gearup-backend-livid.vercel.app |
| API Documentation (Postman) | https://documenter.getpostman.com/view/55209454/2sBYHRVMfk |


---

## Features

| Role | Can do |
|------|--------|
| **Public** | Browse, search and filter gear; view gear details and reviews; list categories |
| **Customer** | Register/login, place rental orders, cancel a `PLACED` order, pay with Stripe, view payment history, review gear after returning it, manage profile |
| **Provider** | Register/login, add/edit/delete own gear, manage stock, view incoming orders, confirm orders and mark them picked up / returned |
| **Admin** | View and search all users, suspend/activate accounts, view all gear and rental orders, manage categories |

Users choose `CUSTOMER` or `PROVIDER` at registration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime / Framework | Node.js, Express 5 |
| Language | TypeScript |
| Database / ORM | PostgreSQL (Neon), Prisma 7 with `@prisma/adapter-pg` |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Validation | Zod |
| Payments | Stripe Checkout (test mode) + webhooks |
| Deployment | Vercel |

## Project Structure

```
src/
├── app.ts                  # Express app, middleware, route mounting
├── server.ts               # Entry point (DB connect + listen)
├── config/                 # Typed environment config
├── lib/                    # Prisma client, Stripe client
├── middlewares/            # auth, validateRequest, globalErrorHandler, notFound
├── utils/                  # AppError, catchAsync, sendResponse, jwt helpers
└── modules/
    ├── auth/
    ├── user/
    ├── category/
    ├── gearItem/
    ├── rentalOrder/
    ├── payment/
    ├── review/
    └── admin/              # each module: route, controller, service, validation, interface
prisma/
└── schema/                 # Prisma schema split into files + migrations
```

Each request flows `route → (auth, validateRequest) → controller → service → Prisma`.

## Database Design

| Table | Purpose |
|-------|---------|
| `users` | Account, credentials, role (`CUSTOMER` / `PROVIDER` / `ADMIN`), status (`ACTIVE` / `SUSPENDED`) |
| `categories` | Gear categories (cycling, camping, fitness, water sports, ...) |
| `gear_items` | Gear listings: price per day, total and available stock, images, brand; linked to a provider and a category |
| `rental_orders` | A customer's order: dates, total amount, status |
| `rental_order_items` | Gear lines in an order: quantity, price per day, subtotal |
| `payments` | One payment per order: provider (Stripe), transaction ID, amount, method, status, `paidAt` |
| `reviews` | Customer rating (1-5) and comment for a gear item |

**Relations:** a provider has many gear items · a category has many gear items · a customer has many orders and reviews · an order has many order items and one payment · a gear item has many order items and reviews.

## Business Rules

**Order lifecycle**

```
PLACED ──(provider confirms)──► CONFIRMED ──(Stripe webhook)──► PAID ──► PICKED_UP ──► RETURNED
   └──(customer cancels)──► CANCELLED
```

- Total = price per day × quantity × number of days (minimum 1 day).
- Stock is reserved when an order is placed and restored when it is cancelled or returned. Order creation, cancellation and status changes run inside database transactions, so two customers cannot book the last unit.
- Only the customer can cancel, and only while the order is `PLACED`.
- Only the provider who owns an item in the order (or an admin) can move it to `CONFIRMED`, `PICKED_UP` or `RETURNED`.
- `PAID` cannot be set manually. It is set only when Stripe confirms the payment.
- A provider can only edit or delete their own gear. A gear item with rental history cannot be deleted.
- A customer can review a gear item only after a `RETURNED` order that included it, and only once per item.
- Suspended users are blocked at login and on every request, even with an existing token.

## Payments (Stripe)

1. Provider confirms the order (`CONFIRMED`).
2. Customer calls `POST /api/payments/create` with the order ID and receives a Stripe Checkout URL.
3. Customer pays on Stripe's page.
4. Stripe calls `POST /api/payments/webhook` (signature verified). The payment becomes `COMPLETED` and the order becomes `PAID`.
5. `POST /api/payments/confirm` re-checks a Checkout session directly with Stripe and syncs the status. It is a safe fallback if the webhook is delayed, and it is idempotent.

Payment statuses: `PENDING`, `COMPLETED`, `FAILED`. Test card: `4242 4242 4242 4242`, any future expiry, any CVC.

## API Endpoints

Base path: `/api`. Full request/response examples are in the [Postman documentation](https://documenter.getpostman.com/view/55209454/2sBYHRVMfk).

### Auth & Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/users/register` | Public | Register as customer or provider |
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/refresh-token` | Public | Get a new access token |
| POST | `/auth/logout` | Public | Clear auth cookies |
| GET | `/users/me` | Any user | Current profile |
| PATCH | `/users/me` | Any user | Update name / phone |

### Categories
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/categories` | Public | List categories |
| POST | `/categories` | Admin | Create category |
| DELETE | `/categories/:id` | Admin | Delete category |

### Gear
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/gear-items` | Public | Browse with search, filters, sorting, pagination |
| GET | `/gear-items/:id` | Public | Gear details with reviews |
| GET | `/gear-items/my-items` | Provider | Own gear |
| POST | `/gear-items` | Provider | Add gear |
| PATCH | `/gear-items/:id` | Provider (owner), Admin | Update gear |
| DELETE | `/gear-items/:id` | Provider (owner), Admin | Delete gear |

**Listing query params:** `searchTerm`, `category` (name), `brand`, `minPrice`, `maxPrice`, `availableOnly=true`, `sortBy`, `sortOrder` (`asc`/`desc`), `page`, `limit`.

### Rental Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/rental-orders` | Customer | Place an order |
| GET | `/rental-orders/my-orders` | Customer | Own orders (optional `status` filter) |
| GET | `/rental-orders/provider-orders` | Provider | Incoming orders for own gear |
| GET | `/rental-orders/:id` | Customer, Provider, Admin | Order details (owner / involved provider / admin) |
| PATCH | `/rental-orders/:id/cancel` | Customer | Cancel a `PLACED` order |
| PATCH | `/rental-orders/:id/status` | Provider, Admin | Set `CONFIRMED`, `PICKED_UP` or `RETURNED` |

### Payments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/payments/create` | Customer | Create Stripe Checkout session for a confirmed order |
| POST | `/payments/webhook` | Stripe | Stripe event receiver |
| POST | `/payments/confirm` | Customer, Admin | Sync a session's status from Stripe |
| GET | `/payments` | Customer, Provider, Admin | Payment history (scoped by role) |
| GET | `/payments/:id` | Customer, Provider, Admin | Payment details |

### Reviews
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/reviews` | Customer | Review gear after returning it |
| GET | `/reviews/gear-item/:gearItemId` | Public | Reviews for a gear item |

### Admin
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/admin/users` | Admin | All users (filter by `role`, `activeStatus`, `searchTerm`) |
| PATCH | `/admin/users/:id` | Admin | Suspend / activate a user |
| GET | `/admin/gear-items` | Admin | All gear listings |
| GET | `/admin/rentals` | Admin | All rental orders (filter by `status`) |

## Response Format

**Success**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Gear items fetched successfully",
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```
`meta` appears only on paginated list endpoints.

**Error** (every error uses this shape)
```json
{
  "success": false,
  "message": "Validation failed",
  "errorDetails": [{ "path": "body.email", "message": "Invalid email address" }]
}
```

Request bodies are validated with Zod. Validation, authentication (401), authorization (403), duplicate records, Prisma errors, invalid tokens and unknown routes (404) are all returned in the format above.

## Authentication

Login returns an access token and a refresh token and also sets them as `httpOnly` cookies. Protected routes accept either the cookie or an `Authorization: Bearer <accessToken>` header. Roles are enforced by the `auth(...)` middleware.

## Getting Started

**Prerequisites:** Node.js 20+, a PostgreSQL database (e.g. a free Neon project), a Stripe account in test mode, and the [Stripe CLI](https://docs.stripe.com/stripe-cli) for local webhooks.

```bash
git clone <repo-url>
cd gearup-backend
npm install
cp .env.example .env        # then fill in the values below
npx prisma migrate dev      # create tables
npm run dev                 # starts on http://localhost:5000
```

**Local Stripe webhooks** (in a second terminal):
```bash
stripe listen --all-snapshot --forward-to localhost:5000/api/payments/webhook
```
Copy the printed `whsec_...` value into `STRIPE_WEBHOOK_SECRET` and restart the server.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (e.g. `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Allowed CORS origin and base for Stripe redirect URLs |
| `BCRYPT_SALT_ROUNDS` | Password hashing rounds (e.g. `10`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | JWT signing secrets |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (e.g. `1d`, `7d`) |
| `STRIPE_SECRET_KEY` | Stripe test secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |

## Quick Test Flow (Postman)

1. Register a **customer** and a **provider**; log in as each.
2. Admin: log in and `POST /categories`.
3. Provider: `POST /gear-items` with the new category.
4. Customer: `POST /rental-orders` with a future start date.
5. Provider: `PATCH /rental-orders/:id/status` → `CONFIRMED`.
6. Customer: `POST /payments/create`, open the returned URL and pay with the test card.
7. Check `GET /rental-orders/:id` shows `PAID`; provider then sets `PICKED_UP` and `RETURNED`.
8. Customer: `POST /reviews`.
9. Admin: explore `/admin/users`, `/admin/gear-items`, `/admin/rentals`.

## Author

Built by Hasnat Bin Sayed.