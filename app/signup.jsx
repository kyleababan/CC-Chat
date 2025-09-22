import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ref, set } from "firebase/database";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebaseConfig";

export default function SignUp() {
  const router = useRouter();
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [year, setYear] = useState("");
  const [course, setCourse] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Student"); // default role

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignUp = async () => {
    // ✅ Validate empty fields
    if (!fullname.trim() || !email.trim() || !year.trim() || !course.trim() || !password.trim()) {
      showAlert("Missing Information", "Please fill in all fields before signing up.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await set(ref(db, "users/" + uid), {
        fullname,
        email,
        year,
        course,
        role,
        verified: role === "Student" ? true : false, // only auto-verify Students
      });

      console.log("User registered:", uid, "Role:", role);
      showAlert("Success", "Account created successfully! Please sign in.");
      router.push("/signin"); 
    } catch (error) {
      console.error("Error signing up:", error.code, error.message);

      if (error.code === "auth/email-already-in-use") {
        showAlert("Email In Use", "This email is already registered. Please use a different one.");
      } else if (error.code === "auth/invalid-email") {
        showAlert("Invalid Email", "Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        showAlert("Weak Password", "Password should be at least 6 characters long.");
      } else {
        showAlert("Sign Up Error", error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>

      <TextInput style={styles.input} placeholder="Full Name" value={fullname} onChangeText={setFullname} />
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextInput style={styles.input} placeholder="Year (1st, 2nd, 3rd, 4th)" value={year} onChangeText={setYear} />
      <TextInput style={styles.input} placeholder="Course (BSIT, BSHM, BSED)" value={course} onChangeText={setCourse} />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {/* Role Selector */}
      <View style={styles.roleContainer}>
        <TouchableOpacity style={[styles.roleButton, role === "Student" && styles.selectedRole]} onPress={() => setRole("Student")}>
          <Text style={styles.roleText}>Student</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.roleButton, role === "Officer" && styles.selectedRole]} onPress={() => setRole("Officer")}>
          <Text style={styles.roleText}>Officer</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/signin")}>
        <Text style={styles.linkText}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f6fa", paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#2c3e50", marginBottom: 20, textAlign: "center" },
  input: { width: "80%", height: 45, borderColor: "#bdc3c7", borderWidth: 1, borderRadius: 8, marginBottom: 15, paddingHorizontal: 10, backgroundColor: "#fff" },
  roleContainer: { flexDirection: "row", justifyContent: "space-between", width: "80%", marginBottom: 15 },
  roleButton: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "#bdc3c7", marginHorizontal: 5, alignItems: "center", backgroundColor: "#ecf0f1" },
  selectedRole: { backgroundColor: "#3498db" },
  roleText: { color: "#2c3e50", fontWeight: "bold" },
  signUpButton: { backgroundColor: "#2ecc71", padding: 12, borderRadius: 8, width: "80%", alignItems: "center", marginBottom: 15 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  linkText: { color: "#3498db", fontSize: 14, marginTop: 10 },
});
