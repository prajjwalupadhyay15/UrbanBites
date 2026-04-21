# UrbanBites Backend (Phase 1 MVP)

This implementation bootstraps the backend foundation for UrbanBites with:
- Spring Boot REST API
- Spring Security + JWT authentication
- PostgreSQL-ready JPA model
- Flyway migration for initial auth schema
- Basic role model (`CUSTOMER`, `RESTAURANT_OWNER`, `DELIVERY_AGENT`, `ADMIN`)
- Flat layer-based folder structure (`controller`, `service`, `repository`, `entity`, `dto`, `enums`, `exception`, `util`)

## Implemented APIs
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/users/me` (requires `Authorization: Bearer <token>`)

## Phase 1 status
Phase 1 (Project setup + Authentication) is implemented with simple JWT-based auth, protected user profile endpoint, and integration tests.

## Local configuration
Default application config reads these environment variables:
- `DB_URL` (default `jdbc:postgresql://localhost:5432/urbanbites`)
- `DB_USERNAME` (default `postgres`)
- `DB_PASSWORD` (default `postgres`)
- `JWT_SECRET`
- `JWT_EXPIRATION_MS`

Tests run on in-memory H2 via `src/test/resources/application.properties`.

## Run tests
```powershell
.\mvnw.cmd test
```

## Run application
```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/urbanbites"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="postgres"
$env:JWT_SECRET="change-this-to-a-long-random-secret-key-with-at-least-32-bytes"
.\mvnw.cmd spring-boot:run
```

## Example auth calls
```powershell
curl -X POST "http://localhost:8080/api/v1/auth/register" -H "Content-Type: application/json" -d '{"email":"customer@example.com","password":"TestPass123","fullName":"Customer","role":"CUSTOMER"}'
curl -X POST "http://localhost:8080/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"customer@example.com","password":"TestPass123"}'
```

