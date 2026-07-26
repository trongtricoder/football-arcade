"use client";

import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./client";

export type FootballArcadeSession = {
  user: User;
  isAnonymous: boolean;
};

export const getFootballArcadeSession =
  async (): Promise<FootballArcadeSession | null> => {
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      user,
      isAnonymous: Boolean(user.is_anonymous),
    };
  };

export const ensureFootballArcadeSession =
  async (): Promise<FootballArcadeSession> => {
    const existingSession = await getFootballArcadeSession();

    if (existingSession) {
      return existingSession;
    }

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Supabase did not return an anonymous user.");
    }

    return {
      user: data.user,
      isAnonymous: true,
    };
  };

