# Role Permissions API

Base path: `/api/v1/role-permissions`

This module assigns permissions to roles.

## Endpoints

- `GET /` list role-permission links
- `POST /` assign a permission to a role
- `DELETE /:id` remove a role-permission link

## Create Body

```json
{
  "role_id": "1",
  "permission_id": "2"
}
```

Validation notes:

- Both IDs are required
- Both IDs must be sent as strings
- A role and permission pair is unique

## List Response

The list endpoint returns each link with the nested `role` and `permission`
objects.

