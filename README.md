# Network Map

This project is an NSP-ready network map which pulls data directly from PeeringDB.

## Contributing

### Prerequisites

- Bun
- A PostgreSQL database with the PostGIS extension
- GitHub OAuth credentials

### Environment Variables

| Environment Variable   | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `PEERING_DB_KEY`       | The PeeringDB API key                             |
| `DATABASE_URL`         | The URL of your PostgreSQL database               |
| `GITHUB_CLIENT_ID`     | GitHub OAuth client ID                            |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth client secret                        |
| `ALLOWED_USERS`        | The GitHub usernames of users allowed to register |

### Getting started

#### Install dependencies

```
bun i
```

#### Run database migrations

```
bun db:migrate
```

#### Run the development server

```
bun --bun dev
```

> [!NOTE]
> The use of the `--bun` flag is required to override the shebang requesting node in vite. This may be fixed in the future.

Then open http://localhost:5173
