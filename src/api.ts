export type Project = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  status: "draft" | "planning" | "prototype" | "archived";
  scene_json: string;
  created_at: string;
  updated_at: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data as T;
}

export const projectApi = {
  health: () => request<{ ok: boolean; service: string; database: string }>("/api/health"),
  list: async () => (await request<{ projects: Project[] }>("/api/projects")).projects,
  create: async (input: { name: string; description?: string; prompt?: string; scene_json?: string }) =>
    (await request<{ project: Project }>("/api/projects", { method: "POST", body: JSON.stringify(input) })).project,
  update: async (id: string, input: { name?: string; description?: string; prompt?: string; status?: Project["status"]; scene_json?: string }) =>
    (await request<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) })).project,
  remove: (id: string) => request<{ deleted: boolean }>(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
