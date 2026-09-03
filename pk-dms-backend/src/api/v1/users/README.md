# Users API

Base path: `/api/v1/users`

## Endpoints

- `GET /` list users
- `GET /me` get the signed-in user's account details
- `GET /:id` get one user
- `POST /` create user
- `PATCH /:id` update user
- `DELETE /:id` delete user

## List Response

The list endpoint is paginated and returns users with a role summary.

Returned fields:

- `user_id`
- `firstname`
- `lastname`
- `middlename`
- `age`
- `address`
- `phone_number`
- `email`
- `position_title`
- `created_at`
- `updated_at`
- `role.role_id`
- `role.role_name`
- `role.description`

## Create / Update Body

```json
{
  "firstname": "Juan",
  "lastname": "Dela Cruz",
  "middlename": "Santos",
  "age": 30,
  "address": "Manila, Philippines",
  "phone_number": "+639171234567",
  "email": "juan@example.com",
  "position_title": "Document Controller",
  "password": "password123",
  "role_id": "1"
}
```

Validation notes:

- `firstname`, `lastname`, `email`, `password`, and `role_id` are required on create
- `role_id` must be sent as a string
- `Update` accepts the same fields as optional
- Every authenticated user may update their own account through `PATCH /:id`, even without `user-accounts.edit`
- Self-service updates cannot change `role_id` unless the signed-in user already has `user-accounts.edit` or `user-accounts.manage`

## Detail Response

`GET /:id` returns the user without `password` and includes:

- `role`
- `created_documents`
- `uploaded_revisions`

## Delete Notes

- Deleting is blocked when the user is linked to document history
- The last administrator cannot be deleted
