# Softcopy Folders API

- `GET /api/v1/softcopy-categories` lists categories with document counts.
- `GET /api/v1/softcopy-categories/:id` returns category details and linked softcopies.
- `POST /api/v1/softcopy-categories` creates a category and stable storage folder name.
- `PATCH /api/v1/softcopy-categories/:id` updates its display name or description.
- `DELETE /api/v1/softcopy-categories/:id` deletes an unused category.

`Uncategorized` is protected and receives existing or legacy softcopy documents.
