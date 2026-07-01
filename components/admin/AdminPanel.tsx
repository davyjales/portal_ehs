"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PILLARS, PILLAR_CONFIG, formatDate } from "@/lib/ehs";
import {
  DEFAULT_THEME_BACKGROUNDS,
  type ThemeBackgrounds,
} from "@/lib/theme-settings";

type User = { id: string; prontuario: string; name: string; role: string };
type EHSContent = {
  id: string;
  pillar: string;
  title: string;
  summary: string;
  body: string;
  order: number;
  isPublic: boolean;
  images?: string;
  videos?: string;
  coverIndex?: number;
};
type Pendencia = { id: string; title: string; user: { name: string; prontuario: string }; status: string; dueDate: string | null };
type Alerta = { id: string; title: string; type: string; user: { name: string } | null };
type Challenge = { id: string; title: string; points: number; active: boolean; weekStart: string };

type AdminSection = "ehs" | "themes" | "pendencias" | "alertas" | "challenges" | "users";

const EMPTY_EHS_FORM = {
  pillar: "ENVIRONMENT",
  title: "",
  body: "",
  order: 0,
  images: [] as string[],
  videos: [] as string[],
  coverIndex: 0,
};

function parseEhsImages(raw?: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function parseEhsVideos(raw?: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}
export function AdminPanel() {
  const router = useRouter();
  const [section, setSection] = useState<AdminSection>("ehs");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ehsItems, setEhsItems] = useState<EHSContent[]>([]);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [ehsForm, setEhsForm] = useState({ ...EMPTY_EHS_FORM, images: [] as string[], videos: [] as string[] });
  const [editingEhsId, setEditingEhsId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [themeForm, setThemeForm] = useState<ThemeBackgrounds>(DEFAULT_THEME_BACKGROUNDS);
  const [uploadingThemeKey, setUploadingThemeKey] = useState<string | null>(null);
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [pendForm, setPendForm] = useState({ prontuario: "", title: "", description: "", dueDate: "" });
  const [alertForm, setAlertForm] = useState({ prontuario: "", title: "", message: "", type: "INFO", broadcast: false });
  const [challengeForm, setChallengeForm] = useState({ title: "", description: "", points: 50 });
  const [userForm, setUserForm] = useState({
    prontuario: "",
    name: "",
    role: "EMPLOYEE" as "EMPLOYEE" | "ADMIN",
    password: "",
  });
  const [userSearch, setUserSearch] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    prontuario: "",
    name: "",
    role: "EMPLOYEE" as "EMPLOYEE" | "ADMIN",
    password: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/data");
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar dados.");
      const data = await res.json();
      setEhsItems(data.ehs);
      setPendencias(data.pendencias);
      setAlertas(data.alertas);
      setChallenges(data.challenges);
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const loadThemeSettings = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/theme");
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Erro ao carregar fundos dos temas.");
      const data: ThemeBackgrounds = await res.json();
      setThemeForm(data);
      setThemeLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
    }
  }, [router]);

  useEffect(() => {
    if (section === "themes" && !themeLoaded) {
      loadThemeSettings();
    }
  }, [section, themeLoaded, loadThemeSettings]);

  async function uploadThemeBackground(
    key: keyof ThemeBackgrounds,
    file: File
  ) {
    setUploadingThemeKey(key);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/theme/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload.");
      setThemeForm((prev) => ({ ...prev, [key]: data.path }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setUploadingThemeKey(null);
    }
  }

  async function apiPost(path: string, body: unknown) {
    setMessage(null);
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro na operação.");
    setMessage(data.message || "Salvo com sucesso!");
    load();
  }

  async function apiPut(path: string, body: unknown) {
    setMessage(null);
    setError(null);
    const res = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro na operação.");
    setMessage(data.message || "Atualizado com sucesso!");
    load();
  }

  const emptyEhsForm = () => ({ ...EMPTY_EHS_FORM, images: [] as string[], videos: [] as string[] });

  function startEditEhs(item: EHSContent) {
    setEditingEhsId(item.id);
    setEhsForm({
      pillar: item.pillar,
      title: item.title,
      body: item.body,
      order: item.order,
      images: parseEhsImages(item.images),
      videos: parseEhsVideos(item.videos),
      coverIndex: item.coverIndex ?? 0,
    });
    setError(null);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditEhs() {
    setEditingEhsId(null);
    setEhsForm(emptyEhsForm());
    setError(null);
  }

  async function apiDelete(path: string) {
    if (!confirm("Confirmar exclusão?")) return;
    setMessage(null);
    setError(null);
    const id = new URL(path, "http://local").searchParams.get("id");
    const res = await fetch(path, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao excluir.");
    if (id && id === editingEhsId) cancelEditEhs();
    setMessage("Excluído com sucesso.");
    load();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const sections: { id: AdminSection; label: string }[] = [
    { id: "ehs", label: "Informativos E/H/S" },
    { id: "themes", label: "Fundos E/H/S" },
    { id: "pendencias", label: "Pendências" },
    { id: "alertas", label: "Alertas" },
    { id: "challenges", label: "Desafios 1UP" },
    { id: "users", label: "Usuários" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-sm text-slate-500 uppercase">Administração EHS</p>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800">Painel CMS</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/" className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
              Informativo público
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm px-3 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="flex w-full border-t border-slate-100">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`flex-1 min-w-0 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors text-center ${
                section === s.id ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="w-full px-4 py-6">
        {loading && <p className="text-slate-500 animate-pulse mb-4">Carregando...</p>}
        {message && <p className="text-green-700 bg-green-50 px-4 py-2 rounded-lg mb-4 text-sm">{message}</p>}
        {error && <p className="text-red-600 bg-red-50 px-4 py-2 rounded-lg mb-4 text-sm">{error}</p>}

        {section === "ehs" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  if (editingEhsId) {
                    await apiPut("/api/admin/ehs", { id: editingEhsId, ...ehsForm });
                    setEditingEhsId(null);
                  } else {
                    await apiPost("/api/admin/ehs", ehsForm);
                  }
                  setEhsForm(emptyEhsForm());
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erro");
                }
              }}
              className="bg-white rounded-xl p-4 shadow border space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">
                  {editingEhsId ? "Editar informativo" : "Novo informativo"}
                </h2>
                {editingEhsId && (
                  <button
                    type="button"
                    onClick={cancelEditEhs}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
              <select
                value={ehsForm.pillar}
                onChange={(e) => setEhsForm({ ...ehsForm, pillar: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
              >
                {PILLARS.map((p) => (
                  <option key={p} value={p}>
                    {PILLAR_CONFIG[p].label}
                  </option>
                ))}
              </select>
              <input
                placeholder="Título"
                value={ehsForm.title}
                onChange={(e) => setEhsForm({ ...ehsForm, title: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border"
              />
              <textarea
                placeholder="Informação completa"
                value={ehsForm.body}
                onChange={(e) => setEhsForm({ ...ehsForm, body: e.target.value })}
                required
                rows={6}
                className="w-full px-3 py-2 rounded-lg border"
              />
              <p className="text-xs text-slate-500 -mt-1">
                O resumo exibido na tela pública é gerado automaticamente a partir dos primeiros caracteres deste texto.
              </p>
              <input
                type="number"
                placeholder="Ordem"
                value={ehsForm.order}
                onChange={(e) => setEhsForm({ ...ehsForm, order: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border"
              />

              <div className="space-y-2 pt-1">
                <p className="text-sm font-medium text-slate-700">Fotos (opcional)</p>
                <p className="text-xs text-slate-500">
                  Adicione uma ou várias fotos. Marque qual será a capa do post.
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={uploading}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) return;
                    setUploading(true);
                    setError(null);
                    try {
                      const uploaded: string[] = [];
                      for (const file of files) {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/admin/ehs/upload", {
                          method: "POST",
                          body: fd,
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Erro no upload.");
                        uploaded.push(data.path);
                      }
                      setEhsForm((prev) => ({
                        ...prev,
                        images: [...prev.images, ...uploaded],
                      }));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Erro no upload.");
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                  className="w-full text-sm"
                />
                {uploading && <p className="text-xs text-slate-500 animate-pulse">Enviando fotos...</p>}
                {ehsForm.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ehsForm.images.map((img, i) => (
                      <div key={img} className="relative rounded-lg border overflow-hidden bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-full aspect-square object-cover" />
                        <div className="p-2 flex items-center justify-between gap-2 text-xs">
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="cover"
                              checked={ehsForm.coverIndex === i}
                              onChange={() => setEhsForm({ ...ehsForm, coverIndex: i })}
                            />
                            Capa
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setEhsForm((prev) => {
                                const nextImages = prev.images.filter((_, idx) => idx !== i);
                                const mediaCount = nextImages.length + prev.videos.length;
                                const removedIndex = i;
                                let nextCover = prev.coverIndex;
                                if (removedIndex < prev.coverIndex) nextCover -= 1;
                                else if (removedIndex === prev.coverIndex) nextCover = 0;
                                return {
                                  ...prev,
                                  images: nextImages,
                                  coverIndex: Math.max(0, Math.min(nextCover, Math.max(0, mediaCount - 1))),
                                };
                              })
                            }
                            className="text-red-600 hover:underline"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-sm font-medium text-slate-700">Vídeos (opcional)</p>
                <p className="text-xs text-slate-500">
                  Adicione vídeos MP4, WebM ou MOV. Eles aparecem no post junto com as fotos.
                </p>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  multiple
                  disabled={uploadingVideo}
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) return;
                    setUploadingVideo(true);
                    setError(null);
                    try {
                      const uploaded: string[] = [];
                      for (const file of files) {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/admin/ehs/upload-video", {
                          method: "POST",
                          body: fd,
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Erro no upload.");
                        uploaded.push(data.path);
                      }
                      setEhsForm((prev) => ({
                        ...prev,
                        videos: [...prev.videos, ...uploaded],
                      }));
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Erro no upload.");
                    } finally {
                      setUploadingVideo(false);
                      e.target.value = "";
                    }
                  }}
                  className="w-full text-sm"
                />
                {uploadingVideo && <p className="text-xs text-slate-500 animate-pulse">Enviando vídeos...</p>}
                {ehsForm.videos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ehsForm.videos.map((video, vi) => {
                      const mediaIndex = ehsForm.images.length + vi;
                      return (
                        <div key={video} className="relative rounded-lg border overflow-hidden bg-slate-50">
                          <video src={video} className="w-full aspect-square object-cover bg-black" controls muted />
                          <div className="p-2 flex items-center justify-between gap-2 text-xs">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name="cover"
                                checked={ehsForm.coverIndex === mediaIndex}
                                onChange={() => setEhsForm({ ...ehsForm, coverIndex: mediaIndex })}
                              />
                              Capa
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setEhsForm((prev) => {
                                  const nextVideos = prev.videos.filter((_, idx) => idx !== vi);
                                  const mediaCount = prev.images.length + nextVideos.length;
                                  const removedIndex = prev.images.length + vi;
                                  let nextCover = prev.coverIndex;
                                  if (removedIndex < prev.coverIndex) nextCover -= 1;
                                  else if (removedIndex === prev.coverIndex) nextCover = 0;
                                  return {
                                    ...prev,
                                    videos: nextVideos,
                                    coverIndex: Math.max(0, Math.min(nextCover, Math.max(0, mediaCount - 1))),
                                  };
                                })
                              }
                              className="text-red-600 hover:underline"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={uploading || uploadingVideo}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {editingEhsId ? "Salvar alterações" : "Criar informativo"}
              </button>
            </form>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3">Âmbito</th>
                    <th className="text-left p-3">Título</th>
                    <th className="text-left p-3">Mídia</th>
                    <th className="text-left p-3">Ordem</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {ehsItems.map((item) => {
                    const photoCount = parseEhsImages(item.images).length;
                    const videoCount = parseEhsVideos(item.videos).length;
                    const mediaCount = photoCount + videoCount;
                    const mediaLabel =
                      mediaCount === 0
                        ? "—"
                        : [
                            photoCount > 0 ? `${photoCount} foto(s)` : null,
                            videoCount > 0 ? `${videoCount} vídeo(s)` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ");
                    return (
                      <tr
                        key={item.id}
                        className={`border-t ${editingEhsId === item.id ? "bg-amber-50" : ""}`}
                      >
                        <td className="p-3">
                          {PILLAR_CONFIG[item.pillar as keyof typeof PILLAR_CONFIG]?.label}
                        </td>
                        <td className="p-3">{item.title}</td>
                        <td className="p-3">{mediaLabel}</td>
                        <td className="p-3">{item.order}</td>
                        <td className="p-3 text-right space-x-3">
                          <button
                            type="button"
                            onClick={() => startEditEhs(item)}
                            className="text-slate-700 text-xs hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => apiDelete(`/api/admin/ehs?id=${item.id}`).catch((e) => setError(e.message))}
                            className="text-red-600 text-xs hover:underline"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === "themes" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPut("/api/admin/theme", themeForm);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erro");
                }
              }}
              className="bg-white rounded-xl p-4 shadow border space-y-4"
            >
              <div>
                <h2 className="font-semibold text-slate-800">Fundos dos temas informativos</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Altere as imagens de fundo exibidas na tela pública ao selecionar cada âmbito E/H/S
                  e na tela inicial (antes da seleção).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    { key: "team" as const, label: "Tela inicial (equipe EHS)" },
                    ...PILLARS.map((pillar) => ({
                      key: pillar,
                      label: PILLAR_CONFIG[pillar].label,
                    })),
                  ] as { key: keyof ThemeBackgrounds; label: string }[]
                ).map(({ key, label }) => (
                  <div key={key} className="rounded-lg border overflow-hidden bg-slate-50">
                    <div
                      className="aspect-video bg-cover bg-center bg-slate-200"
                      style={{ backgroundImage: `url(${themeForm[key]})` }}
                    />
                    <div className="p-3 space-y-2">
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={uploadingThemeKey === key}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await uploadThemeBackground(key, file);
                          e.target.value = "";
                        }}
                        className="w-full text-xs"
                      />
                      {uploadingThemeKey === key && (
                        <p className="text-xs text-slate-500 animate-pulse">Enviando...</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!!uploadingThemeKey}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Salvar fundos
                </button>
                <button
                  type="button"
                  disabled={!!uploadingThemeKey}
                  onClick={async () => {
                    if (!confirm("Restaurar as imagens de fundo padrão?")) return;
                    setMessage(null);
                    setError(null);
                    try {
                      const res = await fetch("/api/admin/theme", { method: "POST" });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Erro ao restaurar.");
                      setThemeForm(data.backgrounds ?? DEFAULT_THEME_BACKGROUNDS);
                      setMessage(data.message || "Fundos restaurados.");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Erro");
                    }
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Restaurar padrão
                </button>
              </div>
            </form>
          </div>
        )}

        {section === "pendencias" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost("/api/admin/pendencias", pendForm);
                  setPendForm({ prontuario: "", title: "", description: "", dueDate: "" });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erro");
                }
              }}
              className="bg-white rounded-xl p-4 shadow border space-y-3"
            >
              <h2 className="font-semibold">Nova pendência</h2>
              <input
                placeholder="Prontuário do funcionário"
                value={pendForm.prontuario}
                onChange={(e) => setPendForm({ ...pendForm, prontuario: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border"
              />
              <input
                placeholder="Título"
                value={pendForm.title}
                onChange={(e) => setPendForm({ ...pendForm, title: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border"
              />
              <textarea
                placeholder="Descrição"
                value={pendForm.description}
                onChange={(e) => setPendForm({ ...pendForm, description: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 rounded-lg border"
              />
              <input
                type="date"
                value={pendForm.dueDate}
                onChange={(e) => setPendForm({ ...pendForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
              />
              <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
                Criar pendência
              </button>
            </form>

            <div className="space-y-2">
              {pendencias.map((p) => (
                <div key={p.id} className="bg-white rounded-lg p-3 border text-sm flex justify-between">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-slate-500">
                      {p.user.name} ({p.user.prontuario}) · Prazo: {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => apiDelete(`/api/admin/pendencias?id=${p.id}`).catch((e) => setError(e.message))}
                    className="text-red-600 text-xs"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "alertas" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost("/api/admin/alertas", alertForm);
                  setAlertForm({ prontuario: "", title: "", message: "", type: "INFO", broadcast: false });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erro");
                }
              }}
              className="bg-white rounded-xl p-4 shadow border space-y-3"
            >
              <h2 className="font-semibold">Novo alerta</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alertForm.broadcast}
                  onChange={(e) => setAlertForm({ ...alertForm, broadcast: e.target.checked })}
                />
                Broadcast (todos os funcionários)
              </label>
              {!alertForm.broadcast && (
                <input
                  placeholder="Prontuário"
                  value={alertForm.prontuario}
                  onChange={(e) => setAlertForm({ ...alertForm, prontuario: e.target.value })}
                  required={!alertForm.broadcast}
                  className="w-full px-3 py-2 rounded-lg border"
                />
              )}
              <input
                placeholder="Título"
                value={alertForm.title}
                onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border"
              />
              <textarea
                placeholder="Mensagem"
                value={alertForm.message}
                onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 rounded-lg border"
              />
              <select
                value={alertForm.type}
                onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
              >
                <option value="INFO">Informativo</option>
                <option value="WARNING">Atenção</option>
                <option value="URGENT">Urgente</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
                Criar alerta
              </button>
            </form>

            <div className="space-y-2">
              {alertas.map((a) => (
                <div key={a.id} className="bg-white rounded-lg p-3 border text-sm flex justify-between">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-slate-500">
                      {a.user ? `${a.user.name}` : "Broadcast"} · {a.type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => apiDelete(`/api/admin/alertas?id=${a.id}`).catch((e) => setError(e.message))}
                    className="text-red-600 text-xs"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "challenges" && (
          <div className="space-y-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost("/api/admin/challenges", challengeForm);
                  setChallengeForm({ title: "", description: "", points: 50 });
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Erro");
                }
              }}
              className="bg-white rounded-xl p-4 shadow border space-y-3"
            >
              <h2 className="font-semibold">Novo desafio 1UP</h2>
              <input
                placeholder="Título"
                value={challengeForm.title}
                onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg border"
              />
              <textarea
                placeholder="Descrição"
                value={challengeForm.description}
                onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                required
                rows={2}
                className="w-full px-3 py-2 rounded-lg border"
              />
              <input
                type="number"
                placeholder="Pontos"
                value={challengeForm.points}
                onChange={(e) => setChallengeForm({ ...challengeForm, points: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border"
              />
              <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
                Criar desafio (desativa anteriores)
              </button>
            </form>

            <div className="space-y-2">
              {challenges.map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-3 border text-sm">
                  <p className="font-medium">
                    {c.title} {c.active && <span className="text-green-600 text-xs">(ativo)</span>}
                  </p>
                  <p className="text-slate-500">{c.points} pts · Semana: {formatDate(c.weekStart)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "users" && (() => {
          const query = userSearch.trim().toLowerCase();
          const filteredUsers = query
            ? users.filter(
                (u) =>
                  u.name.toLowerCase().includes(query) ||
                  u.prontuario.toLowerCase().includes(query)
              )
            : users;

          function startEditUser(user: User) {
            setEditingUserId(user.id);
            setEditUserForm({
              prontuario: user.prontuario,
              name: user.name,
              role: user.role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
              password: "",
            });
            setError(null);
            setMessage(null);
          }

          function cancelEditUser() {
            setEditingUserId(null);
            setEditUserForm({ prontuario: "", name: "", role: "EMPLOYEE", password: "" });
          }

          return (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await apiPost("/api/admin/users", userForm);
                    setUserForm({ prontuario: "", name: "", role: "EMPLOYEE", password: "" });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Erro");
                  }
                }}
                className="bg-white rounded-xl p-4 shadow border space-y-3"
              >
                <h2 className="font-semibold">Novo usuário</h2>
                <input
                  placeholder="Prontuário"
                  value={userForm.prontuario}
                  onChange={(e) => setUserForm({ ...userForm, prontuario: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border"
                />
                <input
                  placeholder="Nome"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border"
                />
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({
                      ...userForm,
                      role: e.target.value as "EMPLOYEE" | "ADMIN",
                      password: e.target.value === "EMPLOYEE" ? "" : userForm.password,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border"
                >
                  <option value="EMPLOYEE">Funcionário</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {userForm.role === "ADMIN" && (
                  <input
                    type="password"
                    placeholder="Senha inicial (obrigatória para admin)"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border"
                  />
                )}
                <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
                  Cadastrar usuário
                </button>
              </form>

              {editingUserId && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const body: Record<string, string> = {
                        id: editingUserId,
                        prontuario: editUserForm.prontuario,
                        name: editUserForm.name,
                        role: editUserForm.role,
                      };
                      if (editUserForm.password) {
                        body.password = editUserForm.password;
                      }
                      await apiPut("/api/admin/users", body);
                      cancelEditUser();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Erro");
                    }
                  }}
                  className="bg-amber-50 rounded-xl p-4 shadow border border-amber-200 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Editar usuário</h2>
                    <button
                      type="button"
                      onClick={cancelEditUser}
                      className="text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancelar
                    </button>
                  </div>
                  <input
                    placeholder="Prontuário"
                    value={editUserForm.prontuario}
                    onChange={(e) => setEditUserForm({ ...editUserForm, prontuario: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-white"
                  />
                  <input
                    placeholder="Nome"
                    value={editUserForm.name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border bg-white"
                  />
                  <select
                    value={editUserForm.role}
                    onChange={(e) =>
                      setEditUserForm({
                        ...editUserForm,
                        role: e.target.value as "EMPLOYEE" | "ADMIN",
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border bg-white"
                  >
                    <option value="EMPLOYEE">Funcionário</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                  {editUserForm.role === "ADMIN" && (
                    <>
                      <input
                        type="password"
                        placeholder="Nova senha (deixe em branco para manter a atual)"
                        value={editUserForm.password}
                        onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border bg-white"
                      />
                      <p className="text-xs text-slate-500 -mt-1">
                        Preencha para alterar a senha deste administrador.
                      </p>
                    </>
                  )}
                  <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
                    Salvar alterações
                  </button>
                </form>
              )}

              <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="p-3 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-slate-600">
                    {filteredUsers.length} de {users.length} usuário(s)
                  </p>
                  <input
                    type="search"
                    placeholder="Buscar por nome ou prontuário..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full sm:w-72 px-3 py-2 rounded-lg border text-sm"
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3">Prontuário</th>
                        <th className="text-left p-3">Nome</th>
                        <th className="text-left p-3">Perfil</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500">
                            Nenhum usuário encontrado.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr
                            key={u.id}
                            className={`border-t ${editingUserId === u.id ? "bg-amber-50" : ""}`}
                          >
                            <td className="p-3 font-mono">{u.prontuario}</td>
                            <td className="p-3">{u.name}</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                  u.role === "ADMIN"
                                    ? "bg-violet-100 text-violet-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {u.role === "ADMIN" ? "Admin" : "Funcionário"}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEditUser(u)}
                                className="text-slate-700 text-xs hover:underline"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  apiDelete(`/api/admin/users?id=${u.id}`).catch((e) => setError(e.message))
                                }
                                className="text-red-600 text-xs hover:underline"
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
