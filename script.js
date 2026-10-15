// ================= FIREBASE SDK =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBGlMIi85Gi2OgNw5Ps1yNFlIVjoYw5JDQ",
    authDomain: "nard-e8abc.firebaseapp.com",
    projectId: "nard-e8abc",
    storageBucket: "nard-e8abc.firebasestorage.app",
    messagingSenderId: "745402288330",
    appId: "1:745402288330:web:dd3707fefd70f9648ecc33"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= ELEMENTS =================
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const forgotForm = document.getElementById("forgotForm");
const dashboard = document.getElementById("dashboard");

const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");
const forgotMessage = document.getElementById("forgotMessage");

const views = { signup: signupForm, login: loginForm, forgot: forgotForm, dashboard: dashboard };

// Show one view, hide the others
function showView(name) {
    Object.entries(views).forEach(([key, el]) => {
        el.classList.toggle("hidden", key !== name);
    });
}

function setMessage(el, text, type = "error") {
    el.textContent = text;
    el.className = "message " + (text ? type : "");
}

function clearMessages() {
    [loginMessage, signupMessage, forgotMessage].forEach(el => setMessage(el, ""));
}

// Friendly Firebase error text
function friendlyError(err) {
    switch (err.code) {
        case "auth/email-already-in-use": return "That email is already registered.";
        case "auth/invalid-email": return "Please enter a valid email address.";
        case "auth/weak-password": return "Password is too weak (min. 8 characters).";
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found": return "Incorrect email or password!";
        case "auth/too-many-requests": return "Too many attempts. Please try again later.";
        case "auth/network-request-failed": return "Network error. Check your connection.";
        default: return err.message || "Something went wrong.";
    }
}

// ================= NAVIGATION =================
document.getElementById("showSignup").addEventListener("click", e => {
    e.preventDefault(); clearMessages(); showView("signup");
});
document.getElementById("showLogin").addEventListener("click", e => {
    e.preventDefault(); clearMessages(); showView("login");
});
document.getElementById("showForgot").addEventListener("click", e => {
    e.preventDefault(); clearMessages();
    // carry over whatever email was typed in login
    document.getElementById("forgotEmail").value =
        document.getElementById("loginEmail").value.trim();
    showView("forgot");
});
document.getElementById("backToLogin").addEventListener("click", e => {
    e.preventDefault(); clearMessages(); showView("login");
});

// Open the register form when the link ends with #signup
if (window.location.hash === "#signup") {
    showView("signup");
}

// ================= SHOW / HIDE PASSWORD =================
document.getElementById("showSignupPassword").addEventListener("change", function () {
    const type = this.checked ? "text" : "password";
    document.getElementById("signupPassword").type = type;
    document.getElementById("confirmPassword").type = type;
});
document.getElementById("showLoginPassword").addEventListener("change", function () {
    document.getElementById("loginPassword").type = this.checked ? "text" : "password";
});

// ================= SIGN UP =================
let isSigningUp = false; // stops auth listener from jumping to dashboard mid-signup

signupForm.addEventListener("submit", async e => {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const birthday = document.getElementById("birthday").value;
    const mobile = document.getElementById("mobile").value.trim().replace(/[\s-]/g, "");
    const password = document.getElementById("signupPassword").value;
    const confirm = document.getElementById("confirmPassword").value;

    if (password.length < 8) return setMessage(signupMessage, "Password must be at least 8 characters long!");
    if (password !== confirm) return setMessage(signupMessage, "Passwords do not match!");
    if (!/^\+?\d{10,15}$/.test(mobile)) return setMessage(signupMessage, "Enter a valid mobile number.");
    if (new Date(birthday) > new Date()) return setMessage(signupMessage, "Birthday cannot be in the future.");

    const btn = document.getElementById("signupBtn");
    btn.disabled = true;
    isSigningUp = true;

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: fullName });

        // Save extra info (never save the password yourself - Firebase handles it)
        await setDoc(doc(db, "users", cred.user.uid), {
            fullName,
            email,
            birthday,
            mobile,
            createdAt: serverTimestamp()
        });

        await signOut(auth); // go to login like before
        signupForm.reset();
        loginForm.reset();
        document.getElementById("loginEmail").value = email;
        showView("login");
        setMessage(loginMessage, "Account created! Please log in.", "success");
    } catch (err) {
        setMessage(signupMessage, friendlyError(err));
    } finally {
        isSigningUp = false;
        btn.disabled = false;
    }
});

// ================= LOGIN =================
loginForm.addEventListener("submit", async e => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const remember = document.getElementById("rememberMe").checked;

    const btn = document.getElementById("loginBtn");
    btn.disabled = true;

    try {
        // Remember me = stay logged in after closing the browser
        await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.reset();
        setMessage(loginMessage, "");
        // onAuthStateChanged shows the dashboard
    } catch (err) {
        setMessage(loginMessage, friendlyError(err));
    } finally {
        btn.disabled = false;
    }
});

// ================= FORGOT PASSWORD =================
forgotForm.addEventListener("submit", async e => {
    e.preventDefault();

    const email = document.getElementById("forgotEmail").value.trim();
    const btn = document.getElementById("forgotBtn");
    btn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, email);
        setMessage(forgotMessage, "If that email is registered, a reset link has been sent. Check your inbox and spam.", "success");
    } catch (err) {
        // Don't reveal whether an email exists
        if (err.code === "auth/user-not-found") {
            setMessage(forgotMessage, "If that email is registered, a reset link has been sent. Check your inbox and spam.", "success");
        } else {
            setMessage(forgotMessage, friendlyError(err));
        }
    } finally {
        btn.disabled = false;
    }
});

// ================= LOGOUT =================
document.getElementById("logoutButton").addEventListener("click", async () => {
    await signOut(auth);
    showView("login");
    setMessage(loginMessage, "You have logged out.", "success");
});

// ================= AUTH STATE (dashboard) =================
onAuthStateChanged(auth, async user => {
    if (isSigningUp) return;

    if (!user) {
        if (!dashboard.classList.contains("hidden")) showView("login");
        return;
    }

    // Load saved profile from Firestore
    let data = {};
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) data = snap.data();
    } catch (err) {
        console.error("Could not load profile:", err);
    }

    document.getElementById("outputName").textContent = data.fullName || user.displayName || "-";
    document.getElementById("outputEmail").textContent = user.email;
    document.getElementById("outputBirthday").textContent = data.birthday || "-";
    document.getElementById("outputMobile").textContent = data.mobile || "-";

    showView("dashboard");
});
