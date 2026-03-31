"use client";

import { useState } from "react";
import { API_URL } from "@/lib/config";
import { getAuthHeaders, getToken } from "@/lib/authClient";
import { sanitizeInvitationHtml } from "@/lib/invitationSanitizer";

export function CreateEventForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("mariage");
  const [dateTime, setDateTime] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [program, setProgram] = useState("");
  const [programItems, setProgramItems] = useState<
    Array<{ timeLabel: string; title: string; description?: string }>
  >([]);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tableCount, setTableCount] = useState(10);
  const [capacityPerTable, setCapacityPerTable] = useState(8);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      setMessage("Connexion requise. Connectez-vous d'abord dans l'espace organisateur.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const cleanedInvitation = sanitizeInvitationHtml(invitationMessage);
      const res = await fetch(`${API_URL}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          name,
          type,
          dateTime,
          location,
          address,
          details,
          program,
          programItems,
          invitationMessage: cleanedInvitation,
          coverImageUrl,
          tableCount,
          capacityPerTable
        })
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { message?: string } | null;

        if (res.status === 401) {
          setMessage("Session expiree ou non connectee. Reconnectez-vous puis reessayez.");
          return;
        }

        const detail = payload?.message ? ` ${payload.message}` : "";
        setMessage(`Creation impossible (HTTP ${res.status}).${detail}`);
        return;
      }

      setMessage("Evenement cree avec succes.");
      setName("");
      setLocation("");
      setAddress("");
      setDetails("");
      setProgram("");
      setProgramItems([]);
      setInvitationMessage("");
      setCoverImageUrl("");
      setDateTime("");
    } catch (err) {
      console.error(err);
      setMessage("Impossible de joindre le backend. Verifiez que l'API tourne.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-sm">
      <div>
        <label className="block text-small mb-1">Nom de l'evenement</label>
        <input
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Mariage Michel et X"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-small mb-1">Type</label>
          <select
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="mariage">Mariage</option>
            <option value="anniversaire">Anniversaire</option>
            <option value="gala">Gala</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
        <div>
          <label className="block text-small mb-1">Date et heure</label>
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            value={dateTime}
            onChange={e => setDateTime(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-small mb-1">Lieu</label>
        <input
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          value={location}
          onChange={e => setLocation(e.target.value)}
          required
          placeholder="Salle, ville..."
        />
      </div>
      <div>
        <label className="block text-small mb-1">Adresse complete (optionnel)</label>
        <input
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-small mb-1">URL photo activite (optionnel)</label>
        <input
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          value={coverImageUrl}
          onChange={e => setCoverImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="block text-small mb-1">Message d'invitation (optionnel)</label>
        <textarea
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          rows={3}
          value={invitationMessage}
          onChange={e => setInvitationMessage(e.target.value)}
        />
        {invitationMessage.trim() ? (
          <div className="mt-2 rounded-xl border border-primary/10 bg-background/60 px-3 py-2 text-xs text-text/70">
            <span className="font-semibold">Apercu nettoye :</span>{" "}
            <span dangerouslySetInnerHTML={{ __html: sanitizeInvitationHtml(invitationMessage) }} />
          </div>
        ) : null}
      </div>
      <div>
        <label className="block text-small mb-1">Details activite (optionnel)</label>
        <textarea
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          rows={4}
          value={details}
          onChange={e => setDetails(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-small mb-1">Programme / deroulement (optionnel)</label>
        <textarea
          className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
          rows={4}
          value={program}
          onChange={e => setProgram(e.target.value)}
          placeholder="Ex: 16h Accueil, 17h Ceremonie, 19h Soiree dansante..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-small">Programme detaille (par horaires)</label>
          <button
            type="button"
            className="btn-ghost px-3 py-1 text-[11px]"
            onClick={() => setProgramItems(prev => [...prev, { timeLabel: "16:00", title: "", description: "" }])}
          >
            Ajouter une ligne
          </button>
        </div>
        {programItems.length === 0 ? (
          <p className="text-small text-textMuted">
            Ajoutez des lignes si vous souhaitez afficher un programme structure.
          </p>
        ) : (
          <div className="space-y-2">
            {programItems.map((item, index) => (
              <div key={`${index}`} className="grid grid-cols-1 md:grid-cols-[110px,1fr,auto] gap-2">
                <input
                  className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                  value={item.timeLabel}
                  onChange={e =>
                    setProgramItems(prev =>
                      prev.map((row, i) => (i === index ? { ...row, timeLabel: e.target.value } : row))
                    )
                  }
                  placeholder="16:00"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                    value={item.title}
                    onChange={e =>
                      setProgramItems(prev =>
                        prev.map((row, i) => (i === index ? { ...row, title: e.target.value } : row))
                      )
                    }
                    placeholder="Ceremonie"
                  />
                  <input
                    className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
                    value={item.description ?? ""}
                    onChange={e =>
                      setProgramItems(prev =>
                        prev.map((row, i) => (i === index ? { ...row, description: e.target.value } : row))
                      )
                    }
                    placeholder="Salle principale"
                  />
                </div>
                <button
                  type="button"
                  className="btn-ghost px-3 py-1 text-[11px]"
                  onClick={() => setProgramItems(prev => prev.filter((_, i) => i !== index))}
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-small mb-1">Nombre de tables</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            value={tableCount}
            onChange={e => setTableCount(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-small mb-1">Capacite par table</label>
          <input
            type="number"
            min={1}
            className="w-full rounded-xl border border-primary/20 bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-accent/60"
            value={capacityPerTable}
            onChange={e => setCapacityPerTable(Number(e.target.value))}
          />
        </div>
      </div>

      {message && <p className="text-small bg-background/80 rounded-xl px-3 py-2">{message}</p>}

      <button className="btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Creation en cours..." : "Creer l'evenement"}
      </button>
    </form>
  );
}
