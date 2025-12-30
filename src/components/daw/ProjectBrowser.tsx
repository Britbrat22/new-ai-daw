import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import { X, FolderOpen, Trash2, Clock, Music, Plus, Loader2, ArrowUpDown } from 'lucide-react';
import { listProjects, deleteProject } from '@/lib/projectService';

interface Project {
  id: string;
  name: string;
  updatedAt: Date;
}

interface ProjectBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
}

type SortKey = 'name' | 'updatedAt' | 'createdAt';
type SortDir = 'asc' | 'desc';

/* ------------------------------------------------------------------ */
/* --------------------------- Helpers ------------------------------ */
/* ------------------------------------------------------------------ */
const formatDate = (d: Date): string => {
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString();
};

/* ------------------------------------------------------------------ */
/* ------------------------- Browser  ------------------------------- */
/* ------------------------------------------------------------------ */
export const ProjectBrowser: React.FC<ProjectBrowserProps> = memo(
  ({ isOpen, onClose, onSelectProject, onNewProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [pendingDelete, setPendingDelete] = useState<string | null>(null);

    /* ------------------- data ------------------- */
    const load = useCallback(async () => {
      setIsLoading(true);
      const res = await listProjects();
      if (res.success) setProjects(res.projects ?? []);
      setIsLoading(false);
    }, []);

    useEffect(() => {
      if (isOpen) load();
    }, [isOpen, load]);

    /* auto-refresh when tab comes back */
    useEffect(() => {
      const onFocus = () => load();
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }, [load]);

    /* -------------- keyboard navigation ------------- */
    useEffect(() => {
      if (!isOpen) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    /* -------------- sort & filter ----------------- */
    const filtered = useMemo(() => {
      const filt = projects.filter((p) =>
        p.name.toLowerCase().includes(search.trim().toLowerCase())
      );
      return filt.sort((a, b) => {
        let va: any = a[sortKey];
        let vb: any = b[sortKey];
        if (sortKey === 'name') {
          va = va.toLowerCase();
          vb = vb.toLowerCase();
        } else {
          va = va.getTime();
          vb = vb.getTime();
        }
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }, [projects, search, sortKey, sortDir]);

    /* -------------- actions ----------------------- */
    const doDelete = useCallback(
      async (id: string) => {
        if (pendingDelete === id) {
          await deleteProject(id);
          setProjects((p) => p.filter((x) => x.id !== id));
          setPendingDelete(null);
        } else {
          setPendingDelete(id);
          setTimeout(() => setPendingDelete(null), 3_000); // auto-disarm
        }
      },
      [pendingDelete]
    );

    /* -------------- render ------------------------ */
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-[#2d2d2d] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#3a3a3a]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="text-lg font-semibold text-white">Your Projects</h2>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search + Sort */}
          <div className="px-4 pt-4 grid grid-cols-8 gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="col-span-5 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff]"
            />
            <button
              type="button"
              onClick={() =>
                setSortDir((d) => (sortKey === 'updatedAt' && d === 'desc' ? 'asc' : 'desc'))
              }
              className="col-span-3 flex items-center justify-center gap-2 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-gray-300 hover:border-[#00d4ff] transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden sm:inline">{sortKey === 'updatedAt' ? 'Last Modified' : sortKey}</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* New project card */}
            <button
              type="button"
              onClick={onNewProject}
              className="w-full mb-4 p-4 rounded-xl border-2 border-dashed border-[#3a3a3a] hover:border-[#00d4ff] text-gray-400 hover:text-[#00d4ff] transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">New Project</span>
            </button>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#00d4ff] animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">{search ? 'No match' : 'No projects yet'}</p>
                <p className="text-gray-500 text-sm">{search ? 'Try another query' : 'Create your first project to get started'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    tabIndex={0}
                    onClick={() => onSelectProject(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectProject(p.id);
                      }
                      if (e.key === 'Delete') doDelete(p.id);
                    }}
                    className="w-full p-4 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#b24bf3]/20 to-[#00d4ff]/20 flex items-center justify-center">
                        <Music className="w-5 h-5 text-[#b24bf3]" />
                      </div>
                      <div className="text-left">
                        <div className="text-white font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(p.updatedAt)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        doDelete(p.id);
                      }}
                      className={`opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-2 ${pendingDelete === p.id ? 'text-red-400' : ''}`}
                    >
                      {pendingDelete === p.id ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#3a3a3a] bg-[#252525]">
            <p className="text-xs text-gray-500 text-center">Projects are automatically saved to the cloud</p>
          </div>
        </div>
      </div>
    );
  }
);
ProjectBrowser.displayName = 'ProjectBrowser';
