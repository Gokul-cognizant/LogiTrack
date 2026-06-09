# LogiTrack Frontend

Angular 17 (standalone components) frontend for the LogiTrack Spring Boot microservices backend.
Plain CSS only — no Tailwind, no Bootstrap, no Material.

## What's inside

- JWT auth (login / register / OTP request)
- JWT interceptor that attaches `Authorization: Bearer <token>` to every authenticated call
- Role-based route guards
- Dark sidebar layout with role-aware navigation
- Pages for: Customer (create / my orders), Dispatcher (shipments, routes, dispatch, assignments),
  Driver (rides, complete delivery), Fleet (vehicles), Admin (pending / all users / audit logs),
  shared Notifications
- All API URLs come from `src/environments/environment.ts`

## Prerequisites

- **Node.js** 18.13+ or 20.9+
- All backend services running (Eureka, Auth, Shipment, Fleet, Dispatch, Driver, optional Notification, and Gateway). The frontend talks to the gateway on `http://localhost:9090` by default.

## Install & run

```bash
cd logitrack-frontend
npm install
npm start            # serves at http://localhost:4200, opens browser
```

Production build:

```bash
npm run build        # output in dist/logitrack-frontend
```

## Configure the API base

Edit `src/environments/environment.ts` if your gateway is on a different host/port:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:9090'
};
```

You can also point this directly at any single service port (8081-8086) if the gateway isn't running, but the gateway is recommended.

## ⚠️ CORS — read this before you run

**The browser will block every backend call unless CORS is configured on the backend.**

This frontend is not the source of the problem — it's a standard browser security rule. None of the LogiTrack services currently expose a `CorsConfigurationSource` bean. You'll see errors like:

```
Access to XMLHttpRequest at 'http://localhost:9090/api/auth/login' from origin
'http://localhost:4200' has been blocked by CORS policy
```

You have two clean options. Both require a small backend addition that you (or your team) need to apply — this frontend cannot do it for you.

### Option A — enable CORS on the API gateway (recommended)

Add this `@Configuration` class inside `logitrack-api-gateway/src/main/java/com/cts/config/` (create the file):

```java
package com.cts.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of("http://localhost:4200"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource src = new UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return new CorsWebFilter(src);
    }
}
```

Restart the gateway. Done.

### Option B — Angular dev proxy (no backend change)

Create `proxy.conf.json` next to `package.json`:

```json
{
  "/api": {
    "target": "http://localhost:9090",
    "secure": false,
    "changeOrigin": true
  }
}
```

Then change `environment.ts` to `apiBaseUrl: ''` and run with:

```bash
npx ng serve --proxy-config proxy.conf.json
```

This works in dev only. For prod you'll need Option A or equivalent CORS on the gateway.

## Quick test path (matches your backend's golden flow)

1. **Login as admin** — backend auto-creates `admin@logitrack.com` / `Admin@123`. Use the Sign In page.
2. **Approve users** — go to *Pending Users*, approve the customer/driver/dispatcher/fleet-manager accounts you registered.
3. **Fleet Manager** — *Vehicles* → add a vehicle.
4. **Customer** — *New Shipment* → place an order. The OTP is auto-generated (assuming you applied the dispatch-service / shipment-service fixes from the recent session).
5. **Dispatcher** — *Routes* → create a route → *Dispatch* → pick shipment, vehicle, route, driver ID, departure/arrival → submit.
6. **Driver** — *My Rides* → click "Start trip" → click "Complete delivery" → enter the shipment's OTP.

## Folder structure

```
src/
├── app/
│   ├── app.component.ts
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── core/
│   │   ├── guards/         (authGuard, roleGuard)
│   │   ├── interceptors/   (authInterceptor: attaches JWT, redirects on 401/403)
│   │   ├── models/         (auth, shipment, vehicle, dispatch, driver, notification, user)
│   │   └── services/       (auth, shipment, fleet, dispatch, driver, notification, admin)
│   ├── layouts/
│   │   └── main-layout/    (sidebar + router-outlet)
│   └── features/
│       ├── auth/           (login, register)
│       ├── dashboard/      (role-aware)
│       ├── customer/       (create-shipment, my-orders)
│       ├── dispatcher/     (shipments-list, routes, dispatch-form, assignments)
│       ├── driver/         (my-rides, complete-delivery)
│       ├── fleet/          (vehicles)
│       ├── admin/          (pending-users, all-users, audit-logs)
│       ├── notifications/  (shared)
│       └── shared/         (not-found)
├── environments/
│   └── environment.ts
├── index.html
├── main.ts
└── styles.css
```

## Backend endpoints used

Auth (`/api/auth/**`, `/api/otp/**`, `/api/admin/**`)
- POST `/api/auth/login`
- POST `/api/auth/register`
- POST `/api/auth/logout`
- POST `/api/otp/request`
- GET  `/api/admin/users` / `/users/pending` / `/users/role/{role}`
- PUT  `/api/admin/users/{id}/approve` / `/reject` / `/reactivate`
- DELETE `/api/admin/users/{id}`
- GET  `/api/admin/audit-logs`

Shipment (`/api/shipments/**`)
- POST `/create`, GET `/{id}`, GET `/my-orders`, GET `/all`
- POST `/{id}/regenerate-otp`

Fleet (`/api/fleet/**`)
- GET / POST `/vehicles`, GET `/vehicles/{id}`

Dispatch (`/api/dispatcher/**`)
- GET `/shipments`, PUT `/shipments/{id}/cancel` / `/cancel-dispatch`
- POST `/dispatch`
- GET `/assignments`, `/assignments/driver/{id}`, `/schedules/shipment/{id}`
- Routes: POST `/routes/create`, GET `/routes/all-routes`, GET `/routes/{id}`,
  PATCH `/routes/{id}/status?status=`, DELETE `/routes/{id}`
- Schedules: POST `/schedules/create`, GET `/schedules/route-schedule-all`,
  GET `/schedules/{id}`, GET `/schedules/vehicle/{id}`, GET `/schedules/driver/{id}`

Driver (`/api/driver/**`)
- GET `/my-rides`, PATCH `/trips/{scheduleId}/start`
- POST `/shipments/{id}/complete`, GET `/records/{orderId}`

Notifications (`/api/notifications/**`)
- GET `/my`, `/my/unread`, `/my/unread/count`
- PATCH `/{id}/read`, POST `/`, GET `/all`

## Known gaps the frontend cannot fix

1. **CORS** — must be configured on backend (see above).
2. **`/api/auth/me`** — no endpoint exists. The frontend decodes the JWT client-side (`atob`) to read `sub`, `userId`, `role`. Standard practice but worth knowing.
3. **OTP code in dev** — the auth-service prints the OTP in the OTP request response (e.g., `"OTP sent to foo@bar123456"`). The frontend surfaces that response as-is so you can read the code during testing.
4. **Driver user id** — the dispatch form asks you to type the driver's userId. There's no "list drivers" endpoint, so it's a manual number for now.

## Notes

- This frontend assumes the recent backend fixes from your session are applied (especially the dispatch service's expanded `findScheduledRidesByDriverId` query, the dispatch response containing `driverId`, and the shipment service's auto-generated OTP). If those aren't applied, the UI still works but you'll hit the same backend errors you saw in Postman.
- Plain CSS lives in: `styles.css` (global tokens and primitives), per-component `.css` files for layout/login/register/dashboard, and inline `styles: [...]` arrays for the smaller feature pages (still plain CSS, just colocated with the TS for brevity).
