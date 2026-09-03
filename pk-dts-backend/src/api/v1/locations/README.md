# Locations API

Base path: `/api/v1/locations`

## Endpoints

- `GET /` list locations
- `GET /:id` get one location
- `POST /` create location
- `PATCH /:id` update location
- `DELETE /:id` delete location

## Create / Update Body

```json
{
  "location_name": "Main Office"
}
```

Validation notes:

- `location_name` is required on create
- `Update` accepts partial fields

## Detail Response

`GET /:id` returns the location with its `hardcopies`.
