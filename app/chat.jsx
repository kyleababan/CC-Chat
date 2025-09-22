// app/chat.jsx

import { useEffect, useState } from "react";

import {

  View,

  Text,

  TextInput,

  TouchableOpacity,

  StyleSheet,

  FlatList,

  Modal,

  Image,

  Alert,

  Platform,

} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { auth, db } from "../firebaseConfig";

import { ref, push, onValue, get, child, remove } from "firebase/database";

import { MaterialIcons } from "@expo/vector-icons";

import * as serverService from "../services/serverService";

import * as Clipboard from "expo-clipboard";



export default function Chat() {

  const { serverId } = useLocalSearchParams();

  const router = useRouter();



  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState("");

  const [activeChannel, setActiveChannel] = useState("chat");

  const [role, setRole] = useState("Student");

  const [serverName, setServerName] = useState("");

  const [servers, setServers] = useState([]);

  const [showSettings, setShowSettings] = useState(false);

  const [selectedProfile, setSelectedProfile] = useState(null);

  const [showMembers, setShowMembers] = useState(false);

  const [members, setMembers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle



  const user = auth.currentUser;



  // Load server + role + list of servers

  useEffect(() => {

    const loadData = async () => {

      const snap = await get(child(ref(db), `servers/${serverId}`));

      if (snap.exists()) setServerName(snap.val().name);



      // Get role from server membership first
      const memberSnap = await get(

        child(ref(db), `servers/${serverId}/members/${user.uid}`)

      );
      
      let userRole = "Student"; // default
      
      if (memberSnap.exists()) {
        const roleData = memberSnap.val();
        console.log("🔍 Server membership role:", roleData.role);
        userRole = roleData.role;
      }
      
      // Also check the user's profile role as fallback
      const userSnap = await get(child(ref(db), `users/${user.uid}`));
      if (userSnap.exists()) {
        const userData = userSnap.val();
        console.log("🔍 User profile role:", userData.role);
        
        // Use the higher privilege role (Officer over Student)
        if (userData.role === "Officer" || userRole === "Officer") {
          userRole = "Officer";
        }
      }
      
      console.log("🔍 Final role being set:", userRole);
      setRole(userRole);



      const userServers = await serverService.getUserServers(user.uid);

      setServers(userServers);

    };

    loadData();

  }, [serverId]);



  // Subscribe to messages

  useEffect(() => {

    const messagesRef = ref(

      db,

      `servers/${serverId}/channels/${activeChannel}/messages`

    );

    const unsubscribe = onValue(messagesRef, (snapshot) => {

      if (snapshot.exists()) {

        const data = snapshot.val();

        const formatted = Object.entries(data)

          .map(([id, msg]) => ({ id, ...msg }))

          .sort((a, b) => a.timestamp - b.timestamp);

        setMessages(formatted);

      } else {

        setMessages([]);

      }

    });



    return () => unsubscribe();

  }, [serverId, activeChannel]);



  // Subscribe to members (auto-updates Members modal)

  useEffect(() => {

    const membersRef = ref(db, `servers/${serverId}/members`);

    const unsubscribe = onValue(membersRef, async (snapshot) => {

      if (snapshot.exists()) {

        const data = snapshot.val();

        const memberEntries = await Promise.all(

          Object.entries(data).map(async ([uid, info]) => {

            const userSnap = await get(child(ref(db), `users/${uid}`));

            if (userSnap.exists()) {
              const userData = userSnap.val();
              console.log("🔍 Member role for", uid, ":", userData.role);
              return { uid, ...userData, role: userData.role }; // Use user profile role
            } else {
              return { uid, role: info.role };
            }
          })
        );
        console.log("🔍 Updated members list:", memberEntries);
        setMembers(memberEntries);

      } else {

        setMembers([]);

      }

    });



    return () => unsubscribe();

  }, [serverId]);



  const handleSend = async () => {

    if (!newMessage.trim()) return;



    if (activeChannel === "announcement" && role !== "Officer") {

      alert("Only Officers can post in announcements.");

      return;

    }



    let senderName = "Unknown";

    try {

      const userSnap = await get(child(ref(db), `users/${user.uid}`));

      if (userSnap.exists()) senderName = userSnap.val().fullname;

    } catch (err) {

      console.error("Error fetching sender name:", err);

    }



    const msgRef = ref(

      db,

      `servers/${serverId}/channels/${activeChannel}/messages`

    );

    await push(msgRef, {

      sender: user.uid,

      senderName,

      text: newMessage.trim(),

      timestamp: Date.now(),

    });

    setNewMessage("");

  };



  const handleLeaveServer = async () => {

    await remove(ref(db, `servers/${serverId}/members/${user.uid}`));

    alert("You have left the server.");

    setShowSettings(false);

    router.replace("/home");

  };



  const handleShowProfile = async (uid) => {

    try {

      const snap = await get(child(ref(db), `users/${uid}`));

      if (snap.exists()) {

        setSelectedProfile({ uid, ...snap.val() });

      }

    } catch (err) {

      console.error("Error fetching user profile:", err);

    }

  };



  // 🚨 Kick user (Officer only, with debug logs)

  const handleKickUser = async (uid) => {
    // Double-check permission
    if (role !== "Officer") {
      if (Platform.OS === "web") {
        window.alert("Permission Denied: Only Officers can kick members.");
      } else {
        Alert.alert("Permission Denied", "Only Officers can kick members.");
      }
      return;
    }

    // Prevent kicking yourself
    if (uid === user.uid) {
      if (Platform.OS === "web") {
        window.alert("Cannot Kick Self: You cannot kick yourself from the server.");
      } else {
        Alert.alert("Cannot Kick Self", "You cannot kick yourself from the server.");
      }
      return;
    }

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to kick this user from the server?"
      );
      if (!confirmed) return;
      try {
        const memberRef = ref(db, `servers/${serverId}/members/${uid}`);
        const memberSnap = await get(memberRef);
        if (!memberSnap.exists()) {
          window.alert("User Not Found: This user is not a member of the server.");
          return;
        }
        await remove(memberRef);
        window.alert("Success: User has been kicked from the server.");
        setSelectedProfile(null);
      } catch (err) {
        console.error("Kick failed:", err);
        window.alert(`Kick Failed: ${err?.message || "Unknown error occurred."}`);
      }
      return;
    }

    // Native (iOS/Android) confirmation
    Alert.alert(
      "Kick User",
      "Are you sure you want to kick this user from the server?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Kick",
          style: "destructive",
          onPress: async () => {
            try {
              const memberRef = ref(db, `servers/${serverId}/members/${uid}`);
              const memberSnap = await get(memberRef);
              if (!memberSnap.exists()) {
                Alert.alert("User Not Found", "This user is not a member of the server.");
                return;
              }
              await remove(memberRef);
              Alert.alert("Success", "User has been kicked from the server.");
              setSelectedProfile(null);
            } catch (err) {
              console.error("Kick failed:", err);
              Alert.alert("Kick Failed", err.message || "Unknown error occurred.");
            }
          }
        }
      ]
    );
  };



  return (

    <View style={styles.container}>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <View style={styles.sidebarOverlay}>
          {/* Tappable backdrop to close */}
          <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} activeOpacity={1} onPress={() => setShowSidebar(false)} />
          {/* Servers sidebar */}
          <View style={styles.serverSidebar}>
            <TouchableOpacity
              style={styles.serverButton}
              onPress={() => {
                setShowSidebar(false);
                router.replace("/home");
              }}
            >
              <Image
                source={require("../assets/home.png")}
                style={{ width: 20, height: 20, tintColor: "#fff" }}
              />
            </TouchableOpacity>

            {servers.map((s) => (
              <TouchableOpacity
                key={s.code}
                style={[
                  styles.serverButton,
                  s.code === serverId && styles.activeServer,
                ]}
                onPress={() => {
                  setShowSidebar(false);
                  router.replace(`/chat?serverId=${s.code}`);
                }}
              >
                <Text style={styles.serverText}>{s.name.slice(0, 2).toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Channels sidebar */}
          <View style={styles.channelSidebar}>
            {/* Server title in sidebar */}
            <Text style={styles.sidebarServerTitle}>{serverName}</Text>
            <TouchableOpacity
              style={[
                styles.channelButton,
                activeChannel === "chat" && styles.activeChannel,
              ]}
              onPress={() => {
                setActiveChannel("chat");
                setShowSidebar(false);
              }}
            >
              <Text
                style={[
                  styles.hash,
                  activeChannel === "chat" && styles.activeChannelText,
                ]}
              >
                #
              </Text>
              <Text
                style={[
                  styles.channelText,
                  activeChannel === "chat" && styles.activeChannelText,
                ]}
              >
                Chat
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.channelButton,
                activeChannel === "announcement" && styles.activeChannel,
              ]}
              onPress={() => {
                setActiveChannel("announcement");
                setShowSidebar(false);
              }}
            >
              <Text
                style={[
                  styles.hash,
                  activeChannel === "announcement" && styles.activeChannelText,
                ]}
              >
                #
              </Text>
              <Text
                style={[
                  styles.channelText,
                  activeChannel === "announcement" && styles.activeChannelText,
                ]}
              >
                Announcements
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat area */}

      <View style={styles.chatArea}>

        <View style={styles.topBar}>
          {/* Mobile Menu Button */}
          <TouchableOpacity 
            onPress={() => setShowSidebar(!showSidebar)}
            style={styles.menuButton}
          >
            <MaterialIcons name="menu" size={24} color="#2c3e50" />
          </TouchableOpacity>

          <Text style={styles.serverName}>{activeChannel === "announcement" ? "Announcements" : "Chat"}</Text>

          <View style={{ flexDirection: "row", gap: 15 }}>

            <TouchableOpacity onPress={() => setShowMembers(true)}>

              <MaterialIcons name="group" size={22} color="#2c3e50" />

            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSettings(true)}>

              <MaterialIcons name="settings" size={22} color="#2c3e50" />

            </TouchableOpacity>

          </View>

        </View>



        <FlatList

          data={messages}

          keyExtractor={(item) => item.id}

          renderItem={({ item }) => (

            <View

              style={[

                styles.message,

                item.sender === user.uid

                  ? styles.myMessage

                  : styles.theirMessage,

              ]}

            >

              <TouchableOpacity onPress={() => handleShowProfile(item.sender)}>

                <Text style={styles.sender}>{item.senderName}</Text>

              </TouchableOpacity>

              <Text>{item.text}</Text>

            </View>

          )}

          contentContainerStyle={{ padding: 10 }}

        />



        <View style={styles.inputContainer}>

          <TextInput

            style={[

              styles.input,

              activeChannel === "announcement" && role !== "Officer"

                ? { backgroundColor: "#eee" }

                : {},

            ]}

            placeholder={

              activeChannel === "announcement" && role !== "Officer"

                ? "Read-only: Announcements"

                : "Type a message..."

            }

            value={newMessage}

            onChangeText={setNewMessage}

            editable={!(activeChannel === "announcement" && role !== "Officer")}

          />

          <TouchableOpacity

            style={styles.sendButton}

            onPress={handleSend}

            disabled={activeChannel === "announcement" && role !== "Officer"}

          >

            <Text style={{ color: "#fff", fontWeight: "bold" }}>Send</Text>

          </TouchableOpacity>

        </View>

      </View>



      {/* Server Settings */}

      <Modal visible={showSettings} transparent animationType="fade">

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Server Settings</Text>

            <Text>Invite Code: {serverId}</Text>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#3498db" }]}
              onPress={async () => {
                try {
                  await Clipboard.setStringAsync(String(serverId));
                  Alert.alert("Copied", "Invite code copied to clipboard");
                } catch (e) {}
              }}
            >
              <Text style={{ color: "#fff" }}>Copy Invite Code</Text>
            </TouchableOpacity>
            <TouchableOpacity

              style={[styles.actionButton, { backgroundColor: "#e74c3c" }]}

              onPress={handleLeaveServer}

            >

              <Text style={{ color: "#fff" }}>Leave Server</Text>

            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowSettings(false)}>

              <Text style={{ marginTop: 10, color: "#3498db" }}>Close</Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>



      {/* Members Modal */}

      <Modal visible={showMembers} transparent animationType="fade">

        <View style={styles.modalOverlay}>

          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Members</Text>

            {members.map((m) => (

              <TouchableOpacity

                key={m.uid}

                onPress={() => {

                  setSelectedProfile(m);

                  setShowMembers(false);

                }}

              >

                <Text>

                  {m.fullname || "Unknown"} ({m.role})

                </Text>

              </TouchableOpacity>

            ))}

            <TouchableOpacity onPress={() => setShowMembers(false)}>

              <Text style={{ marginTop: 10, color: "#3498db" }}>Close</Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>



      {/* Profile Popup */}

      <Modal

        visible={!!selectedProfile}

        transparent

        animationType="fade"

        onRequestClose={() => setSelectedProfile(null)}

      >

        <View style={styles.modalOverlay}>

          <View style={styles.profileCard}>

            <Text style={styles.profileName}>{selectedProfile?.fullname}</Text>

            <Text>Role: {selectedProfile?.role || "N/A"}</Text>

            <Text>Year: {selectedProfile?.year || "N/A"}</Text>

            <Text>Course: {selectedProfile?.course || "N/A"}</Text>



            {(() => {
              console.log("🔍 Kick button visibility check:");
              console.log("🔍 Current role:", role);
              console.log("🔍 Role === 'Officer':", role === "Officer");
              console.log("🔍 Selected profile UID:", selectedProfile?.uid);
              console.log("🔍 Current user UID:", user.uid);
              console.log("🔍 Not self:", selectedProfile?.uid !== user.uid);
              console.log("🔍 Should show kick button:", role === "Officer" && selectedProfile?.uid !== user.uid);
              return role === "Officer" && selectedProfile?.uid !== user.uid;
            })() && (
              <TouchableOpacity

                style={[

                  styles.actionButton,

                  { backgroundColor: "#e74c3c", marginTop: 10 },

                ]}

                onPress={() => handleKickUser(selectedProfile.uid)}

              >

                <Text style={{ color: "#fff" }}>Kick User</Text>

              </TouchableOpacity>

            )}



            <TouchableOpacity

              onPress={() => setSelectedProfile(null)}

              style={styles.actionButton}

            >

              <Text>Close</Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </View>

  );

}

