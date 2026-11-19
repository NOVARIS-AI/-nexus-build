import { useCallback, useEffect, useState } from "react";
import { projectApi, type Project } from "../api";

type Props = { prompt: string; onLoadPrompt: (prompt: string) => void; onSelectProject: (project: Project) => void };

export default function ProjectManager({ prompt, onLoadPrompt, onSelectProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [health, items] = await Promise.all([projectApi.health(), projectApi.list()]);
      setConnected(health.ok && health.database === "bound");
      setProjects(items);
    } catch {
      setConnected(false);
      setMessage("Could not reach the project database. Try refreshing in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = async () => {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const title = prompt.trim().split(/\s+/).slice(0, 7).join(" ").slice(0, 58);
      const project = await projectApi.create({ name: title || "Untitled project", description: "Created in Nexus Build", prompt: prompt.trim(), scene_json: "{}" });
      onSelectProject(project);
      setMessage("Project saved to your Cloudflare database.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this project.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await projectApi.remove(id);
      setProjects(items => items.filter(item => item.id !== id));
      setMessage("Project deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete project.");
    }
  };

  return <section className="project-manager">
    <div className="project-manager-head">
      <div><b>My projects</b><small>Saved securely in your Nexus Build database</small></div>
      <span className={connected ? "db-state connected" : "db-state"}><i />{connected ? "DATABASE CONNECTED" : "DATABASE OFFLINE"}</span>
    </div>
    <div className="project-save-row">
      <span>{prompt.trim() ? "Your current idea is ready to save." : "Enter a game idea above to save your first project."}</span>
      <button className="build-btn" onClick={save} disabled={!prompt.trim() || busy || !connected}>{busy ? "Saving…" : "＋ Save project"}</button>
    </div>
    {message && <p className="project-message" role="status">{message}</p>}
    <div className="saved-projects">
      {loading ? <div className="project-empty">Connecting to your workspace…</div> :
        projects.length === 0 ? <div className="project-empty">No saved projects yet. Save your first game idea above.</div> :
        projects.map(project => <div className="saved-project" key={project.id}>
          <button className="saved-project-open" onClick={() => { onLoadPrompt(project.prompt); onSelectProject(project); }} title="Load this idea into the Game Director">
            <span className="saved-project-icon">◇</span>
            <span><b>{project.name}</b><small>{new Date(project.updated_at).toLocaleString()} · {project.status}</small></span>
          </button>
          <button className="saved-project-delete" onClick={() => void remove(project.id)} aria-label={`Delete ${project.name}`} title="Delete project">×</button>
        </div>)}
    </div>
  </section>;
}
