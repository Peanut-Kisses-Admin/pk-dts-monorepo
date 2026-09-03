# Asset Numbers API

Base path: `/api/v1/asset-numbers`

This module manages the standalone asset number catalog used by hardcopy documents.

## Endpoints

- `GET /` list asset numbers
- `GET /:id` get one asset number
- `POST /` create asset number
- `PATCH /:id` update asset number
- `DELETE /:id` delete asset number

## Create / Update Body

```json
{
  "asset_number": "ASSET-2026-001"
}
```

Validation notes:

- `asset_number` is required on create
- `Update` accepts partial fields

## List Response

The list endpoint returns paginated asset numbers with:

- `asset_id`
- `asset_number`
- `created_at`
- `hardcopies`

## Detail Response

`GET /:id` returns the asset number with its linked `hardcopies`, if assigned.

Each hardcopy payload includes:

- `document`
- `area`
- `specific`
- `location`
- `sequence`

## Delete Notes

- Deleting an asset number is allowed and clears the `hardcopy.asset_id` relation through `onDelete: SetNull`