const styles = StyleSheet.create({

  container: { flex: 1, flexDirection: "row", backgroundColor: "#f5f6fa" },

  // Mobile sidebar overlay
  sidebarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.3)", // Semi-transparent background
  },

  // Menu button
  menuButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },

  // Servers

  serverSidebar: {

    width: 60,

    backgroundColor: "#2c3e50",

    alignItems: "center",

    paddingTop: 50, // Moved down from status bar

  },

  serverButton: {

    width: 50, // Increased size

    height: 50, // Increased size

    borderRadius: 25, // Increased border radius

    backgroundColor: "#34495e",

    justifyContent: "center",

    alignItems: "center",

    marginBottom: 15,

  },

  serverText: { color: "#fff", fontWeight: "bold" },

  activeServer: { backgroundColor: "#3498db" },



  // Channels

  channelSidebar: {

    width: 180,

    backgroundColor: "#2f3136",

    borderRightWidth: 1,

    borderColor: "#222",

    paddingTop: 50, // Moved down from status bar

  },

  channelButton: {

    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 12, // Increased padding

    paddingHorizontal: 15, // Increased padding

    borderRadius: 6, // Increased border radius

    marginBottom: 6, // Increased margin

  },

  hash: { color: "#72767d", marginRight: 8, fontSize: 18 }, // Increased font size

  channelText: { fontSize: 16, color: "#b9bbbe" }, // Increased font size

  activeChannel: { backgroundColor: "#40444b" },

  activeChannelText: { color: "#fff", fontWeight: "bold" },

  sidebarServerTitle: { color: "#fff", fontWeight: "bold", paddingHorizontal: 12, paddingVertical: 10 },



  // Chat

  chatArea: { flex: 1 },

  topBar: {

    height: 60, // Increased height for mobile

    backgroundColor: "#fff",

    borderBottomWidth: 1,

    borderColor: "#ddd",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 15,

    paddingTop: 10, // Add padding from top

  },

  serverName: { fontWeight: "bold", fontSize: 18, color: "#2c3e50" }, // Increased font size



  message: { marginBottom: 10, padding: 10, borderRadius: 8, maxWidth: "75%" },

  myMessage: { backgroundColor: "#d1f5d3", alignSelf: "flex-end" },

  theirMessage: { backgroundColor: "#fff", alignSelf: "flex-start" },

  sender: { fontWeight: "bold", marginBottom: 3, fontSize: 14 }, // Increased font size



  inputContainer: {

    flexDirection: "row",

    padding: 15, // Increased padding

    paddingBottom: 25, // Extra bottom padding to avoid mobile nav buttons

    borderTopWidth: 1,

    borderColor: "#ddd",

    backgroundColor: "#fff",

  },

  input: {

    flex: 1,

    borderWidth: 1,

    borderColor: "#ccc",

    borderRadius: 25, // Increased border radius

    paddingHorizontal: 20, // Increased padding

    paddingVertical: 12, // Added vertical padding

    marginRight: 10,

    backgroundColor: "#fff",

    fontSize: 16, // Bigger text

  },

  sendButton: {

    backgroundColor: "#3498db",

    borderRadius: 25, // Increased border radius

    paddingHorizontal: 20, // Increased padding

    paddingVertical: 12, // Added vertical padding

    justifyContent: "center",

    alignItems: "center",

    minWidth: 60, // Minimum width for touch

  },



  // Modals

  modalOverlay: {

    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "rgba(0,0,0,0.4)",

  },

  modalCard: {

    backgroundColor: "#fff",

    padding: 20,

    borderRadius: 12,

    width: "80%",

    alignItems: "center",

  },

  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

  actionButton: {

    marginTop: 15,

    padding: 15, // Increased padding

    borderRadius: 10, // Increased border radius

    backgroundColor: "#eee",

    minHeight: 44, // Minimum touch target size

  },



  profileCard: {

    backgroundColor: "#fff",

    padding: 20,

    borderRadius: 12,

    width: "70%",

    alignItems: "center",

  },

  profileName: { fontSize: 18, fontWeight: "bold", marginBottom: 5 },

});