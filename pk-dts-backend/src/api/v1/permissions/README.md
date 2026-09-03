# Permissions API

Base path: `/api/v1/permissions`

## Endpoints

- `GET /` list permissions
- `GET /:id` get one permission
- `POST /` create permission
- `PATCH /:id` update permission
- `DELETE /:id` delete permission

## Create / Update Body

```json
{
  "permission_name": "documents.create",
  "description": "Can create documents."
}
```

Validation notes:

- `permission_name` is required on create
- `description` is optional
- `Update` accepts partial fields

## Detail Response

`GET /:id` returns the permission with:

- `role_permissions`
- `role_permissions.role`

