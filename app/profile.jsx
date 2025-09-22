// app/profile.jsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebaseConfig";
import { get, ref, child } from "firebase/database";
import { signOut } from "firebase/auth";
import { MaterialIcons } from "@expo/vector-icons";
import * as serverService from "../services/serverService";

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [servers, setServers] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await get(child(ref(db), `users/${user.uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setProfile({ uid: user.uid, ...data });
      }

      const userServers = await serverService.getUserServers(user.uid);
      setServers(userServers);
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/signin");
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Navbar (Profile + Logout) */}
      <View style={styles.navbar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.replace("/profile")}
          style={styles.iconButton}
        >
          <MaterialIcons name="person" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
          <MaterialIcons name="logout" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      {/* Servers Sidebar */}
      <View style={styles.serverSidebar}>
        {/* Home button */}
        <TouchableOpacity
          style={styles.serverButton}
          onPress={() => router.replace("/home")}
        >
          <MaterialIcons name="home" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Server list */}
        {servers.map((s) => (
          <TouchableOpacity
            key={s.code}
            style={styles.serverButton}
            onPress={() => router.push({ pathname: "/chat", params: { serverId: s.code } })}
          >
            <Text style={styles.serverText}>
              {s.name.slice(0, 2).toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Profile Content */}
      <View style={styles.main}>
        <Text style={styles.title}>Profile</Text>
        {profile ? (
          <>
            <Text style={styles.field}>Name: {profile.fullname}</Text>
            <Text style={styles.field}>Year: {profile.year || "N/A"}</Text>
            <Text style={styles.field}>Course: {profile.course || "N/A"}</Text>
            <Text style={styles.field}>Role: {profile.role}</Text>
            <Text style={styles.field}>
              Verified: {profile.verified ? "Yes" : "No"}
            </Text>
          </>
        ) : (
          <Text>Loading...</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f5f6fa", paddingTop: 50 },

  // Navbar
  navbar: {
    position: "absolute",
    top: 0, left: 0, right: 0, height: 50, backgroundColor: "#fff",
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    paddingHorizontal: 15, borderBottomWidth: 1, borderColor: "#ddd", zIndex: 10,
  },
  iconButton: { marginLeft: 15 },

  // Servers Sidebar
  serverSidebar: {
    width: 60, backgroundColor: "#2c3e50", paddingTop: 10,
    alignItems: "center",
  },
  serverButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#34495e",
    justifyContent: "center", alignItems: "center", marginBottom: 15,
  },
  serverText: { color: "#fff", fontWeight: "bold" },

  // Profile Content
  main: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20, color: "#2c3e50" },
  field: { fontSize: 16, marginBottom: 10, color: "#2c3e50" },
});
