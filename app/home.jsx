import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { MaterialIcons } from "@expo/vector-icons";
import { get, ref, child } from "firebase/database";
import * as serverService from "../services/serverService";

export default function Home() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [servers, setServers] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [serverName, setServerName] = useState("");

  // Fetch profile + servers
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await get(child(ref(db), `users/${user.uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setProfile({
          uid: user.uid,
          ...data, // role stays as "Officer" / "Student"
        });

        const userServers = await serverService.getUserServers(user.uid);
        setServers(userServers);
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/signin");
    } catch (error) {
      console.error("Error signing out:", error.message);
    }
  };

  const handleCreateServer = async () => {
    if (!serverName.trim()) {
      Alert.alert("Missing Name", "Please enter a server name.");
      return;
    }
    try {
      const code = await serverService.createServer(
        profile.uid,
        serverName.trim(),
        profile.role // keep as "Officer" or "Student"
      );
      Alert.alert("Server Created", `Invite Code: ${code}`);
      setServerName("");
      setShowCreate(false);
      const updated = await serverService.getUserServers(profile.uid);
      setServers(updated);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleJoinServer = async () => {
    if (!inviteCode) return;
    try {
      await serverService.joinServer(
        profile.uid,
        profile.role, // keep as "Officer" or "Student"
        inviteCode.trim().toUpperCase()
      );
      setInviteCode("");
      setShowJoin(false);
      const updated = await serverService.getUserServers(profile.uid);
      setServers(updated);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          style={styles.iconButton}
        >
          <MaterialIcons name="person" size={24} color="#2c3e50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSignOut} style={styles.iconButton}>
          <MaterialIcons name="logout" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      {/* Sidebar */}
      <View style={styles.sidebar}>
        {/* Home button */}
        <TouchableOpacity
          style={styles.serverButton}
          onPress={() => router.push("/home")}
        >
          <Image
            source={require("../assets/home.png")}
            style={{ width: 20, height: 20, tintColor: "#fff" }}
          />
        </TouchableOpacity>

        {/* Officers only: Create button */}
        {profile?.role === "Officer" && profile?.verified && (
          <TouchableOpacity
            style={styles.serverButton}
            onPress={() => {
              setShowCreate(!showCreate);
              setShowJoin(false);
            }}
          >
            <Text style={styles.iconText}>＋</Text>
          </TouchableOpacity>
        )}

        {/* All users: Join button */}
        <TouchableOpacity
          style={styles.serverButton}
          onPress={() => {
            setShowJoin(!showJoin);
            setShowCreate(false);
          }}
        >
          <Text style={styles.iconText}>⇢</Text>
        </TouchableOpacity>

        {/* Server List */}
        {servers.map((s) => (
          <TouchableOpacity
            key={s.code}
            style={styles.serverButton}
            onPress={() =>
              router.push({ pathname: "/chat", params: { serverId: s.code } })
            }
          >
            <Text style={styles.serverInitials}>
              {s.name.slice(0, 2).toUpperCase() || "?"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main content */}
      <View style={styles.main}>
        <Text style={styles.welcome}>
          Welcome {profile?.fullname || "User"}!
        </Text>

        {/* Create Server */}
        {showCreate && profile?.role === "Officer" && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <TextInput
              value={serverName}
              onChangeText={setServerName}
              placeholder="Enter Server Name"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={handleCreateServer}
              style={[styles.actionButton, { backgroundColor: "#27ae60" }]}
            >
              <Text style={{ color: "#fff" }}>Create Server</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Join Server */}
        {showJoin && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="Enter Invite Code"
              style={styles.input}
            />
            <TouchableOpacity
              onPress={handleJoinServer}
              style={[styles.actionButton, { backgroundColor: "#2c3e50" }]}
            >
              <Text style={{ color: "#fff" }}>Join</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f5f6fa", paddingTop: 60 }, // Updated to match navbar height

  navbar: {
    position: "absolute",
    top: 0, left: 0, right: 0, height: 60, backgroundColor: "#fff", // Increased height
    flexDirection: "row", alignItems: "center", justifyContent: "flex-end",
    paddingHorizontal: 20, paddingTop: 10, // Added top padding and increased horizontal padding
    borderBottomWidth: 1, borderColor: "#ddd", zIndex: 10,
  },

  sidebar: {
    width: 60,
    backgroundColor: "#2c3e50",
    alignItems: "center",
    paddingTop: 10,
    borderRightWidth: 1,
    borderColor: "#2c3e50",
  },
  serverButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#34495e",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  iconText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  serverInitials: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  main: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcome: { fontSize: 22, fontWeight: "bold", color: "#2c3e50" },

  iconButton: { 
    marginLeft: 15, 
    padding: 8, // Added padding for better touch target
    borderRadius: 20, // Added border radius for better look
  },
  input: {
    borderWidth: 1, borderColor: "#ccc", padding: 8,
    width: "80%", marginBottom: 10, borderRadius: 6, backgroundColor: "#fff",
  },
  actionButton: { padding: 10, borderRadius: 5 },
});
