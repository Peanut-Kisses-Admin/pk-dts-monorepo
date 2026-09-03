# Specifics API

Base path: `/api/v1/specifics`

Specifics can optionally belong to an area.

## Endpoints

- `GET /` list specifics
- `GET /:id` get one specific
- `POST /` create specific
- `PATCH /:id` update specific
- `DELETE /:id` delete specific

## Create / Update Body

```json
{
  "specific_name": "Controlled Documents",
  "area_id": "1"
}
```

Validation notes:

- `specific_name` is required on create
- `area_id` is optional and must be sent as a string when used
- `Update` accepts partial fields

## List Response

The list endpoint includes the nested `area` object.

## Detail Response

`GET /:id` returns the specific with:

- `area`
- `hardcopies`
