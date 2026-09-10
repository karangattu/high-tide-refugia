import { createClient } from '@supabase/supabase-js';

// GitHub Pages builds run without env secrets, so the publishable key is
// embedded as a fallback. It is safe to expose client-side: the table is
// protected by RLS and all writes go through the submit_high_score RPC.
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://ovwktjjeoowlktdfbuuu.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_B2pz5WTA3UEVUeKACIgmBw_8_r0S3kU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
});

const LEADERBOARD_TABLE = 'rail_refuge_high_scores';
const NAME_STORAGE_KEY = 'railRefugePlayerName';

export function getSavedPlayerName() {
    try {
        return localStorage.getItem(NAME_STORAGE_KEY) || '';
    } catch {
        return '';
    }
}

export function savePlayerName(name) {
    try {
        localStorage.setItem(NAME_STORAGE_KEY, name);
    } catch {
        // storage unavailable (private mode) - the entry still saves server-side
    }
}

export function normalizeName(raw) {
    return String(raw || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 24);
}

export async function fetchTopScores(limit = 5) {
    const { data, error } = await supabase
        .from(LEADERBOARD_TABLE)
        .select('player_name, score, rails_saved, rails_lost')
        .order('score', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(limit);
    if (error) throw error;
    return data || [];
}

// One entry per name: the RPC upserts and keeps only the best score.
export async function submitHighScore(playerName, stats) {
    const name = normalizeName(playerName);
    if (name.length < 2) throw new Error('Name must be at least 2 characters');

    const { data, error } = await supabase.rpc('submit_high_score', {
        p_name: name,
        p_score: Math.max(0, Math.floor(stats?.score || 0)),
        p_rails_saved: Math.max(0, Math.floor(stats?.railsSaved || 0)),
        p_rails_lost: Math.max(0, Math.floor(stats?.railsLost || 0)),
    });
    if (error) throw error;

    savePlayerName(name);
    return data;
}

export function subscribeToLeaderboard(onChange) {
    const channel = supabase.channel('rail_refuge_leaderboard');
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: LEADERBOARD_TABLE },
        onChange
    );
    channel.subscribe();
    return () => supabase.removeChannel(channel);
}
