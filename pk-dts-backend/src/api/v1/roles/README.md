# Roles API

Base path: `/api/v1/roles`

## Endpoints

- `GET /` list roles
- `GET /:id` get one role
- `POST /` create role
- `PATCH /:id` update role
- `DELETE /:id` delete role

## List Response

The list endpoint includes role permissions and user counts.

Returned fields:

- `role_id`
- `role_name`
- `description`
- `role_permissions[]`
- `_count.users`

## Create / Update Body

```json
{
  "role_name": "Admin",
  "description": "Full access to the system."
}
```

Validation notes:

- `role_name` is required on create
- `description` is optional
- `Update` accepts partial fields

## Detail Response

`GET /:id` returns the role with:

- `users`
- `role_permissions.permission`

## Delete Notes

- Deleting is blocked while users are assigned to the role
- Related role-permission rows are removed in the same transaction

