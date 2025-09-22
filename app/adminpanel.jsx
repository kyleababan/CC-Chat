// app/adminpanel.jsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { auth, db } from "../firebaseConfig";
import { ref, get, child, update, remove } from "firebase/database";
import { signOut } from "firebase/auth";
import { MaterialIcons } from "@expo/vector-icons";

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData, setEditData] = useState({ fullname: "", year: "", course: "", role: "" });
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await get(child(ref(db), "users"));
        if (snap.exists()) {
          const data = snap.val();
          const list = Object.entries(data).map(([uid, info]) => ({
            uid,
            ...info,
          }));
          setUsers(list);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/signin");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleVerifyToggle = async (user) => {
    try {
      await update(ref(db, `users/${user.uid}`), { verified: !user.verified });
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid ? { ...u, verified: !user.verified } : u
        )
      );
    } catch (err) {
      console.error("Verification toggle error:", err);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditData({
      fullname: user.fullname || "",
      year: user.year || "",
      course: user.course || "",
      role: user.role || "",
    });
    setModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    try {
      await update(ref(db, `users/${selectedUser.uid}`), editData);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid ? { ...u, ...editData } : u
        )
      );
      setModalVisible(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Error saving edit:", err);
    }
  };

  const handleDelete = async (user) => {
    try {
      // Prevent deleting admins
      const adminSnap = await get(child(ref(db), `admins/${user.uid}`));
      if (adminSnap.exists()) {
        Alert.alert("Error", "You cannot delete an admin account.");
        return;
      }

      await remove(ref(db, `users/${user.uid}`));
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <Text style={styles.title}>Admin Panel</Text>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#2c3e50" />
        </TouchableOpacity>
      </View>

      {/* User Table */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.uid}
        ListHeaderComponent={() => (
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell]}>Name</Text>
            <Text style={[styles.cell, styles.headerCell]}>Year</Text>
            <Text style={[styles.cell, styles.headerCell]}>Course</Text>
            <Text style={[styles.cell, styles.headerCell]}>Role</Text>
            <Text style={[styles.cell, styles.headerCell]}>Verified</Text>
            <Text style={[styles.cell, styles.headerCell]}>Actions</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.cell}>{item.fullname}</Text>
            <Text style={styles.cell}>{item.year}</Text>
            <Text style={styles.cell}>{item.course}</Text>
            <Text style={styles.cell}>{item.role}</Text>
            <Text style={styles.cell}>{item.verified ? "Yes" : "No"}</Text>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() => handleVerifyToggle(item)}
                style={styles.actionButton}
              >
                <Text style={{ color: "#2980b9" }}>
                  {item.verified ? "Unverify" : "Verify"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleEdit(item)}
                style={styles.actionButton}
              >
                <Text style={{ color: "#27ae60" }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={styles.actionButton}
              >
                <Text style={{ color: "#e74c3c" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit User</Text>
            <TextInput
              style={styles.input}
              value={editData.fullname}
              onChangeText={(t) => setEditData({ ...editData, fullname: t })}
              placeholder="Full Name"
            />
            <TextInput
              style={styles.input}
              value={editData.year}
              onChangeText={(t) => setEditData({ ...editData, year: t })}
              placeholder="Year"
            />
            <TextInput
              style={styles.input}
              value={editData.course}
              onChangeText={(t) => setEditData({ ...editData, course: t })}
              placeholder="Course"
            />
            <TextInput
              style={styles.input}
              value={editData.role}
              onChangeText={(t) => setEditData({ ...editData, role: t })}
              placeholder="Role"
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#27ae60" }]}
              onPress={handleSaveEdit}
            >
              <Text style={{ color: "#fff" }}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#bdc3c7" }]}
              onPress={() => setModalVisible(false)}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa", paddingTop: 50 },
  navbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 50,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  title: { fontWeight: "bold", fontSize: 18, color: "#2c3e50" },

  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  headerRow: { backgroundColor: "#ecf0f1" },
  cell: { flex: 1, textAlign: "center", color: "#2c3e50" },
  headerCell: { fontWeight: "bold" },

  actions: { flexDirection: "row", justifyContent: "center", flex: 2 },
  actionButton: { marginHorizontal: 5 },

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
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 8,
    width: "100%",
    marginBottom: 10,
  },
  saveButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    width: "100%",
    alignItems: "center",
  },
});
