# API v1 Documentation

This folder contains the versioned backend modules for the frontend to consume.
Each module has its own `README.md` with routes, request bodies, and response
notes that match the live controller and DTO definitions.

## Common Rules

- Base URL: `/api/v1`
- List endpoints support pagination with `page` and `limit`
- `limit` defaults to `10` and is capped at `100`
- BigInt IDs must be sent as strings in JSON bodies
- Standard success responses are wrapped by the API envelope

Example success envelope:

```json
{
  "success": true,
  "path": "/api/v1/users?page=1&limit=10",
  "timestamp": "2026-07-07T00:00:00.000Z",
  "data": {
    "items": [],
    "meta": {
      "total": 0,
      "page": 1,
      "limit": 10,
      "total_pages": 0,
      "has_next_page": false,
      "has_previous_page": false
    }
  }
}
```

## Modules

- [Auth](./auth/README.md)
- [Users](./users/README.md)
- [Roles](./roles/README.md)
- [Permissions](./permissions/README.md)
- [Role Permissions](./role-permissions/README.md)
- [Areas](./areas/README.md)
- [Specifics](./specifics/README.md)
- [Locations](./locations/README.md)
- [Sequences](./sequences/README.md)
- [Asset Numbers](./asset-numbers/README.md)
- [Documents](./documents/README.md)


This is for guide for the new prohrammer