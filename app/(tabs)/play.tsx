import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { supabase } from "@/lib/supabase";
import { Match, AllTimeStats } from "@/types/database";
import { courtLabel, formatWinPct } from "@/lib/utils";

// ─── Section types ─────────────────────────────────────────────────────────────

type PlaySection =
  | "create-shootout"
  | "join-active"
  | "list-shootouts"
  | "player-ranking"
  | "message-players"
  | "reset-scores"
  | "preferences";

const ALL_SECTIONS: { key: PlaySection; label: string; adminOnly: boolean }[] = [
  { key: "create-shootout",  label: "Create Shootout",    adminOnly: true  },
  { key: "join-active",      label: "Join Active",         adminOnly: false },
  { key: "list-shootouts",   label: "List Shootouts",      adminOnly: false },
  { key: "player-ranking",   label: "Player Ranking",      adminOnly: false },
  { key: "message-players",  label: "Message Players",     adminOnly: true  },
  { key: "reset-scores",     label: "Reset Scores",        adminOnly: true  },
  { key: "preferences",      label: "Preferences",         adminOnly: true  },
];

// ─── Placeholder ───────────────────────────────────────────────────────────────

function ComingSoon({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
      <View style={s.csIcon}>
        <Text style={{ fontSize: 32 }}>🚧</Text>
      </View>
      <Text style={s.csTitle}>{title}</Text>
      <Text style={s.csSub}>This section is under construction and coming soon.</Text>
    </View>
  );
}

// ─── Join Active Shootout ──────────────────────────────────────────────────────

