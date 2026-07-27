"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Rarity = "bronze" | "silver" | "gold" | "diamond";
type Definition = {
  id: string;
  name: string;
  description: string;
  tier: Rarity;
  category: string;
  is_secret: boolean;
};
type Unlock = { achievement_id: string; unlocked_at: string };

const rarityOrder: Record<Rarity, number> = { bronze: 0, silver: 1, gold: 2, diamond: 3 };

export function AchievementsCenter({ onClose }: { onClose?: () => void } = {}) {
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const definitionsRequest = await supabase
        .from("achievement_definitions")
        .select("id,name,description,tier,category,is_secret")
        .eq("is_active", true);
      let unlockRequest: { data: Unlock[] | null } = { data: [] };
      if (user) {
        unlockRequest = await supabase
          .from("user_achievements")
          .select("achievement_id,unlocked_at")
          .eq("user_id", user.id);
      }
      setDefinitions((definitionsRequest.data || []) as Definition[]);
      setUnlocks(unlockRequest.data || []);
      setLoading(false);
    })();
  }, []);

  const earned = useMemo(() => new Map(unlocks.map((item) => [item.achievement_id, item])), [unlocks]);
  const ordered = useMemo(() => [...definitions].sort((a, b) => rarityOrder[a.tier] - rarityOrder[b.tier] || a.name.localeCompare(b.name)), [definitions]);
  const categories = useMemo(() => ["all", ...new Set(definitions.map((item) => item.category).filter(Boolean))], [definitions]);
  const visible = useMemo(() => filter === "all" ? ordered : ordered.filter((item) => item.category === filter), [filter, ordered]);

  const content = (
    <main className={`achievements-page ${onClose ? "modal-panel" : ""}`}>
      {onClose && <button className="modal-close" onClick={onClose}>CLOSE ×</button>}
      <header>
        <span>PLAYER COLLECTION</span>
        <h1>ACHIEVEMENTS</h1>
        <p>{earned.size} / {definitions.length} unlocked</p>
        <i><b style={{ width: `${definitions.length ? earned.size / definitions.length * 100 : 0}%` }} /></i>
      </header>
      {!loading && <nav className="achievement-filters" aria-label="Achievement categories">{categories.map((category) => <button type="button" className={filter === category ? "active" : ""} onClick={() => setFilter(category)} key={category}><span>{category === "all" ? "ALL" : category.toUpperCase()}</span><small>{category === "all" ? definitions.length : definitions.filter((item) => item.category === category).length}</small></button>)}</nav>}
      {loading ? <p>LOADING CABINET...</p> : (
        <section className="achievement-catalog">
          {visible.map((item) => {
            const unlocked = earned.get(item.id);
            return (
              <article key={item.id} className={`${item.tier} ${unlocked ? "unlocked" : "locked"}`}>
                <div><small>{item.tier} rarity</small><b>{unlocked ? "●" : "○"}</b></div>
                <h2>{item.is_secret && !unlocked ? "???" : item.name}</h2>
                <p>{item.is_secret && !unlocked ? "Complete more verified Era XI runs to reveal this challenge." : item.description}</p>
                <footer>{unlocked ? `UNLOCKED ${new Date(unlocked.unlocked_at).toLocaleDateString()}` : "NOT YET UNLOCKED"}</footer>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );

  return onClose ? <div className="arcade-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>{content}</div> : content;
}
