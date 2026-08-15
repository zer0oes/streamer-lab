import { defineStore } from "pinia";
import { ref } from "vue";
import { createProject, deleteProject, listProjects, updateProjectMetadata, type ProjectInput } from "../api/projects";
import type { Project } from "../api/types";

export const useProjectsStore = defineStore("projects", () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProjects(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      projects.value = await listProjects();
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    } finally {
      loading.value = false;
    }
  }

  async function create(input: ProjectInput): Promise<Project> {
    const project = await createProject(input);
    projects.value = [...projects.value, project];
    return project;
  }

  async function update(projectId: string, input: ProjectInput): Promise<Project> {
    const project = await updateProjectMetadata(projectId, input);
    projects.value = projects.value.map((entry) => (entry.id === project.id ? project : entry));
    return project;
  }

  async function remove(projectId: string): Promise<void> {
    await deleteProject(projectId);
    projects.value = projects.value.filter((entry) => entry.id !== projectId);
  }

  function nameFor(projectId: string): string {
    return projects.value.find((entry) => entry.id === projectId)?.name ?? "";
  }

  return { projects, loading, error, fetchProjects, create, update, remove, nameFor };
});
