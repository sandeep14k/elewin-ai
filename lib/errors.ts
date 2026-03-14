export function getFriendlyAuthError(error: any): string {
  // Log the raw error to the console so you can see exactly what Firebase is complaining about
  console.error("Raw Auth Error:", error);

  const code = error?.code;

  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Your password is too weak. It must be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Developer Error: Email/Password sign-in is disabled in Firebase Console.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Invalid email or password. Please try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    default:
      // If we don't have a custom message, show the actual Firebase error message
      // so the user (and you) aren't left guessing!
      return error?.message ? error.message.replace("Firebase: ", "") : "An unexpected error occurred. Please try again.";
  }
}