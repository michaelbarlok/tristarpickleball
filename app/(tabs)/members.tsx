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
import { supabase } from "@/lib/supabase";
import { Player } from "@/types/database";

type Tab = "view" | "manage" | "message";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 40, active }: { name: string; size?: number; active?: boolean }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        s.avatar,
        { width: size, height: size, borderRadius: size / 4 },
        active && s.avatarActive,
      ]}
    >
      <Text style={[s.avatarText, { fontSize: size * 0.38 }, active && { color: "#10b981" }]}>
        {initials}
      </Text>
    </View>
  );
}

// ─── View Members ─────────────────────────────────────────────────────────────

function ViewMembersSection() {
  const { player: me } = useAuthStore();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("full_name");
    if (data) setPlayers(data as Player[]);
    setLoading(false);
  };

  useEffect(() => { loadPlayers(); }, []);

  const filtered = players.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter((p) => p.role === "admin");
  const members = filtered.filter((p) => p.role !== "admin");

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadPlayers(); setRefreshing(false); }} />}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Search */}
      <View style={s.searchBox}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Admins */}
      {admins.length > 0 && (
        <View style={{ marginBottom: 20 }}>
          <View style={s.groupHeader}>
            <View style={s.adminBadge}>
              <Text style={s.adminBadgeText}>ADMINS</Text>
            </View>
            <Text style={s.groupCount}>{admins.length}</Text>
          </View>
          <View style={s.memberList}>
            {admins.map((p, i) => {
              const isMe = p.id === me?.id;
              return (
                <View key={p.id} style={[s.memberRow, i > 0 && s.memberRowBorder]}>
                  <Avatar name={p.full_name} active={isMe} />
                  <View style={s.memberInfo}>
                    <Text style={[s.memberName, isMe && { color: "#10b981" }]}>
                      {p.full_name}{isMe ? " (you)" : ""}
                    </Text>
                    <Text style={s.memberEmail} numberOfLines={1}>{p.email}</Text>
                  </View>
                  <View style={s.adminTag}>
                    <Text style={s.adminTagText}>Admin</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Members */}
      <View style={s.groupHeader}>
        <Text style={s.groupTitle}>MEMBERS</Text>
        <Text style={s.groupCount}>{members.length}</Text>
      </View>
      <View style={s.memberList}>
        {members.map((p, i) => {
          const isMe = p.id === me?.id;
          return (
            <View key={p.id} style={[s.memberRow, i > 0 && s.memberRowBorder]}>
              <Avatar name={p.full_name} active={isMe} />
              <View style={s.memberInfo}>
                <Text style={[s.memberName, isMe && { color: "#10b981" }]}>
                  {p.full_name}{isMe ? " (you)" : ""}
                </Text>
                <Text style={s.memberEmail} numberOfLines={1}>{p.email}</Text>
              </View>
              {p.skill_rating != null && (
                <Text style={s.rating}>★ {p.skill_rating.toFixed(1)}</Text>
              )}
            </View>
          );
        })}
        {members.length === 0 && (
          <View style={{ paddingVertical: 24, alignItems: "center" }}>
            <Text style={{ color: "#94a3b8", fontSize: 14 }}>No members found</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Manage Members ───────────────────────────────────────────────────────────

function ManageMembersSection() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlayers = async () => {
    const { data } = await supabase.from("players").select("*").order("full_name");
    if (data) setPlayers(data as Player[]);
    setLoading(false);
  };

  useEffect(() => { loadPlayers(); }, []);

  const toggleRole = (p: Player) => {
    const newRole = p.role === "admin" ? "player" : "admin";
    Alert.alert(
      "Change Role",
      `Make ${p.full_name} a${newRole === "admin" ? "n admin" : " player"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setSaving(p.id);
            const { error } = await supabase
              .from("players")
              .update({ role: newRole })
              .eq("id", p.id);
            setSaving(null);
            if (error) Alert.alert("Error", error.message);
            else setPlayers((prev) => prev.map((x) => (x.id === p.id ? { ...x, role: newRole } : x)));
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadPlayers(); setRefreshing(false); }} />}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.manageHint}>Tap a role badge to toggle between Admin and Player</Text>
      <View style={s.memberList}>
        {players.map((p, i) => (
          <View key={p.id} style={[s.memberRow, i > 0 && s.memberRowBorder]}>
            <Avatar name={p.full_name} />
            <View style={s.memberInfo}>
              <Text style={s.memberName}>{p.full_name}</Text>
              <Text style={s.memberEmail} numberOfLines={1}>{p.email}</Text>
            </View>
            <TouchableOpacity
              onPress={() => toggleRole(p)}
              disabled={saving === p.id}
              style={[s.roleBtn, p.role === "admin" && s.roleBtnAdmin]}
              activeOpacity={0.7}
            >
              {saving === p.id ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text style={[s.roleBtnText, p.role === "admin" && s.roleBtnTextAdmin]}>
                  {p.role === "admin" ? "Admin" : "Player"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Message Members ──────────────────────────────────────────────────────────

function MessageMembersSection() {
  const { player } = useAuthStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing Fields", "Please enter a title and message body.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim(),
      type: "general",
      sent_by: player?.id,
    });
    setSending(false);
    if (error) Alert.alert("Error", error.message);
    else {
      Alert.alert("Sent!", "Your announcement has been sent to all members.");
      setTitle("");
      setBody("");
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.msgCard}>
        <View style={s.msgIcon}>
          <Text style={{ fontSize: 28 }}>📢</Text>
        </View>
        <Text style={s.msgTitle}>Broadcast Announcement</Text>
        <Text style={s.msgSub}>Send a message to all league members</Text>

        <Text style={s.fieldLabel}>Subject</Text>
        <TextInput
          style={s.fieldInput}
          placeholder="e.g. Schedule Update, Cancellation..."
          placeholderTextColor="#94a3b8"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={s.fieldLabel}>Message</Text>
        <TextInput
          style={[s.fieldInput, { minHeight: 120, textAlignVertical: "top", paddingTop: 14 }]}
          placeholder="Write your message here..."
          placeholderTextColor="#94a3b8"
          value={body}
          onChangeText={setBody}
          multiline
        />

        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          style={[s.sendBtn, sending && { opacity: 0.75 }]}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={s.sendBtnText}>Send to All Members</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MembersScreen() {
  const { player } = useAuthStore();
  const isAdmin = player?.role === "admin";

  const tabs: { key: Tab; label: string; adminOnly: boolean }[] = [
    { key: "view",    label: "View Members",    adminOnly: false },
    { key: "manage",  label: "Manage",          adminOnly: true  },
    { key: "message", label: "Message",         adminOnly: true  },
  ];

  const visible = tabs.filter((t) => !t.adminOnly || isAdmin);
  const [activeTab, setActiveTab] = useState<Tab>("view");

  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Members</Text>
          <Text style={s.pageSub}>Athens Pickleball</Text>
        </View>
        <View style={s.pageBrand}>
          <Text style={{ fontSize: 18 }}>🏓</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {visible.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[s.tabBtn, activeTab === t.key && s.tabBtnActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "view"    && <ViewMembersSection />}
        {activeTab === "manage"  && isAdmin && <ManageMembersSection />}
        {activeTab === "message" && isAdmin && <MessageMembersSection />}
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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 16,
    marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#0f172a" },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 1,
  },
  groupCount: { fontSize: 12, fontWeight: "700", color: "#94a3b8" },
  adminBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "800", color: "#d97706", letterSpacing: 0.5 },

  memberList: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  memberRowBorder: { borderTopWidth: 1, borderTopColor: "#f8fafc" },

  avatar: {
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: { backgroundColor: "#ecfdf5" },
  avatarText: { fontWeight: "800", color: "#64748b" },

  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 2 },
  memberEmail: { fontSize: 12, color: "#94a3b8" },
  adminTag: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  adminTagText: { fontSize: 11, fontWeight: "700", color: "#d97706" },
  rating: { fontSize: 12, color: "#f59e0b", fontWeight: "700" },

  manageHint: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  roleBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: "center",
  },
  roleBtnAdmin: { backgroundColor: "#fef3c7" },
  roleBtnText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  roleBtnTextAdmin: { color: "#d97706" },

  msgCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 20,
    marginTop: 16,
    alignItems: "center",
  },
  msgIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  msgTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  msgSub: { fontSize: 13, color: "#64748b", marginBottom: 24, textAlign: "center" },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: "uppercase",
    alignSelf: "flex-start",
    width: "100%",
    marginTop: 4,
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
    marginBottom: 14,
    width: "100%",
  },
  sendBtn: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    width: "100%",
    marginTop: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
