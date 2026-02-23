# Templates API

## List Templates

```
GET /api/templates
```

## Get Template

```
GET /api/templates/:id
```

## Create Template

```
POST /api/templates
```

**Body:**
```json
{
  "name": "My Template",
  "content": "CLAUDE.md content here..."
}
```

## Update Template

```
PUT /api/templates/:id
```

**Body:**
```json
{
  "name": "Updated name",
  "content": "Updated content..."
}
```

## Delete Template

```
DELETE /api/templates/:id
```
