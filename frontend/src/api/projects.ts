import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import type { Project } from "./types";

export interface ProjectInput {
  name: string;
  description: string;
  icon: string;
}

export function listProjects(): Promise<Project[]> {
  return apiGet<{ projects: Project[] }>("/api/projects").then((body) => body.projects);
}

export function createProject(input: ProjectInput): Promise<Project> {
  return apiPost<{ project: Project }>("/api/projects", input).then((body) => body.project);
}

export function updateProjectMetadata(projectId: string, input: ProjectInput): Promise<Project> {
  return apiPut<{ project: Project }>("/api/project/metadata", { projectId, ...input }).then((body) => body.project);
}

export function deleteProject(projectId: string): Promise<void> {
  return apiDelete(`/api/project?id=${encodeURIComponent(projectId)}`);
}
