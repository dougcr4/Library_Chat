# 3D Designer — Garden Furniture & Garden Buildings

## Overview

A standalone local 3D design application for garden furniture and SIP (Structural Insulated Panel) garden buildings. Connects to a local Ollama AI backend to generate CadQuery 3D model scripts, which are then rendered by a local CadQuery Server.

## Architecture

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/        # Express 5 API (port 8080, proxied at /api)
│   └── 3d-designer/       # React + Vite frontend (root /)
├── lib/
│   ├── api-spec/          # OpenAPI spec + Orval codegen
│   ├── api-client-react/  # Generated React Query hooks
│   ├── api-zod/           # Generated Zod validation schemas
│   └── db/                # Drizzle ORM — PostgreSQL
└── scripts/               # Utility scripts
```

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4)
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)

## Local Docker Backend (user-managed)

The app connects to these local Docker services (configured in Settings):

| Service | Default Port | Purpose |
|---|---|---|
| Ollama | 11434 | AI model (qwen2.5) |
| Open-WebUI | 3001 | Web UI for Ollama |
| Qdrant | 6332 | Vector database |
| JupyterLab | 8888 | 3D model viewer (token: douglas-3d) |
| CadQuery Server | 5000 | Renders CadQuery scripts |

Shared designs folder: `/home/douglas/DockerProjects/LLM-3D/shared_designs`

## Features

### Garden Furniture Mode
- 10 design styles (Cotswold, Rustic, Contemporary, etc.)
- 12 furniture items (Table, Chair, Bench, etc.) grouped by category
- AI chat prompt → Ollama generates CadQuery Python script
- Save projects with GF-prefixed job references

### Garden Buildings Mode (SIPs)
- 3 shell designs: Alpha (lean-to), Beta (apex), Charlie (hip roof)
- 5 sizes: S / M / L / XL / Bespoke — with Planning (P) and Building Regs (BR) flags
- 5 SIP panel thicknesses: 97mm → 182mm (OSB + EPS breakdown shown)
- 4 fit-out sections with cascading options:
  - **Exterior**: Roof Type, Cladding, Decking, Glazing & Doors
  - **Interior**: Insulation, Fitted Units, Electrical Installation
  - **Finishes**: Flooring, Window Treatment, Painting
  - **Utilities**: Guttering, Water Supply, Electrical Supply, Drainage
- Product codes follow DDL-x.xx.xx.xx format
- Save projects with SIP-prefixed job references

### Settings (gear icon, bottom-left)
- Ollama URL + model name
- Open-WebUI URL
- CadQuery Viewer URL
- JupyterLab URL
- Shared Designs folder path

## SIP Reference Data

**Standard panel**: 1222mm wide × 2440mm or 3050mm long

| Thickness | OSB each face | EPS core |
|-----------|--------------|----------|
| 97mm | 22mm | 75mm |
| 122mm | 22mm | 100mm |
| 142mm | 22mm | 120mm |
| 162mm | 22mm | 140mm |
| 182mm | 22mm | 160mm |

**Standard timber**: Redwood sections 25×50mm → 100×100mm
**Standard lengths**: 3600 / 4200 / 4800 / 5100 / 5400 / 6000mm

## Database Schema

- `projects` — saved design jobs (furniture + building)
- `settings` — connection settings for local Docker services

## Running codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

## DB migrations (development)

```bash
pnpm --filter @workspace/db run push
```
