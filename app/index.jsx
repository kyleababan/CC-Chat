import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to CChat</Text>
      <Text style={styles.subtitle}>Your academic communication hub</Text>

      {/* Buttons in a row */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.signInButton} onPress={() => router.push("/signin")}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signUpButton} onPress={() => router.push("/signup")}>
          <Text style={styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f6fa",
    paddingHorizontal: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#2c3e50", 
    marginBottom: 10, 
    textAlign: "center" 
  },
  subtitle: { 
    fontSize: 16, 
    color: "#7f8c8d", 
    marginBottom: 40, 
    textAlign: "center" 
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "70%", // narrower row so buttons stay closer
  },
  signInButton: {
    backgroundColor: "#3498db",
    padding: 8,            // smaller padding
    borderRadius: 10,
    width: "35%",          // reduced size
    alignItems: "center",
  },
  signUpButton: {
    backgroundColor: "#2ecc71",
    padding: 8,
    borderRadius: 10,
    width: "35%",          // reduced size
    alignItems: "center",
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 14,          // smaller text
    fontWeight: "bold" 
  },
});