import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={h.wrap}>
      <View>
        <Text style={h.title}>{title}</Text>
        {subtitle && <Text style={h.sub}>{subtitle}</Text>}
      </View>
      <View style={h.brand}>
        <Text style={{ fontSize: 18 }}>🏓</Text>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
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

// ─── Admin action card ────────────────────────────────────────────────────────

function AdminCard({
  emoji,
  title,
  description,
  onPress,
}: {
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.card} activeOpacity={0.7}>
      <View style={s.cardIcon}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.cardDesc}>{description}</Text>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ClubScreen() {
  const { player } = useAuthStore();
  const isAdmin = player?.role === "admin";

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <PageHeader title="Club" subtitle="Athens Pickleball" />

        {/* Club hero banner */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <Text style={s.heroLabel}>WEEKLY SHOOTOUT LEAGUE</Text>
            <Text style={s.heroName}>Athens{"\n"}Pickleball</Text>
            <View style={s.heroTag}>
              <View style={s.dot} />
              <Text style={s.heroTagText}>Athens, GA</Text>
            </View>
          </View>
          <Text style={{ fontSize: 64 }}>🏟️</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { value: "Weekly", label: "Schedule" },
            { value: "4", label: "Courts" },
            { value: "Open", label: "Format" },
          ].map(({ value, label }) => (
            <View key={label} style={s.statCell}>
              <Text style={s.statValue}>{value}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Admin section */}
        {isAdmin && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.adminBadge}>
                <Text style={s.adminBadgeText}>ADMIN</Text>
              </View>
              <Text style={s.sectionTitle}>Administration</Text>
            </View>
            <AdminCard
              emoji="⚙️"
              title="Edit Club Settings"
              description="Update name, location, courts, and schedule"
              onPress={() => {}}
            />
            <AdminCard
              emoji="📢"
              title="Announcements"
              description="Broadcast messages to all league members"
              onPress={() => {}}
            />
          </View>
        )}

        {/* Info section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>About the League</Text>
          {[
            { icon: "📍", text: "Memorial Park, Athens GA" },
            { icon: "📅", text: "Weekly sessions — check Sign-Ups tab" },
            { icon: "🏓", text: "Pyramid-style shootout format" },
            { icon: "🏆", text: "Win-based court advancement" },
          ].map(({ icon, text }) => (
            <View key={text} style={s.infoRow}>
              <Text style={{ fontSize: 16, marginRight: 12 }}>{icon}</Text>
              <Text style={s.infoText}>{text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },

  hero: {
    marginHorizontal: 20,
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  heroLeft: { flex: 1 },
  heroLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#10b981",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f1f5f9",
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  heroTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  heroTagText: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 24,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: "#f1f5f9",
  },
  statValue: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 2 },
  statLabel: { fontSize: 11, color: "#64748b", fontWeight: "600" },

  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  adminBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: { fontSize: 10, fontWeight: "800", color: "#d97706", letterSpacing: 0.5 },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 2 },
  cardDesc: { fontSize: 12, color: "#64748b", lineHeight: 18 },
  chevron: { fontSize: 22, color: "#cbd5e1", marginLeft: 8 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoText: { fontSize: 14, color: "#475569", flex: 1 },
});
