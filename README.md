# Festie Testing

A Next.js issue tracker for Festie Testing with MongoDB persistence, Cloudinary image uploads, user-name based filtering, and a simple admin clearance panel.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill your MongoDB and Cloudinary values.

3. Run the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

The admin panel is at `http://localhost:3000/admin`.

Default admin credentials:

- Username: `ADMIN`
- Password: `ADMIN@123`

## Categories

`candidate`, `program`, `registration`, `result`, `report`, `billing`, `template`, `AI`, `content`, `schedule`, `website`, `notification`, `dashboards`, `other`
