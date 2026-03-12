import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { useSessionStore } from "@/store/session.store";
import { supabase } from "@/lib/supabase";
import { Session } from "@/types/database";
import { formatDate, formatTime, getCountdown } from "@/lib/utils";

type Tab = "view" | "create";

// ─── View Sign-Up Sheets ─────────────────────────────────────────────────────

function ViewSignUpsSection() {
  const { player } = useAuthStore();
  const {
    upcomingSession,
    mySignUps,
    signUps,
    loading,
    fetchSessions,
    fetchSignUps,
    fetchMySignUps,
    signUpForSession,
    withdrawFromSession,
  } = useSessionStore();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [countdown, setCountdown] = useState("");

  const mySignUp = mySignUps.find((s) => s.session_id === upcomingSession?.id);
  const confirmed = signUps.filter((s) => s.status === "confirmed");
  const waitlistCount = signUps.filter((s) => s.status === "waitlist").length;

  const loadData = async () => {
    await fetchSessions();
    if (player) await fetchMySignUps(player.id);
  };

  const loadSignUps = async (session: Session) => fetchSignUps(session.id);

  useEffect(() => { loadData(); }, [player]);
  useEffect(() => { if (upcomingSession) loadSignUps(upcomingSession); }, [upcomingSession?.id]);
  useEffect(() => {
    if (!upcomingSession) return;
    const update = () => setCountdown(getCountdown(upcomingSession.start_time));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [upcomingSession?.start_time]);

  const handleSignUp = async () => {
    if (!player || !upcomingSession) return;
    setActionLoading(true);
    const { error } = await signUpForSession(upcomingSession.id, player.id);
    setActionLoading(false);
    if (error) Alert.alert("Sign-up Failed", error);
    else loadSignUps(upcomingSession);
  };

  const handleWithdraw = () => {
    Alert.alert("Withdraw", "Are you sure you want to withdraw from this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          if (!player || !upcomingSession) return;
          setActionLoading(true);
          const { error } = await withdrawFromSession(upcomingSession.id, player.id);
          setActionLoading(false);
          if (error) Alert.alert("Error", error);
          else loadSignUps(upcomingSession);
        },
      },
    ]);
  };

  const isSignedUp = !!mySignUp && mySignUp.status !== "withdrawn";
  const isWaitlisted = mySignUp?.status === "waitlist";
  const cutoffPassed = upcomingSession ? new Date() > new Date(upcomingSession.cutoff_time) : false;

  if (loading && !upcomingSession) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!upcomingSession) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>🏓</Text>
        <Text style={s.emptyTitle}>No Upcoming Sessions</Text>
        <Text style={s.emptySub}>
          Check back soon — an admin will post the next session.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} />}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Countdown banner */}
      {countdown ? (
        <View style={s.countdownBanner}>
          <View>
            <Text style={s.countdownLabel}>NEXT SESSION IN</Text>
            <Text style={s.countdownValue}>{countdown}</Text>
          </View>
          <Text style={{ fontSize: 36 }}>⏰</Text>
        </View>
      ) : null}

      {/* Session card */}
      <View style={s.sessionCard}>
        <View style={s.sessionCardTop}>
          <View>
            <Text style={s.upcomingLabel}>UPCOMING SESSION</Text>
            <Text style={s.sessionDate}>{formatDate(upcomingSession.date)}</Text>
          </View>
          <View style={s.statusBadge}>
            <View style={s.statusDot} />
            <Text style={s.statusText}>{upcomingSession.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={s.detailsRow}>
          {[
            { icon: "📍", text: upcomingSession.location },
            { icon: "🕐", text: formatTime(upcomingSession.start_time) },
            { icon: "🎾", text: `${upcomingSession.num_courts} courts` },
          ].map(({ icon, text }) => (
            <View key={text} style={s.detailItem}>
              <Text style={{ fontSize: 13 }}>{icon}</Text>
              <Text style={s.detailText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Counts */}
        <View style={s.countsRow}>
          <View style={s.countCell}>
            <Text style={s.countValue}>{confirmed.length}</Text>
            <Text style={s.countLabel}>Confirmed</Text>
          </View>
          <View style={s.countDivider} />
          <View style={s.countCell}>
            <Text style={s.countValue}>{upcomingSession.max_players}</Text>
            <Text style={s.countLabel}>Max Players</Text>
          </View>
          <View style={s.countDivider} />
          <View style={s.countCell}>
            <Text style={[s.countValue, { color: waitlistCount > 0 ? "#f59e0b" : "#94a3b8" }]}>
              {waitlistCount}
            </Text>
            <Text style={s.countLabel}>Waitlist</Text>
          </View>
        </View>

        {/* My status */}
        {isSignedUp && (
          <View style={[s.myStatus, isWaitlisted ? s.myStatusWait : s.myStatusIn]}>
            <Text style={[s.myStatusText, isWaitlisted ? { color: "#d97706" } : { color: "#059669" }]}>
              {isWaitlisted
                ? `You're on the waitlist (#${mySignUp?.waitlist_position})`
                : "✓ You're confirmed for this session"}
            </Text>
          </View>
        )}

        {/* Action */}
        {!cutoffPassed ? (
          isSignedUp ? (
            <TouchableOpacity
              onPress={handleWithdraw}
              disabled={actionLoading}
              style={s.withdrawBtn}
              activeOpacity={0.7}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ef4444" />
              ) : (
                <Text style={s.withdrawBtnText}>Withdraw from Session</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={actionLoading}
              style={s.signUpBtn}
              activeOpacity={0.8}
            >
              {actionLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={s.signUpBtnText}>
                  {confirmed.length >= upcomingSession.max_players ? "Join Waitlist" : "Sign Up"}
                </Text>
              )}
            </TouchableOpacity>
          )
        ) : (
          <View style={s.closedBtn}>
            <Text style={s.closedBtnText}>Sign-ups closed</Text>
          </View>
        )}
      </View>

      {/* Players list */}
      {confirmed.length > 0 && (
        <View style={s.playersSection}>
          <Text style={s.playersHeader}>
            Players ({confirmed.length}/{upcomingSession.max_players})
          </Text>
          <View style={s.playersList}>
            {confirmed.slice(0, 10).map((su, i) => {
              const isMe = su.player_id === player?.id;
              return (
                <View key={su.id} style={[s.playerRow, i > 0 && s.playerRowBorder]}>
                  <View style={[s.playerNum, isMe && s.playerNumMe]}>
                    <Text style={[s.playerNumText, isMe && { color: "#10b981" }]}>{i + 1}</Text>
                  </View>
                  <Text style={[s.playerName, isMe && { color: "#10b981" }]} numberOfLines={1}>
                    {su.player?.full_name ?? "Unknown"}
                  </Text>
                  {isMe && <Text style={s.youBadge}>YOU</Text>}
                </View>
              );
            })}
            {confirmed.length > 10 && (
              <View style={[s.playerRow, s.playerRowBorder]}>
                <Text style={s.moreText}>+{confirmed.length - 10} more players</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Create Sign-Up Sheet ─────────────────────────────────────────────────────

function CreateSignUpSection() {
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("Memorial Park Courts");
  const [startTime, setStartTime] = useState("");
  const [cutoffTime, setCutoffTime] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("16");
  const [numCourts, setNumCourts] = useState("4");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fields = [
    { label: "Date", value: date, set: setDate, placeholder: "YYYY-MM-DD" },
    { label: "Location", value: location, set: setLocation, placeholder: "e.g. Memorial Park Courts" },
    { label: "Start Time", value: startTime, set: setStartTime, placeholder: "YYYY-MM-DDTHH:MM:SSZ" },
    { label: "Sign-up Cutoff", value: cutoffTime, set: setCutoffTime, placeholder: "YYYY-MM-DDTHH:MM:SSZ" },
    { label: "Max Players", value: maxPlayers, set: setMaxPlayers, placeholder: "16" },
    { label: "# of Courts", value: numCourts, set: setNumCourts, placeholder: "4" },
  ];

  const handleCreate = async () => {
    if (!date || !location || !startTime || !cutoffTime) {
      Alert.alert("Missing Fields", "Date, location, start time, and cutoff are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("sessions").insert({
      date,
      location,
      start_time: startTime,
      cutoff_time: cutoffTime,
      max_players: parseInt(maxPlayers) || 16,
      num_courts: parseInt(numCourts) || 4,
      notes: notes || null,
      status: "upcoming",
    });
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Created!", "New sign-up sheet has been created.");
      setDate(""); setStartTime(""); setCutoffTime(""); setNotes("");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.createCard}>
        <Text style={s.createTitle}>New Session</Text>
        <Text style={s.createSub}>Fill in the details to open a sign-up sheet</Text>

        {fields.map(({ label, value, set, placeholder }) => (
          <View key={label} style={{ marginBottom: 14 }}>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
              style={s.fieldInput}
              value={value}
              onChangeText={set}
              placeholder={placeholder}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>
        ))}

        <View style={{ marginBottom: 20 }}>
          <Text style={s.fieldLabel}>Notes (optional)</Text>
          <TextInput
            style={[s.fieldInput, { minHeight: 90, textAlignVertical: "top", paddingTop: 14 }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special notes or announcements..."
            placeholderTextColor="#94a3b8"
            multiline
          />
        </View>

        <TouchableOpacity
          onPress={handleCreate}
          disabled={saving}
          style={[s.signUpBtn, saving && { opacity: 0.75 }]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={s.signUpBtnText}>Create Sign-Up Sheet</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SignUpsScreen() {
  const { player } = useAuthStore();
  const isAdmin = player?.role === "admin";
  const [activeTab, setActiveTab] = useState<Tab>("view");

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Sign-Ups</Text>
          <Text style={s.pageSub}>Athens Pickleball</Text>
        </View>
        <View style={s.pageBrand}>
          <Text style={{ fontSize: 18 }}>🏓</Text>
        </View>
      </View>

      {/* Tab switcher */}
      <View style={s.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab("view")}
          style={[s.tabBtn, activeTab === "view" && s.tabBtnActive]}
          activeOpacity={0.7}
        >
          <Text style={[s.tabLabel, activeTab === "view" && s.tabLabelActive]}>
            View Sign-Up Sheets
          </Text>
        </TouchableOpacity>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setActiveTab("create")}
            style={[s.tabBtn, activeTab === "create" && s.tabBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[s.tabLabel, activeTab === "create" && s.tabLabelActive]}>
              Create Sheet
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "view" ? <ViewSignUpsSection /> : <CreateSignUpSection />}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  pageTitle: { fontSize: 26, fontWeight: "800", color: "#0f172a", letterSpacing: -0.5 },
  pageSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  pageBrand: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },

  tabBar: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  tabLabelActive: { color: "#0f172a", fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 22 },

  countdownBanner: {
    marginTop: 16,
    backgroundColor: "#0f172a",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  countdownValue: { fontSize: 24, fontWeight: "800", color: "#f1f5f9", letterSpacing: -0.5 },

  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 20,
    marginBottom: 20,
  },
  sessionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  upcomingLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sessionDate: { fontSize: 20, fontWeight: "800", color: "#0f172a", letterSpacing: -0.3 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#f0fdf4",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#059669" },

  detailsRow: { gap: 8, marginBottom: 16 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailText: { fontSize: 14, color: "#475569" },

  countsRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  countCell: { flex: 1, alignItems: "center", paddingVertical: 12 },
  countDivider: { width: 1, backgroundColor: "#e2e8f0", marginVertical: 8 },
  countValue: { fontSize: 22, fontWeight: "800", color: "#0f172a", marginBottom: 2 },
  countLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  myStatus: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  myStatusIn: { backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  myStatusWait: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" },
  myStatusText: { fontWeight: "600", textAlign: "center", fontSize: 13 },

  signUpBtn: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signUpBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
  withdrawBtn: {
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  withdrawBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 14 },
  closedBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  closedBtnText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },

  playersSection: { marginBottom: 8 },
  playersHeader: { fontSize: 13, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  playersList: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  playerRowBorder: { borderTopWidth: 1, borderTopColor: "#f8fafc" },
  playerNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  playerNumMe: { backgroundColor: "#ecfdf5" },
  playerNumText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  playerName: { flex: 1, fontSize: 14, color: "#0f172a", fontWeight: "500" },
  youBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10b981",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  moreText: { fontSize: 13, color: "#94a3b8", flex: 1 },

  createCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 20,
    marginTop: 16,
  },
  createTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  createSub: { fontSize: 13, color: "#64748b", marginBottom: 22 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0f172a",
  },
});
