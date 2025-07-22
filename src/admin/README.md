# Admin Module

This module provides separate admin authentication and authorization functionality, completely independent from the regular user system.

## Features

- Separate admin entity with username/password authentication
- JWT-based authentication for admins
- Admin-specific guards and decorators
- Password hashing with bcrypt

## API Endpoints

### Admin Login

```
POST /admin/admin-login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

Response:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "username": "admin"
  }
}
```

### Protected Admin Routes

```
GET /admin/profile
GET /admin/dashboard
```

Headers required:

```
Authorization: Bearer <admin_jwt_token>
```

## Usage in Other Modules

To protect routes with admin authentication in other modules:

```typescript
import { AdminAuthGuard } from '../admin/admin-auth.guard';
import { AdminUser } from '../admin/admin.decorator';

@Controller('settings')
export class SettingsController {
  @Get('config')
  @UseGuards(AdminAuthGuard)
  getConfig(@AdminUser() admin) {
    // Only admins can access this
    return { message: 'Admin only', admin };
  }
}
```

## Creating Admin Users

Run the script to create a default admin:

```bash
npm run create-admin
```

This creates an admin with:

- Username: `admin`
- Password: `admin123`

## Database

The admin module creates an `admins` table with:

- `id` (Primary Key)
- `username` (Unique)
- `password` (Hashed)
- `isActive` (Boolean)
- `createdAt` (Timestamp)
- `updatedAt` (Timestamp)
