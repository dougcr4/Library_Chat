import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db/schema";
import {
  ListProjectsResponse,
  CreateProjectBody,
  GetProjectParams,
  DeleteProjectParams,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/projects", async (_req, res) => {
  try {
    const projects = await db.select().from(projectsTable).orderBy(desc(projectsTable.createdAt));
    const data = ListProjectsResponse.parse({ projects });
    res.json(data);
  } catch (err) {
    console.error("Error listing projects:", err);
    res.status(500).json({ error: "internal_error", message: "Failed to list projects" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const body = CreateProjectBody.parse(req.body);
    const id = randomUUID();

    const [project] = await db.insert(projectsTable).values({
      id,
      name: body.name,
      type: body.type,
      styleId: body.styleId ?? null,
      itemId: body.itemId ?? null,
      prompt: body.prompt,
      status: "queued",
    }).returning();

    res.status(201).json(project);
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(400).json({ error: "bad_request", message: String(err) });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const { id } = GetProjectParams.parse(req.params);
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));

    if (!project) {
      res.status(404).json({ error: "not_found", message: "Project not found" });
      return;
    }

    res.json(project);
  } catch (err) {
    console.error("Error getting project:", err);
    res.status(500).json({ error: "internal_error", message: "Failed to get project" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const { id } = DeleteProjectParams.parse(req.params);
    await db.delete(projectsTable).where(eq(projectsTable.id, id));
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "internal_error", message: "Failed to delete project" });
  }
});

export default router;