function JoinActiveSection() {
  const { player } = useAuthStore();
  const {
    activeSession,
    currentRound,
    matches,
    playerStates,
    fetchSessions,
    fetchCurrentRound,
    fetchMatches,
    fetchPlayerStates,
    enterScore,
  } = useSessionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [scoreModal, setScoreModal] = useState<Match | null>(null);
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    await fetchSessions();
    if (activeSession) {
      await Promise.all([
        fetchCurrentRound(activeSession.id),
        fetchPlayerStates(activeSession.id),
      ]);
    }
  };

  useEffect(() => { loadData(); }, [activeSession?.id]);
  useEffect(() => { if (currentRound) fetchMatches(currentRound.id); }, [currentRound?.id]);

  useEffect(() => {
    if (!currentRound) return;
    const sub = supabase
      .channel(`matches:round:${currentRound.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () =>
        fetchMatches(currentRound.id)
      )
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [currentRound?.id]);

  const getPlayerNames = (ids: string[]) =>
    ids
      .map((id) => playerStates.find((ps) => ps.player_id === id)?.player?.full_name?.split(" ")[0] ?? "?")
      .join(" & ");

  const myMatch = matches.find(
    (m) =>
      m.team1_player_ids.includes(player?.id ?? "") ||
      m.team2_player_ids.includes(player?.id ?? "")
  );

  const openScoreEntry = (match: Match) => {
    setScoreModal(match);
    setTeam1Score(match.team1_score?.toString() ?? "");
    setTeam2Score(match.team2_score?.toString() ?? "");
  };

  const submitScore = async () => {
    if (!scoreModal || !player) return;
    const t1 = parseInt(team1Score);
    const t2 = parseInt(team2Score);
    if (isNaN(t1) || isNaN(t2) || t1 < 0 || t2 < 0) {
      Alert.alert("Invalid Score", "Please enter valid scores.");
      return;
    }
    setSubmitting(true);
    const { error } = await enterScore(scoreModal.id, t1, t2, player.id);
    setSubmitting(false);
    if (error) Alert.alert("Error", error);
    else {
      setScoreModal(null);
      if (currentRound) fetchMatches(currentRound.id);
    }
  };

  if (!activeSession) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>😴</Text>
        <Text style={s.emptyTitle}>No Active Session</Text>
        <Text style={s.emptySub}>
          Live court data will appear here once an admin starts a session.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }}
          />
        }
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Session status */}
        <View style={s.liveBar}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
          {currentRound && (
            <Text style={s.liveRound}> · Round {currentRound.round_number}</Text>
          )}
        </View>

        {/* My match highlight */}
        {myMatch && (
          <View style={s.myMatch}>
            <Text style={s.myMatchLabel}>YOUR MATCH</Text>
            <View style={s.matchTeams}>
              <Text style={s.myMatchTeam} numberOfLines={1}>
                {getPlayerNames(myMatch.team1_player_ids)}
              </Text>
              <View style={s.scoreBox}>
                <Text style={s.scoreText}>
                  {myMatch.team1_score ?? "–"} : {myMatch.team2_score ?? "–"}
                </Text>
              </View>
              <Text style={[s.myMatchTeam, { textAlign: "right" }]} numberOfLines={1}>
                {getPlayerNames(myMatch.team2_player_ids)}
              </Text>
            </View>
            {myMatch.team1_score == null && (
              <TouchableOpacity
                onPress={() => openScoreEntry(myMatch)}
                style={s.enterScoreBtn}
                activeOpacity={0.8}
              >
                <Text style={s.enterScoreBtnText}>Enter Score</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* All matches */}
        <Text style={s.listLabel}>All Courts</Text>
        {matches.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyCardText}>No matches yet for this round</Text>
          </View>
        ) : (
          matches.map((match) => (
            <View key={match.id} style={s.matchCard}>
              <Text style={s.courtTag}>{courtLabel(match.court?.court_number ?? 0)}</Text>
              <View style={s.matchTeams}>
                <Text style={s.teamName} numberOfLines={1}>
                  {getPlayerNames(match.team1_player_ids)}
                </Text>
                <View style={s.vsBox}>
                  {match.team1_score != null ? (
                    <Text style={s.vsScore}>
                      {match.team1_score} – {match.team2_score}
                    </Text>
                  ) : (
                    <Text style={s.vsText}>vs</Text>
                  )}
                </View>
                <Text style={[s.teamName, { textAlign: "right" }]} numberOfLines={1}>
                  {getPlayerNames(match.team2_player_ids)}
                </Text>
              </View>
              {match.team1_score == null && (
                <TouchableOpacity
                  onPress={() => openScoreEntry(match)}
                  style={s.smallScoreBtn}
                  activeOpacity={0.8}
                >
                  <Text style={s.smallScoreBtnText}>Enter Score</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Score entry modal */}
      <Modal visible={!!scoreModal} transparent animationType="slide" onRequestClose={() => setScoreModal(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Enter Score</Text>
            <Text style={s.modalSub}>
              {scoreModal ? courtLabel(scoreModal.court?.court_number ?? 0) : ""}
            </Text>
            <View style={s.scoreInputRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.scoreTeamLabel} numberOfLines={1}>
                  {scoreModal ? getPlayerNames(scoreModal.team1_player_ids) : ""}
                </Text>
                <TextInput
                  style={s.scoreInput}
                  value={team1Score}
                  onChangeText={setTeam1Score}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <Text style={s.scoreDash}>—</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.scoreTeamLabel} numberOfLines={1}>
                  {scoreModal ? getPlayerNames(scoreModal.team2_player_ids) : ""}
                </Text>
                <TextInput
                  style={s.scoreInput}
                  value={team2Score}
                  onChangeText={setTeam2Score}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
            <TouchableOpacity onPress={submitScore} disabled={submitting} style={s.modalBtn}>
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={s.modalBtnText}>Submit Score</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setScoreModal(null)} style={{ paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ color: "#94a3b8", fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Player Ranking ─────────────────────────────────────────────────────────────

function PlayerRankingSection() {
  const { player } = useAuthStore();
  const { activeSession, upcomingSession, playerStates, fetchPlayerStates, fetchSessions } =
    useSessionStore();
  type RankTab = "session" | "alltime";
  const [rankTab, setRankTab] = useState<RankTab>("session");
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentSession = activeSession ?? upcomingSession;

  const loadData = async () => {
    setLoading(true);
    await fetchSessions();
    if (currentSession) await fetchPlayerStates(currentSession.id);
    const { data } = await supabase
      .from("all_time_stats")
      .select("*")
      .order("win_percentage", { ascending: false })
      .order("total_wins", { ascending: false });
    if (data) setAllTimeStats(data as AllTimeStats[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [currentSession?.id]);

  const sortedStates = [...playerStates].sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : a.losses - b.losses
  );

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} />}
      contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Toggle */}
      <View style={s.toggle}>
        {(["session", "alltime"] as RankTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setRankTab(t)}
            style={[s.toggleBtn, rankTab === t && s.toggleBtnActive]}
          >
            <Text style={[s.toggleLabel, rankTab === t && s.toggleLabelActive]}>
              {t === "session" ? "This Session" : "All Time"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#10b981" style={{ marginTop: 40 }} />
      ) : rankTab === "session" ? (
        sortedStates.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📊</Text>
            <Text style={s.emptyTitle}>No Session Data</Text>
            <Text style={s.emptySub}>Rankings appear once a session is active.</Text>
          </View>
        ) : (
          <>
            <View style={s.tableHeader}>
              <Text style={[s.colHead, { width: 28 }]}>#</Text>
              <Text style={[s.colHead, { flex: 1 }]}>Player</Text>
              <Text style={[s.colHead, s.colRight, { width: 32 }]}>W</Text>
              <Text style={[s.colHead, s.colRight, { width: 32 }]}>L</Text>
              <Text style={[s.colHead, s.colRight, { width: 48 }]}>Win%</Text>
              <Text style={[s.colHead, s.colRight, { width: 52 }]}>Court</Text>
            </View>
            {sortedStates.map((state, i) => {
              const isMe = state.player_id === player?.id;
              return (
                <View key={state.id} style={[s.tableRow, isMe && s.tableRowMe]}>
                  <Text style={[s.cell, { width: 28, color: "#94a3b8" }]}>{i + 1}</Text>
                  <Text style={[s.cell, { flex: 1, fontWeight: "600", color: isMe ? "#10b981" : "#0f172a" }]} numberOfLines={1}>
                    {state.player?.full_name ?? "Unknown"}{isMe ? " (you)" : ""}
                  </Text>
                  <Text style={[s.cell, s.colRight, { width: 32, fontWeight: "700", color: "#0f172a" }]}>
                    {state.wins}
                  </Text>
                  <Text style={[s.cell, s.colRight, { width: 32, color: "#64748b" }]}>
                    {state.losses}
                  </Text>
                  <Text style={[s.cell, s.colRight, { width: 48, color: "#475569" }]}>
                    {formatWinPct(state.wins, state.losses)}
                  </Text>
                  <View style={[{ width: 52, alignItems: "flex-end" }]}>
                    <View style={s.courtPill}>
                      <Text style={s.courtPillText}>C{state.current_court}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )
      ) : allTimeStats.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📊</Text>
          <Text style={s.emptyTitle}>No Stats Yet</Text>
          <Text style={s.emptySub}>All-time stats appear after sessions are played.</Text>
        </View>
      ) : (
        <>
          <View style={s.tableHeader}>
            <Text style={[s.colHead, { width: 28 }]}>#</Text>
            <Text style={[s.colHead, { flex: 1 }]}>Player</Text>
            <Text style={[s.colHead, s.colRight, { width: 32 }]}>W</Text>
            <Text style={[s.colHead, s.colRight, { width: 32 }]}>L</Text>
            <Text style={[s.colHead, s.colRight, { width: 48 }]}>Win%</Text>
            <Text style={[s.colHead, s.colRight, { width: 52 }]}>Sess.</Text>
          </View>
          {allTimeStats.map((stats, i) => {
            const isMe = stats.player_id === player?.id;
            return (
              <View key={stats.player_id} style={[s.tableRow, isMe && s.tableRowMe]}>
                <Text style={[s.cell, { width: 28, color: "#94a3b8" }]}>{i + 1}</Text>
                <Text
                  style={[s.cell, { flex: 1, fontWeight: "600", color: isMe ? "#10b981" : "#0f172a" }]}
                  numberOfLines={1}
                >
                  {(stats as any).full_name ?? "Unknown"}{isMe ? " (you)" : ""}
                </Text>
                <Text style={[s.cell, s.colRight, { width: 32, fontWeight: "700", color: "#0f172a" }]}>
                  {stats.total_wins}
                </Text>
                <Text style={[s.cell, s.colRight, { width: 32, color: "#64748b" }]}>
                  {stats.total_losses}
                </Text>
                <Text style={[s.cell, s.colRight, { width: 48, color: "#475569" }]}>
                  {formatWinPct(stats.total_wins, stats.total_losses)}
                </Text>
                <Text style={[s.cell, s.colRight, { width: 52, color: "#64748b" }]}>
                  {stats.sessions_played}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ─── Main Play Screen ──────────────────────────────────────────────────────────

export default function PlayScreen() {
  const { player } = useAuthStore();
  const isAdmin = player?.role === "admin";

  const visible = ALL_SECTIONS.filter((sec) => !sec.adminOnly || isAdmin);
  const [active, setActive] = useState<PlaySection>(
    isAdmin ? "create-shootout" : "join-active"
  );

  const renderSection = () => {
    switch (active) {
      case "join-active":     return <JoinActiveSection />;
      case "player-ranking":  return <PlayerRankingSection />;
      default:                return <ComingSoon title={ALL_SECTIONS.find((s) => s.key === active)?.label ?? ""} />;
    }
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Page header */}
      <View style={ph.wrap}>
        <View>
          <Text style={ph.title}>Play</Text>
          <Text style={ph.sub}>Athens Pickleball</Text>
        </View>
        <View style={ph.brand}>
          <Text style={{ fontSize: 18 }}>🏓</Text>
        </View>
      </View>

      {/* Sub-nav */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, gap: 8 }}
        style={{ flexGrow: 0 }}
      >
        {visible.map((sec) => (
          <TouchableOpacity
            key={sec.key}
            onPress={() => setActive(sec.key)}
            style={[s.chip, active === sec.key && s.chipActive]}
            activeOpacity={0.7}
          >
            {sec.adminOnly && (
              <View style={s.adminStar}>
                <Text style={{ fontSize: 8, color: "#d97706" }}>★</Text>
              </View>
            )}
            <Text style={[s.chipText, active === sec.key && s.chipTextActive]}>
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: "#f1f5f9", marginHorizontal: 20 }} />

      <View style={{ flex: 1 }}>{renderSection()}</View>
    </SafeAreaView>
  );
}

const ph = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#0f172a", letterSpacing: -0.5 },
  sub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  brand: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },

  // Chips
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  chipTextActive: { color: "#ffffff" },
  adminStar: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty state
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 22 },

  // Coming soon
  csIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  csTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  csSub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 22 },

  // Live bar
  liveBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 14,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    marginRight: 6,
  },
  liveText: { fontSize: 12, fontWeight: "800", color: "#ef4444", letterSpacing: 1 },
  liveRound: { fontSize: 12, fontWeight: "600", color: "#64748b" },

  // My match
  myMatch: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  myMatchLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  matchTeams: { flexDirection: "row", alignItems: "center", gap: 8 },
  myMatchTeam: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  scoreBox: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreText: { fontSize: 18, fontWeight: "800", color: "#f1f5f9", letterSpacing: -0.5 },
  enterScoreBtn: {
    marginTop: 14,
    backgroundColor: "#10b981",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  enterScoreBtnText: { color: "white", fontWeight: "700", fontSize: 14 },

  // Match cards
  listLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  matchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 16,
    marginBottom: 10,
  },
  courtTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  teamName: { flex: 1, fontSize: 14, fontWeight: "600", color: "#0f172a" },
  vsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vsScore: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  vsText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  smallScoreBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: "#10b981",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  smallScoreBtnText: { fontSize: 13, fontWeight: "700", color: "#10b981" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 24,
    alignItems: "center",
  },
  emptyCardText: { color: "#94a3b8", fontSize: 14 },

  // Score modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  modalSub: { fontSize: 13, color: "#64748b", marginBottom: 24 },
  scoreInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  scoreTeamLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  scoreInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingVertical: 16,
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  scoreDash: { fontSize: 24, color: "#cbd5e1", fontWeight: "300" },
  modalBtn: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 4,
  },
  modalBtnText: { color: "white", fontWeight: "700", fontSize: 16 },

  // Rankings table
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 3,
    marginTop: 16,
    marginBottom: 20,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: "#ffffff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleLabel: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  toggleLabelActive: { color: "#0f172a", fontWeight: "700" },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  colHead: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 0.3 },
  colRight: { textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  tableRowMe: { borderColor: "#10b981", backgroundColor: "#f0fdf4" },
  cell: { fontSize: 13 },
  courtPill: {
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  courtPillText: { fontSize: 11, fontWeight: "700", color: "#10b981" },
});
