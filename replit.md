# 3D Designer — Garden Furniture & Garden Buildings

## Overview

A standalone local 3D design application for garden furniture and SIP (Structural Insulated Panel) garden buildings. Connects to a local Ollama/Open-WebUI AI backend to generate CadQuery 3D model scripts, rendered by a local CadQuery Server (Docker).

## Architecture

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/        # Express 5 API (port 8080)
│   └── 3d-designer/       # React + Vite frontend (root /)
├── lib/
│   ├── api-spec/          # OpenAPI spec + Orval codegen
│   ├── api-client-react/  # Generated React Query hooks
│   ├── api-zod/           # Generated Zod validation schemas
│   └── db/                # Drizzle ORM — PostgreSQL
└── start-local.sh         # Ubuntu startup script (chmod +x then ./start-local.sh)
```

## Stack

- **Monorepo**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4)
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)

## Local Docker Backend (user-managed, not in repo)

Docker containers on Ubuntu managed separately via docker-compose:

| Service | Port | Purpose |
|---|---|---|
| Ollama | 11434 | AI model direct (e.g. qwen2.5:14b) |
| Open-WebUI | 3001 | Web UI with joshuaokolo-cad-designer pipeline |
| CadQuery Server | 5000 | Renders CadQuery Python scripts |
| JupyterLab | 8888 | Notebook viewer (token: douglas-3d) |

Shared designs folder: `/home/douglas/DockerProjects/LLM-3D/shared_designs`
Local project path: `/home/douglas/Desktop/3D-Design/Library-Chat`

## LLM Routing (artifacts/api-server/src/lib/llm-client.ts)

- **API key set in Settings** → calls Open-WebUI using `openWebUiModel`
- **No API key** → calls Ollama directly using `ollamaModel`
- 401/403 from Open-WebUI throws a clear error — does NOT fall back to Ollama (model names are incompatible)
- Open-WebUI API key: Admin → Users → enable API Key Auth; then avatar → Account → API Keys → Create

### Model naming (three distinct things)
| Name | Value | What it is |
|------|-------|-----------|
| Ollama model file | `joshuaokolo/C3Dv0:latest` | Actual LLM weights stored in Ollama (~6.5GB) |
| Open-WebUI workspace name | `Joshuaokolo CAD Designer` | Display name in the Open-WebUI UI |
| Open-WebUI API ID | `joshuaokolo-cad-designer` | ID used in API calls — goes in Settings → Open-WebUI Model Name |

## Shell Generation — Pre-computed (NO LLM)

The basic building shell geometry is computed entirely with maths in the API server:
- Wall heights (frontH, backH), roof slope, side wall slope-cut
- Window cuts (975mm wide × 1940mm tall, sill at 300mm)
- Decking slab, floor slab
- LLM is only invoked for fit-out geometry items

## Features

### Garden Furniture Mode
- 10 design styles (Cotswold, Rustic, Contemporary, etc.)
- 12 furniture items (Table, Chair, Bench, etc.) grouped by category
- AI prompt → LLM generates CadQuery Python script
- Save projects with GF-prefixed job references

### Garden Buildings Mode (SIPs) — Stage 1 Complete
- 3 shell designs: Alpha (lean-to), Beta (LHS window), Charlie (LHS+RHS windows)
- 4 sizes with pre-computed airtight shell geometry:

| Size | Outer W × L | Front H | Back H | Roof Drop |
|------|------------|---------|--------|-----------|
| Small | 3622 × 3000 | 2495mm | 2345mm | 150mm |
| Medium | 4844 × 4200 | 2495mm | 2345mm | 150mm |
| Large | 6066 × 6000 | 2495mm | 2345mm | 150mm |
| XL | 7288 × 7200 | 2495mm | 2345mm | 150mm |

- SIP wall thickness: 144mm (2× 22mm OSB + 100mm EPS)
- Floor: 150mm slab
- Roof: 144mm SIP panel, rotated by -slopeAngleDeg
- Side walls: slope-cut by -slopeAngleDeg (same sign as roof — flush junction)
- **CRITICAL FIX**: sw_cut uses `-slopeAngleDeg` (same as roof panel). Using `+slopeAngleDeg` inverts the slope — walls would taper the wrong way.

- SIP schedule tab shows panel count by wall/roof/floor
- 5 SIP panel thicknesses: 97mm → 182mm (OSB + EPS breakdown shown)
- 4 fit-out sections with cascading options (Stage 2 — pending):
  - **Exterior**: Roof Type, Cladding, Decking, Glazing & Doors
  - **Interior**: Insulation, Fitted Units, Electrical Installation
  - **Finishes**: Flooring, Window Treatment, Painting
  - **Utilities**: Guttering, Water Supply, Electrical Supply, Drainage

### Fit-out Split (Stage 2 plan)
- **Spec/BOM only** (no geometry): roof membrane, cladding, insulation, finishes, utilities
- **3D geometry via LLM**: fitted units (workbench, shelving, storage), glazing bars, veranda decking extension

### Settings (gear icon, bottom-left)
Split into two clear sections:

**Open-WebUI (when API key is set)**
- Open-WebUI URL (default: http://localhost:3001)
- Open-WebUI Model Name (default: joshuaokolo-cad-designer)
- Open-WebUI API Key (sk-…)

**Ollama Direct (when no API key)**
- Ollama URL (default: http://localhost:11434)
- Ollama Model Name (default: qwen2.5:14b)

**Docker Services**
- CadQuery Viewer URL (default: http://localhost:5000)
- JupyterLab URL (default: http://localhost:8888)
- Shared Designs Folder Path

## Database Schema

- `projects` — saved design jobs (furniture + building)
- `settings` — connection settings; includes `open_web_ui_model` column (added with db:push)

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

## Git Workflow

```bash
# Replit → GitHub
git push github master

# Ubuntu (after Replit push)
git pull github master
chmod +x start-local.sh   # only needed once after pull resets permissions
./start-local.sh           # kills ports 5173+8080, runs db:push, starts API+Vite
```

`start-local.sh` manages ONLY ports 5173 (Vite) and 8080 (API). Docker services (Ollama/Open-WebUI/CadQuery/JupyterLab) must already be running.

## Running codegen

```bash
pnpm --filter @workspace/api-spec run codegen
```

## DB migrations (development)

```bash
pnpm --filter @workspace/db run push
```
