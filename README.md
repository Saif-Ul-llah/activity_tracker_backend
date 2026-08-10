# TypeScript Express MongoDB Boilerplate

Backend boilerplate built with Express, TypeScript, MongoDB, Mongoose, Socket.IO, Firebase Admin, Nodemailer, Joi validation, and JWT-based auth helpers.

## Requirements

- Node.js 18+
- npm
- MongoDB running locally or a hosted MongoDB connection string

## Setup

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Set at least these values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/ts_boiler_plate_mern
JWT_SECRET=your-secret
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_PORT=465
EMAIL_HOST=smtp.gmail.com
```

## Scripts

Run in development:

```bash
npm run dev
```

Build TypeScript:

```bash
npm run build
```

Run the compiled app:

```bash
npm start
```

## Docker

Start the API with MongoDB:

```bash
docker compose up --build
```

The compose file starts:

- `mongo` on port `27017`
- `node_backend` on port `5000`

Inside Docker, the app uses:

```env
MONGO_URI=mongodb://mongo:27017/ts_boiler_plate_mern
```

## API

Base URL:

```text
http://localhost:5000/api
```

Health/root check:

```http
GET /
```

Auth routes:

```http
POST /api/register
POST /api/login
POST /api/forgot-password
POST /api/verify-otp
POST /api/reset-password
POST /api/change-password
```

`/api/reset-password` and `/api/change-password` require:

```http
Authorization: Bearer <accessToken>
```

### Register

```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "Test User",
  "phoneNumber": "1234567890",
  "role": "CUSTOMER"
}
```

Valid roles:

```text
ADMIN, SUB_ADMIN, DISTRIBUTOR, INSTALLER, CUSTOMER
```

### Login

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Forgot Password

```json
{
  "email": "user@example.com"
}
```

### Verify OTP

```json
{
  "email": "user@example.com",
  "otp": 123456
}
```

### Reset Password

```json
{
  "newPassword": "newpassword123"
}
```

### Change Password

```json
{
  "oldPassword": "password123",
  "newPassword": "newpassword123"
}
```

## Project Structure

```text
src/
  app.ts
  config/
    app_config.ts
    database.ts
    firebase_config.ts
  helpers/
  middlewares/
  models/
    user_model.ts
  modules/
    auth/
  routes/
  services/
  types/
  utils/
```

## Database

The app uses Mongoose models in `src/models`. The current models are:

- `User`
- `UserVerification`

Configure the database with `MONGO_URI`.

## Firebase Admin

Firebase Admin will use `src/config/service_account_key.json` if it exists. The file is optional for local builds, but Firebase operations require valid credentials at runtime.

## Notes

- This project uses MongoDB/Mongoose and does not require Prisma commands, migrations, or generated Prisma clients.
- Passwords are hashed before storage.
- Duplicate MongoDB key errors and Mongoose validation errors are normalized by the global error middleware.
