# Sequences API

Base path: `/api/v1/sequences`

Sequences are used as document prefixes or identifiers.

## Endpoints

- `GET /` list sequences
- `GET /:id` get one sequence
- `POST /` create sequence
- `PATCH /:id` update sequence
- `DELETE /:id` delete sequence

## Create / Update Body

```json
{
  "sequence_code": "QMS"
}
```

Validation notes:

- `sequence_code` is required on create
- `Update` accepts partial fields

## Detail Response

`GET /:id` returns the sequence with its `hardcopies`.
