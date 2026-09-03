# Areas API

Base path: `/api/v1/areas`

## Endpoints

- `GET /` list areas
- `GET /:id` get one area
- `POST /` create area
- `PATCH /:id` update area
- `DELETE /:id` delete area

## Create / Update Body

```json
{
  "area_name": "Quality Assurance"
}
```

Validation notes:

- `area_name` is required on create
- `Update` accepts partial fields

## List Response

The list endpoint returns each area with its `specifics` summary.

## Detail Response

`GET /:id` returns the area with:

- `specifics`
- `hardcopies`
