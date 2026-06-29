const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const http = require("http");
const mongoose = require("mongoose");
const convert = require("heic-convert");
const { Server } = require("socket.io");
const crypto = require('crypto');

const {
  initDb,
  generatePatientId,
  generateDoctorId,
  Hospital,
  User,
  ServiceType,
  Appointment,
  MedicalRecord,
  Prescription,
  Notification,
  MobileClinic,
  ClinicSchedule,
  Conversation,
  Message,
  Referral,
  DoctorRating,
  Setting,
  ContactMessage,
  TeamMember,
  Testimonial,
  JourneyMilestone,
  ResearchArticle,
  WaitingRoom,
  DonationSettings,
  DonationPost,
  EducationContent,
} = require("./db_config");
const { setupSwagger } = require("./swagger");

// Google Meet (Spaces API)
const { SpacesServiceClient } = require("@google-apps/meet");
const { GoogleAuth } = require("google-auth-library");

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string }
 *         password: { type: string }
 *     RegisterRequest:
 *       type: object
 *       required: [email, password, name]
 *       properties:
 *         email: { type: string }
 *         password: { type: string }
 *         name: { type: string }
 *         role: { type: string, enum: [patient] }
 *         phone: { type: string }
 *         district: { type: string }
 *     AppointmentRequest:
 *       type: object
 *       required: [doctorId, date, time]
 *       properties:
 *         doctorId: { type: string }
 *         serviceTypeId: { type: string }
 *         date: { type: string }
 *         time: { type: string }
 *         notes: { type: string }
 *         isVirtual: { type: boolean }
 *         location: { type: string }
 */

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Multer disk storage for file uploads
 * Used by image uploads and PDF uploads.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// ================= Encryption helpers (server-side) =================
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'dev-only-insecure-change-me-32bytes-min';
const MESSAGE_ENCRYPTION_ALGO = 'aes-256-gcm';

function getKey32() {
  return crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
}

function encryptText(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(MESSAGE_ENCRYPTION_ALGO, getKey32(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plainText), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([ciphertext, tag]).toString('base64'),
    iv: iv.toString('base64'),
    encryptionVersion: 'v1',
  };
}

function decryptText(ciphertextB64, ivB64) {
  const raw = Buffer.from(String(ciphertextB64), 'base64');
  if (raw.length < 16) throw new Error('ciphertext too short');
  const tag = raw.slice(raw.length - 16);
  const ciphertext = raw.slice(0, raw.length - 16);
  const iv = Buffer.from(String(ivB64), 'base64');
  const decipher = crypto.createDecipheriv(MESSAGE_ENCRYPTION_ALGO, getKey32(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

async function getUnreadMessageCount(conversationId, currentUserId) {
  const currentUserIdStr = currentUserId.toString();
  const messages = await Message.find({
    conversation_id: conversationId,
    sender_id: { $ne: currentUserId },
  }, { sender_id: 1, seenAtBy: 1 }).lean();

  return messages.filter((msg) =>
    !msg.seenAtBy?.some((seen) => seen.user_id.toString() === currentUserIdStr),
  ).length;
}


const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype =
      allowedTypes.test(file.mimetype) ||
      file.mimetype === "image/heic" ||
      file.mimetype === "image/heif";
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// PDF upload (separate filter/limits)
const uploadPdf = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for PDFs
  fileFilter: (req, file, cb) => {
    const allowedExt = /\.pdf$/i.test(path.extname(file.originalname));
    const allowedMime = file.mimetype === "application/pdf";
    if (allowedExt || allowedMime) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"));
    }
  },
});

// Super Admin
const SUPER_ADMIN_EMAIL = "admin@imbonieyelink.rw";
const SUPER_ADMIN_PASSWORD = "imboniadmin@";
const SUPER_ADMIN_NAME = "Super Admin";
const SUPER_ADMIN_ROLE = "super_admin";

const JWT_SECRET = process.env.JWT_SECRET || "imboni-eyelink-secret";
const PORT = process.env.PORT || 5000;

// Dynamic CORS origins based on environment
const FRONTEND_URL = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' 
  ? 'https://imboni-eyelink.vercel.app' 
  : 'http://localhost:8080');

const corsOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL_FOR_CORS || "*")
  .split(",")
  .map((o) => o.trim())
  .map((o) => {
    if (o.startsWith("CORS_ORIGIN=")) return o.slice("CORS_ORIGIN=".length);
    if (o.startsWith("FRONTEND_URL_FOR_CORS=")) return o.slice("FRONTEND_URL_FOR_CORS=".length);
    return o;
  })
  .filter(Boolean);

console.log(`[server] CORS origins:`, corsOrigins);
console.log(`[server] MONGO_URI configured:`, !!process.env.MONGO_URI);

const app = express();
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

// Health check (no auth required)
app.get('/health', (req, res) => {
  console.log('[health] Health check hit from:', req.ip);
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CSP: prevent clickjacking / framing by other origins.
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
  next();
});

app.use("/uploads", express.static(uploadsDir));

// ============== UPLOAD ENDPOINT ==============

/**
 * @swagger
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload image file (jpeg/png/gif/webp/heic/heif)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded
 */
app.post(
  "/api/upload",
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      console.error("[upload] No file uploaded");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      let finalFilename = req.file.filename;
      let finalPath = req.file.path;

      // Convert HEIC/HEIF to JPEG
      if (ext === ".heic" || ext === ".heif") {
        console.log(
          "[upload] Converting HEIC/HEIF to JPEG:",
          req.file.filename,
        );

        const inputBuffer = fs.readFileSync(req.file.path);
        const outputBuffer = await convert({
          buffer: inputBuffer,
          format: "JPEG",
          quality: 0.9,
        });

        finalFilename = req.file.filename.replace(/\.(heic|heif)$/i, ".jpg");
        finalPath = path.join(uploadsDir, finalFilename);

        fs.writeFileSync(finalPath, outputBuffer);
        fs.unlinkSync(req.file.path);

        console.log("[upload] HEIC converted to JPEG:", finalFilename);
      }

      console.log("[upload] File uploaded successfully:", finalFilename);
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${finalFilename}`;
      res.json({
        success: true,
        data: { url: fileUrl, filename: finalFilename },
      });
    } catch (error) {
      console.error("[upload] Error processing file:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Error processing file" });
    }
  },
  (err, req, res, next) => {
    console.error("[upload] Upload error:", err.message);
    res
      .status(400)
      .json({ success: false, message: err.message || "Upload failed" });
  },
);

/**
 * @swagger
 * /api/upload/pdf:
 *   post:
 *     tags: [Upload]
 *     summary: Upload PDF file
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: PDF uploaded
 */
app.post(
  "/api/upload/pdf",
  uploadPdf.single("file"),
  async (req, res) => {
    if (!req.file) {
      console.error("[upload/pdf] No file uploaded");
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    try {
      const finalFilename = req.file.filename;
      console.log("[upload/pdf] PDF uploaded successfully:", finalFilename);
      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${finalFilename}`;
      res.json({
        success: true,
        data: { url: fileUrl, filename: finalFilename },
      });
    } catch (error) {
      console.error("[upload/pdf] Error processing file:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Error processing file" });
    }
  },
  (err, req, res, next) => {
    console.error("[upload/pdf] Upload error:", err.message);
    res
      .status(400)
      .json({ success: false, message: err.message || "Upload failed" });
  },
);

// ============== MIDDLEWARE ==============
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: "Forbidden" });
  };
}

// Helper: create notification
async function createNotification(userId, title, body, type = "info") {
  await Notification.create({
    user_id: userId,
    title,
    body,
    type,
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeMedicationValue(value) {
  const text = String(value || "").trim();
  return text && text.toLowerCase() !== "as directed" ? text : "N/A";
}

// Google Meet helper - uses test room when set, otherwise returns Google Meet new room URL
async function createGoogleMeetSpace() {
  const testRoom = process.env.GOOGLE_MEET_TEST_ROOM;
  if (testRoom) {
    return `https://meet.google.com/${testRoom}`;
  }
  return `https://meet.google.com/new`;
}

// ============== AUTH ROUTES ==============

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Email and password required" });
  }

  // Super Admin
  if (email === SUPER_ADMIN_EMAIL && password === SUPER_ADMIN_PASSWORD) {
    const token = jwt.sign(
      { id: "super_admin", email: SUPER_ADMIN_EMAIL, role: SUPER_ADMIN_ROLE },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    return res.json({
      success: true,
      token,
      user: {
        id: "super_admin",
        email: SUPER_ADMIN_EMAIL,
        name: SUPER_ADMIN_NAME,
        role: SUPER_ADMIN_ROLE,
      },
      message: "Welcome back!",
    });
  }

  // DB user
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    if (user.status === "inactive") {
      return res
        .status(403)
        .json({ success: false, message: "Account is deactivated" });
    }
    if (user.status === "pending") {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Your account is pending approval. Please wait for an administrator to approve your account.",
        });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    user.last_login = new Date();
    await user.save();
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      success: true,
      token,
      user: {
        id: String(user._id),
        pt_id: user.pt_id || null,
        dr_id: user.dr_id || null,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Welcome back!",
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 */
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  if (req.user.id === "super_admin") {
    return res.json({
      success: true,
      user: {
        id: "super_admin",
        email: SUPER_ADMIN_EMAIL,
        name: SUPER_ADMIN_NAME,
        role: SUPER_ADMIN_ROLE,
      },
    });
  }
  try {
    const u = await User.findById(req.user.id).select(
      "email name role status hospital_id specialty pt_id dr_id",
    );
    if (!u)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const userData = { ...u.toObject(), id: u._id.toString() };
    delete userData._id;
    res.json({ success: true, user: userData });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Send verification email (stub)
async function sendVerificationEmail(to, name) {
  try {
    const verifyUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${Buffer.from(to).toString("base64")}`;
    console.info(
      `[email] Verification email stub for ${name} <${to}>: ${verifyUrl}`,
    );
  } catch (e) {
    console.warn("[email] Verification email not sent:", e.message);
  }
}

const registrationDistricts = new Set([
  "Kigali",
  "Nyarugenge",
  "Gasabo",
  "Kicukiro",
  "Nyanza",
  "Gisagara",
  "Nyaruguru",
  "Huye",
  "Nyamagabe",
  "Ruhango",
  "Muhanga",
  "Kamonyi",
  "Karongi",
  "Rusizi",
  "Rutsiro",
  "Nyamasheke",
  "Ngororero",
  "Rubavu",
  "Nyabihu",
  "Musanze",
  "Burera",
  "Gicumbi",
  "Rulindo",
  "Gakenke",
  "Bugesera",
  "Rwamagana",
  "Kayonza",
  "Ngoma",
  "Kirehe",
  "Nyagatare",
  "Gatsibo",
]);

function normalizeRegisterText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function buildRegisterUserData(user) {
  return {
    id: String(user._id),
    pt_id: user.pt_id || null,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone || null,
    district: user.district || null,
  };
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 */
app.post("/api/auth/register", async (req, res) => {
  const rawEmail = normalizeRegisterText(req.body?.email);
  const rawPassword = normalizeRegisterText(req.body?.password);
  const rawName = normalizeRegisterText(req.body?.name);
  const rawRole = normalizeRegisterText(req.body?.role || "patient");
  const rawPhone = normalizeRegisterText(req.body?.phone);
  const rawDistrict = normalizeRegisterText(req.body?.district);

  if (!rawEmail || !rawPassword || !rawName) {
    return res.json({ success: false, message: "Email, password and name are required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return res.json({ success: false, message: "Invalid email format" });
  }

  if (rawPassword.length < 6) {
    return res.json({ success: false, message: "Password must be at least 6 characters" });
  }

  if (rawRole !== "patient") {
    return res.json({ success: false, message: "Only patient self-registration is allowed" });
  }

  if (rawPhone && !/^\+?[0-9][0-9\s-]{6,19}$/.test(rawPhone)) {
    return res.json({ success: false, message: "Invalid phone number" });
  }

  if (rawDistrict && !registrationDistricts.has(rawDistrict)) {
    return res.json({ success: false, message: "Invalid district" });
  }

  const lower = rawEmail.toLowerCase();
  const phone = rawPhone ? rawPhone.trim() : null;
  const district = rawDistrict || null;

  try {
    const hash = await bcrypt.hash(rawPassword, 10);
    const raw = await User.findOneAndUpdate(
      { email: lower },
      {
        $set: {
          password_hash: hash,
          name: rawName,
          role: "patient",
          phone,
          district,
        },
        $setOnInsert: {
          email: lower,
          pt_id: await generatePatientId(),
          status: "pending",
        },
      },
      { new: true, upsert: true },
    );
    const user = raw;
    const wasExisting = raw && raw.status && raw.status !== "pending";
    if (wasExisting) {
      await User.findByIdAndUpdate(user._id, { $set: { status: "pending" } });
    }
    await sendVerificationEmail(lower, rawName);
    if (wasExisting) {
      await createNotification(
        user._id,
        "Account registration updated",
        "Your account is pending administrator approval. You will be able to log in once approved.",
        "info",
      );
    } else {
      await createNotification(
        user._id,
        "Account pending approval",
        "Your account is pending administrator approval. You will be able to log in once approved.",
        "info",
      );
    }
    const isAlreadyExisted = wasExisting || false;
    return res.status(isAlreadyExisted ? 200 : 201).json({
      success: true,
      alreadyExists: isAlreadyExisted,
      data: { user: buildRegisterUserData(user) },
      message: "Registration successful. Please wait for administrator approval before logging in.",
    });
  } catch (e) {
    const user = await User.findOne({ email: lower }).lean();
    if (user) {
      const hash = await bcrypt.hash(rawPassword, 10);
      await User.findByIdAndUpdate(user._id, {
        $set: {
          password_hash: hash,
          name: rawName,
          role: "patient",
          status: "pending",
          phone,
          district,
        },
      });
      const updatedUser = await User.findById(user._id).lean();
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        data: { user: buildRegisterUserData(updatedUser) },
        message: "Registration successful. Please wait for administrator approval before logging in.",
      });
    }
    return res.json({ success: false, message: e.message || "Registration failed" });
  }
});

 // ============== PUBLIC ROUTES ==============

// Donation public endpoints
app.get("/api/donations/settings", async (req, res) => {
  try {
    const row = await DonationSettings.findOne({}).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: {
        mtn_number: row?.mtn_number || "",
        airtel_number: row?.airtel_number || "",
        headline: row?.headline || "Support our eye care mission",
        description: row?.description || "",
        amount_labels: row?.amount_labels || {},
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get("/api/donations/posts", async (req, res) => {
  try {
    const rows = await DonationPost.find({ is_published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    const data = rows.map((r) => ({
      _id: r._id,
      title: r.title,
      content: r.content || "",
      image_urls: r.image_urls || [],
      is_published: r.is_published === true,
      order: r.order ?? 0,
      createdAt: r.createdAt,
    }));

    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Donation public create endpoint
app.post("/api/donations", async (req, res) => {
  try {
    const body = req.body || {};
    const provider = typeof body.provider === "string" ? body.provider : "";
    const amountValue = Number(body.amount_value ?? 0);
    const ussdReference = typeof body.ussd_reference === "string" ? body.ussd_reference.trim() : "";
    const donorName = typeof body.donorName === "string" ? body.donorName.trim() : "Anonymous";
    const donorEmail = typeof body.donorEmail === "string" ? body.donorEmail.trim() : "";

    if (!provider || (provider !== "mtn" && provider !== "airtel")) {
      return res.status(400).json({ success: false, message: "Invalid provider" });
    }
    if (!amountValue || amountValue <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }
    if (!ussdReference) {
      return res.status(400).json({ success: false, message: "USSD reference is required" });
    }

    const donation = await Donation.create({
      donor_name: donorName,
      donor_email: donorEmail,
      provider,
      amount_value: amountValue,
      amount_currency: "USD",
      ussd_reference: ussdReference,
      status: "submitted",
    });

    res.status(201).json({
      success: true,
      data: {
        _id: donation._id,
        donor_name: donation.donor_name,
        provider: donation.provider,
        amount_value: donation.amount_value,
        ussd_reference: donation.ussd_reference,
        status: donation.status,
        createdAt: donation.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============== ADMIN DONATION ENDPOINTS ==============

// Get admin donation settings
app.get("/api/admin/donations/settings", authMiddleware, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const row = await DonationSettings.findOne({}).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: {
        mtn_number: row?.mtn_number || "",
        airtel_number: row?.airtel_number || "",
        headline: row?.headline || "Support our eye care mission",
        description: row?.description || "",
        amount_labels: row?.amount_labels || {},
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Update admin donation settings
app.put("/api/admin/donations/settings", authMiddleware, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    if (typeof body.mtn_number === "string") updates.mtn_number = body.mtn_number;
    if (typeof body.airtel_number === "string") updates.airtel_number = body.airtel_number;
    if (typeof body.headline === "string") updates.headline = body.headline;
    if (typeof body.description === "string") updates.description = body.description;
    if (body.amount_labels && typeof body.amount_labels === "object") updates.amount_labels = body.amount_labels;

    const settings = await DonationSettings.findOneAndUpdate(
      {},
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    res.json({
      success: true,
      data: {
        mtn_number: settings.mtn_number || "",
        airtel_number: settings.airtel_number || "",
        headline: settings.headline || "Support our eye care mission",
        description: settings.description || "",
        amount_labels: settings.amount_labels || {},
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: list all donation posts
app.get("/api/admin/donations/posts", authMiddleware, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const rows = await DonationPost.find({}).sort({ order: 1, createdAt: -1 }).lean();
    const data = rows.map((r) => ({
      _id: r._id,
      title: r.title,
      content: r.content || "",
      image_urls: r.image_urls || [],
      is_published: r.is_published === true,
      order: r.order ?? 0,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: create donation post
app.post("/api/admin/donations/posts", authMiddleware, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content : "";
    const image_urls = Array.isArray(body.image_urls)
      ? body.image_urls.filter((u) => typeof u === "string" && u.trim())
      : [];
    const is_published = body.is_published === true;
    const order = Number(body.order ?? 0);

    if (!title) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const post = await DonationPost.create({
      title,
      content,
      image_urls,
      is_published,
      order,
    });

    res.status(201).json({
      success: true,
      data: {
        _id: post._id,
        title: post.title,
        content: post.content || "",
        image_urls: post.image_urls || [],
        is_published: post.is_published === true,
        order: post.order ?? 0,
        createdAt: post.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: update donation post
app.patch("/api/admin/donations/posts/:id", authMiddleware, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const updates = {};
    if (typeof body.title === "string") updates.title = body.title;
    if (typeof body.content === "string") updates.content = body.content;
    if (Array.isArray(body.image_urls)) updates.image_urls = body.image_urls;
    if (typeof body.is_published === "boolean") updates.is_published = body.is_published;
    if (typeof body.order === "number") updates.order = body.order;

    const post = await DonationPost.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).lean();
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.json({
      success: true,
      data: {
        _id: post._id,
        title: post.title,
        content: post.content || "",
        image_urls: post.image_urls || [],
        is_published: post.is_published === true,
        order: post.order ?? 0,
        createdAt: post.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Admin: delete donation post
app.delete("/api/admin/donations/posts/:id", authMiddleware, requireRole("super_admin", "admin"), async (req, res) => {
  try {
    const post = await DonationPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    res.json({ success: true, data: { _id: post._id } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags: [Public]
 *     summary: Submit contact form
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               department: { type: string }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Contact message saved
 */
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, department, subject, message } = req.body || {};
  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Name, email, subject and message are required",
      });
  }
  try {
    const row = await ContactMessage.create({
      name,
      email,
      phone,
      department,
      subject,
      message,
    });
    res
      .status(201)
      .json({
        success: true,
        data: row,
        message: "Message received! We will contact you soon.",
      });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Public hospitals listing
app.get("/api/hospitals", async (req, res) => {
  try {
    const rows = await Hospital.find({}).sort({ name: 1 });
    const data = rows.map((r) => ({
      _id: r._id,
      name: r.name,
      region: r.region || null,
      district: r.district || null,
      address: r.address || null,
      phone: r.phone || null,
      hours: r.hours || null,
      rating: r.rating || 0,
      services: r.services || [],
      featured: r.featured || false,
      photo_url: r.photo_url || null,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/hospitals",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const rows = await Hospital.find({}).sort({ name: 1 });
      const data = rows.map((r) => ({
        _id: r._id,
        name: r.name,
        region: r.region || null,
        district: r.district || null,
        address: r.address || null,
        phone: r.phone || null,
        hours: r.hours || null,
        rating: r.rating || 0,
        services: r.services || [],
        featured: r.featured || false,
        photo_url: r.photo_url || null,
        createdAt: r.createdAt,
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/hospitals",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const services = Array.isArray(body.services)
      ? body.services.filter((service) => typeof service === "string" && service.trim())
      : [];
    const ratingValue = Number(body.rating ?? 0);

    if (!name) {
      return res.status(400).json({ success: false, message: "Hospital name is required" });
    }
    if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 0 and 5" });
    }

    try {
      const hospital = await Hospital.create({
        name,
        region: typeof body.region === "string" ? body.region.trim() || null : null,
        district: typeof body.district === "string" ? body.district.trim() || null : null,
        address: typeof body.address === "string" ? body.address.trim() || null : null,
        phone: typeof body.phone === "string" ? body.phone.trim() || null : null,
        hours: typeof body.hours === "string" ? body.hours.trim() || null : null,
        rating: ratingValue,
        services: services.map((service) => service.trim()),
        featured: body.featured === true,
        photo_url: typeof body.photo_url === "string" ? body.photo_url.trim() || null : null,
      });
      res.status(201).json({
        success: true,
        data: {
          _id: hospital._id,
          name: hospital.name,
          region: hospital.region || null,
          district: hospital.district || null,
          address: hospital.address || null,
          phone: hospital.phone || null,
          hours: hospital.hours || null,
          rating: hospital.rating || 0,
          services: hospital.services || [],
          featured: hospital.featured || false,
          photo_url: hospital.photo_url || null,
          createdAt: hospital.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/hospitals/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return res.status(400).json({ success: false, message: "Hospital name is required" });
      update.name = name;
    }
    if (typeof body.region === "string") update.region = body.region.trim() || null;
    if (typeof body.district === "string") update.district = body.district.trim() || null;
    if (typeof body.address === "string") update.address = body.address.trim() || null;
    if (typeof body.phone === "string") update.phone = body.phone.trim() || null;
    if (typeof body.hours === "string") update.hours = body.hours.trim() || null;
    if (typeof body.photo_url === "string") update.photo_url = body.photo_url.trim() || null;
    if (typeof body.featured === "boolean") update.featured = body.featured;

    if (Object.prototype.hasOwnProperty.call(body, "rating")) {
      const ratingValue = Number(body.rating);
      if (!Number.isFinite(ratingValue) || ratingValue < 0 || ratingValue > 5) {
        return res.status(400).json({ success: false, message: "Rating must be between 0 and 5" });
      }
      update.rating = ratingValue;
    }
    if (Array.isArray(body.services)) {
      update.services = body.services
        .filter((service) => typeof service === "string" && service.trim())
        .map((service) => service.trim());
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const hospital = await Hospital.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!hospital) {
        return res.status(404).json({ success: false, message: "Hospital not found" });
      }
      res.json({
        success: true,
        data: {
          _id: hospital._id,
          name: hospital.name,
          region: hospital.region || null,
          district: hospital.district || null,
          address: hospital.address || null,
          phone: hospital.phone || null,
          hours: hospital.hours || null,
          rating: hospital.rating || 0,
          services: hospital.services || [],
          featured: hospital.featured || false,
          photo_url: hospital.photo_url || null,
          createdAt: hospital.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/hospitals/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const hospital = await Hospital.findByIdAndDelete(req.params.id);
      if (!hospital) {
        return res.status(404).json({ success: false, message: "Hospital not found" });
      }
      res.json({ success: true, message: "Hospital deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// Public services listing
app.get("/api/services", async (req, res) => {
  try {
    const rows = await ServiceType.find({}).sort({ name: 1 });
    const data = rows.map((r) => ({
      id: r._id,
      name: r.name,
      description: r.description || null,
      duration_minutes: r.duration_minutes || null,
      price: r.price || null,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/services",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const rows = await ServiceType.find({}).sort({ name: 1 });
      const data = rows.map((r) => ({
        id: r._id,
        name: r.name,
        description: r.description || null,
        duration_minutes: r.duration_minutes || null,
        price: r.price || null,
        createdAt: r.createdAt,
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/services",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : null;
    const durationValue = Number(body.duration_minutes);
    const priceValue = Number(body.price);

    if (!name) {
      return res.status(400).json({ success: false, message: "Service name is required" });
    }
    if (Object.prototype.hasOwnProperty.call(body, "duration_minutes") && !Number.isFinite(durationValue)) {
      return res.status(400).json({ success: false, message: "Duration must be a valid number" });
    }
    if (Object.prototype.hasOwnProperty.call(body, "price") && !Number.isFinite(priceValue)) {
      return res.status(400).json({ success: false, message: "Price must be a valid number" });
    }

    try {
      const service = await ServiceType.create({
        name,
        description: description || null,
        duration_minutes: Number.isFinite(durationValue) ? durationValue : null,
        price: Number.isFinite(priceValue) ? priceValue : null,
      });
      res.status(201).json({
        success: true,
        data: {
          id: service._id,
          name: service.name,
          description: service.description || null,
          duration_minutes: service.duration_minutes || null,
          price: service.price || null,
          createdAt: service.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/services/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return res.status(400).json({ success: false, message: "Service name is required" });
      update.name = name;
    }
    if (typeof body.description === "string") {
      update.description = body.description.trim() || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "duration_minutes")) {
      const durationValue = Number(body.duration_minutes);
      if (!Number.isFinite(durationValue)) {
        return res.status(400).json({ success: false, message: "Duration must be a valid number" });
      }
      update.duration_minutes = durationValue || null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "price")) {
      const priceValue = Number(body.price);
      if (!Number.isFinite(priceValue)) {
        return res.status(400).json({ success: false, message: "Price must be a valid number" });
      }
      update.price = priceValue || null;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const service = await ServiceType.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!service) {
        return res.status(404).json({ success: false, message: "Service type not found" });
      }
      res.json({
        success: true,
        data: {
          id: service._id,
          name: service.name,
          description: service.description || null,
          duration_minutes: service.duration_minutes || null,
          price: service.price || null,
          createdAt: service.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/services/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const service = await ServiceType.findByIdAndDelete(req.params.id);
      if (!service) {
        return res.status(404).json({ success: false, message: "Service type not found" });
      }
      res.json({ success: true, message: "Service type deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// Public doctors list (for patients to book)
app.get("/api/doctors", async (req, res) => {
  try {
    const { specialty } = req.query;
    const query = { role: { $in: ["doctor", "optometrist"] }, status: "active" };
    if (specialty) query.specialty = new RegExp(`^${specialty}$`, "i");
    const rows = await User.find(query).sort({ name: 1 });
    const data = rows.map((r) => ({
      id: r._id,
      name: r.name,
      email: r.email,
      specialty: r.specialty || null,
      role: r.role,
    }));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============== NOTIFICATIONS ==============

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list
 */
app.get("/api/notifications", authMiddleware, async (req, res) => {
  if (req.user.id === "super_admin") {
    return res.json({ success: true, data: [], unreadCount: 0 });
  }
  try {
    const rows = await Notification.find({ user_id: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({
      user_id: req.user.id,
      read: false,
    });
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r._id,
        title: r.title,
        body: r.body,
        type: r.type,
        read: r.read,
        createdAt: r.createdAt,
      })),
      unreadCount,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Marked as read
 */
app.patch("/api/notifications/:id/read", authMiddleware, async (req, res) => {
  if (req.user.id === "super_admin") return res.json({ success: true });
  try {
    await Notification.updateOne(
      { _id: req.params.id, user_id: req.user.id },
      { read: true },
    );
    res.json({ success: true, message: "Marked as read" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ============== ADMIN ROUTES ==============

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin dashboard stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
app.get(
  "/api/admin/dashboard/stats",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const activeDoctors = await User.countDocuments({
        role: "doctor",
        status: "active",
      });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const appointmentsToday = await Appointment.countDocuments({
        scheduled_at: { $gte: todayStart, $lt: todayEnd },
        status: { $ne: "cancelled" },
      });
      const mobileClinicVisits = await MobileClinic.countDocuments({
        status: "active",
      });
      res.json({
        success: true,
        data: {
          totalUsers,
          activeDoctors,
          appointmentsToday,
          mobileClinicVisits,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/dashboard/recent-users:
 *   get:
 *     tags: [Admin]
 *     summary: Get recent users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recent users
 */
app.get(
  "/api/admin/dashboard/recent-users",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const rows = await User.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .select("name email role last_login");
      const data = rows.map((r) => ({
        id: r._id,
        name: r.name,
        email: r.email,
        role: r.role,
        date: r.last_login ? r.last_login.toLocaleDateString() : "Never",
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     tags: [Admin]
 *     summary: Get all appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointments list
 */
app.get(
  "/api/admin/appointments",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const { status, date } = req.query;
    try {
      let query = {};
      if (status) query.status = status;
      if (date === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(24, 0, 0, 0);
        query.scheduled_at = { $gte: todayStart, $lt: todayEnd };
      }
      const rows = await Appointment.find(query)
        .populate("patient_id", "name email phone")
        .populate("doctor_id", "name specialty")
        .populate("service_type_id", "name")
        .sort({ scheduled_at: 1 })
        .limit(200);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/appointments/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update appointment status
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointment updated
 */
app.patch(
  "/api/admin/appointments/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const { status } = req.body || {};
    if (!["pending", "confirmed", "completed", "cancelled"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment)
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      appointment.status = status;
      await appointment.save();
      const patientId =
        typeof appointment.patient_id === "object"
          ? appointment.patient_id._id
          : appointment.patient_id;
      if (patientId) {
        await createNotification(
          patientId,
          "Appointment updated",
          `Your appointment status is now ${status}.`,
          status === "cancelled" ? "warning" : "success",
        );
      }
      res.json({ success: true, message: "Appointment updated" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.get("/api/testimonials", async (req, res) => {
  try {
    const testimonials = await Testimonial.find({ is_published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: testimonials });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/testimonials",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const testimonials = await Testimonial.find({})
        .sort({ order: 1, createdAt: -1 })
        .lean();
      res.json({ success: true, data: testimonials });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/testimonials",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "Patient";
    const location =
      typeof body.location === "string" ? body.location.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const imageUrl =
      typeof body.image_url === "string" ? body.image_url.trim() : "";
    const ratingValue = Number(body.rating ?? 5);
    const orderValue = Number(body.order ?? 0);

    if (!name || !content) {
      return res.status(400).json({
        success: false,
        message: "Name and story content are required",
      });
    }
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    try {
      const order = Number.isFinite(orderValue) ? orderValue : await Testimonial.countDocuments();
      const testimonial = await Testimonial.create({
        name,
        role: role || "Patient",
        location,
        content,
        image_url: imageUrl || null,
        rating: ratingValue,
        is_published: body.is_published !== false,
        order,
      });
      res.status(201).json({ success: true, data: testimonial });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/testimonials/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return res.status(400).json({ success: false, message: "Name is required" });
      update.name = name;
    }
    if (typeof body.role === "string") update.role = body.role.trim() || "Patient";
    if (typeof body.location === "string") update.location = body.location.trim();
    if (typeof body.content === "string") {
      const content = body.content.trim();
      if (!content) return res.status(400).json({ success: false, message: "Story content is required" });
      update.content = content;
    }
    if (typeof body.image_url === "string") update.image_url = body.image_url.trim() || null;
    if (Object.prototype.hasOwnProperty.call(body, "rating")) {
      const ratingValue = Number(body.rating);
      if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
      }
      update.rating = ratingValue;
    }
    if (Object.prototype.hasOwnProperty.call(body, "is_published")) {
      update.is_published = body.is_published === true;
    }
    if (Object.prototype.hasOwnProperty.call(body, "order")) {
      const orderValue = Number(body.order);
      if (!Number.isFinite(orderValue)) {
        return res.status(400).json({ success: false, message: "Order must be a number" });
      }
      update.order = orderValue;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!testimonial) {
        return res.status(404).json({ success: false, message: "Success story not found" });
      }
      res.json({ success: true, data: testimonial });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/testimonials/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
      if (!testimonial) {
        return res.status(404).json({ success: false, message: "Success story not found" });
      }
      res.json({ success: true, message: "Success story deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.get("/api/journey", async (req, res) => {
  try {
    const milestones = await JourneyMilestone.find({ is_published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: milestones });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/journey",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const milestones = await JourneyMilestone.find({})
        .sort({ order: 1, createdAt: -1 })
        .lean();
      res.json({ success: true, data: milestones });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/journey",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const year = typeof body.year === "string" ? body.year.trim() : "";
    const event = typeof body.event === "string" ? body.event.trim() : "";
    const orderValue = Number(body.order ?? 0);

    if (!year || !event) {
      return res.status(400).json({ success: false, message: "Year and milestone event are required" });
    }

    try {
      const order = Number.isFinite(orderValue) ? orderValue : await JourneyMilestone.countDocuments();
      const milestone = await JourneyMilestone.create({
        year,
        event,
        is_published: body.is_published !== false,
        order,
      });
      res.status(201).json({ success: true, data: milestone });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/journey/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.year === "string") {
      const year = body.year.trim();
      if (!year) return res.status(400).json({ success: false, message: "Year is required" });
      update.year = year;
    }
    if (typeof body.event === "string") {
      const event = body.event.trim();
      if (!event) return res.status(400).json({ success: false, message: "Milestone event is required" });
      update.event = event;
    }
    if (Object.prototype.hasOwnProperty.call(body, "is_published")) {
      update.is_published = body.is_published === true;
    }
    if (Object.prototype.hasOwnProperty.call(body, "order")) {
      const orderValue = Number(body.order);
      if (!Number.isFinite(orderValue)) {
        return res.status(400).json({ success: false, message: "Order must be a number" });
      }
      update.order = orderValue;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const milestone = await JourneyMilestone.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!milestone) {
        return res.status(404).json({ success: false, message: "Journey milestone not found" });
      }
      res.json({ success: true, data: milestone });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/journey/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const milestone = await JourneyMilestone.findByIdAndDelete(req.params.id);
      if (!milestone) {
        return res.status(404).json({ success: false, message: "Journey milestone not found" });
      }
      res.json({ success: true, message: "Journey milestone deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.get("/api/team", async (req, res) => {
  try {
    const members = await TeamMember.find({})
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: members });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/team",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const members = await TeamMember.find({})
        .sort({ order: 1, createdAt: -1 })
        .lean();
      res.json({ success: true, data: members });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/team",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = typeof body.role === "string" ? body.role.trim() : "";
    const specialty = typeof body.specialty === "string" ? body.specialty.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const photoUrl = typeof body.photo_url === "string" ? body.photo_url.trim() : "";
    const orderValue = Number(body.order ?? 0);

    if (!name || !role) {
      return res.status(400).json({
        success: false,
        message: "Name and role are required",
      });
    }
    if (!Number.isFinite(orderValue)) {
      return res.status(400).json({ success: false, message: "Order must be a number" });
    }

    try {
      const order = Number.isFinite(orderValue) ? orderValue : await TeamMember.countDocuments();
      const member = await TeamMember.create({
        name,
        role,
        specialty: specialty || null,
        bio: bio || null,
        photo_url: photoUrl || null,
        order,
      });
      res.status(201).json({ success: true, data: member });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/team/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return res.status(400).json({ success: false, message: "Name is required" });
      update.name = name;
    }
    if (typeof body.role === "string") {
      const role = body.role.trim();
      if (!role) return res.status(400).json({ success: false, message: "Role is required" });
      update.role = role;
    }
    if (typeof body.specialty === "string") update.specialty = body.specialty.trim() || null;
    if (typeof body.bio === "string") update.bio = body.bio.trim() || null;
    if (typeof body.photo_url === "string") update.photo_url = body.photo_url.trim() || null;
    if (Object.prototype.hasOwnProperty.call(body, "order")) {
      const orderValue = Number(body.order);
      if (!Number.isFinite(orderValue)) {
        return res.status(400).json({ success: false, message: "Order must be a number" });
      }
      update.order = orderValue;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const member = await TeamMember.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!member) {
        return res.status(404).json({ success: false, message: "Team member not found" });
      }
      res.json({ success: true, data: member });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/team/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const member = await TeamMember.findByIdAndDelete(req.params.id);
      if (!member) {
        return res.status(404).json({ success: false, message: "Team member not found" });
      }
      res.json({ success: true, message: "Team member deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== RESEARCH LIBRARY ==============

/**
 * @swagger
 * /api/research:
 *   get:
 *     tags: [Public]
 *     summary: List published research articles
 *     parameters:
 *       - name: category
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Published research articles
 */
app.get("/api/research", async (req, res) => {
  try {
    const { category } = req.query;
    const query = { is_published: true };
    if (category && typeof category === "string") {
      query.category = category;
    }
    const articles = await ResearchArticle.find(query).sort({ year: -1, createdAt: -1 }).lean();
    res.json({ success: true, data: articles });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/research",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const articles = await ResearchArticle.find({}).sort({ createdAt: -1 }).lean();
      res.json({ success: true, data: articles });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/research",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const abstract = typeof body.abstract === "string" ? body.abstract.trim() : "";
    const journal = typeof body.journal === "string" ? body.journal.trim() : "";
    const authors = Array.isArray(body.authors)
      ? body.authors.filter((a) => typeof a === "string" && a.trim())
      : [];
    const yearValue = Number(body.year);
    const citationsValue = Number(body.citations ?? 0);

    if (!title || !category) {
      return res.status(400).json({ success: false, message: "Title and category are required" });
    }
    if (!Number.isFinite(yearValue) || yearValue < 1900 || yearValue > 2100) {
      return res.status(400).json({ success: false, message: "Year must be a valid number" });
    }

    try {
      const article = await ResearchArticle.create({
        title,
        category,
        abstract: abstract || null,
        journal: journal || null,
        authors: authors.map((a) => a.trim()),
        year: yearValue,
        citations: Number.isFinite(citationsValue) ? citationsValue : 0,
        download_url: typeof body.download_url === "string" ? body.download_url.trim() || null : null,
        external_url: typeof body.external_url === "string" ? body.external_url.trim() || null : null,
        is_published: body.is_published !== false,
      });
      res.status(201).json({ success: true, data: article });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/research/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) return res.status(400).json({ success: false, message: "Title is required" });
      update.title = t;
    }
    if (typeof body.category === "string") {
      const c = body.category.trim();
      if (!c) return res.status(400).json({ success: false, message: "Category is required" });
      update.category = c;
    }
    if (typeof body.abstract === "string") update.abstract = body.abstract.trim() || null;
    if (typeof body.journal === "string") update.journal = body.journal.trim() || null;
    if (Array.isArray(body.authors)) {
      update.authors = body.authors.filter((a) => typeof a === "string" && a.trim()).map((a) => a.trim());
    }
    if (Object.prototype.hasOwnProperty.call(body, "year")) {
      const y = Number(body.year);
      if (!Number.isFinite(y) || y < 1900 || y > 2100) {
        return res.status(400).json({ success: false, message: "Year must be a valid number" });
      }
      update.year = y;
    }
    if (Object.prototype.hasOwnProperty.call(body, "citations")) {
      const c = Number(body.citations);
      update.citations = Number.isFinite(c) ? c : 0;
    }
    if (typeof body.download_url === "string") update.download_url = body.download_url.trim() || null;
    if (typeof body.external_url === "string") update.external_url = body.external_url.trim() || null;
    if (Object.prototype.hasOwnProperty.call(body, "is_published")) {
      update.is_published = body.is_published === true;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const article = await ResearchArticle.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!article) {
        return res.status(404).json({ success: false, message: "Article not found" });
      }
      res.json({ success: true, data: article });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/research/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const article = await ResearchArticle.findByIdAndDelete(req.params.id);
      if (!article) {
        return res.status(404).json({ success: false, message: "Article not found" });
      }
      res.json({ success: true, message: "Article deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== EDUCATION CONTENT ==============

app.get("/api/education", async (req, res) => {
  try {
    const content = await EducationContent.find({ is_published: true }).sort({ content_type: 1, order: 1 }).lean();
    res.json({ success: true, data: content });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get(
  "/api/admin/education",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const content = await EducationContent.find({}).sort({ content_type: 1, order: 1 }).lean();
      res.json({ success: true, data: content });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/education",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const content_type = typeof body.content_type === "string" ? body.content_type.trim() : "";
    if (!content_type || !["topic", "myth", "symptom"].includes(content_type)) {
      return res.status(400).json({ success: false, message: "Valid content_type (topic, myth, symptom) is required" });
    }
    try {
      const item = await EducationContent.create({
        content_type,
        title: typeof body.title === "string" ? body.title.trim() : undefined,
        description: typeof body.description === "string" ? body.description.trim() : undefined,
        icon: typeof body.icon === "string" ? body.icon.trim() : "BookOpen",
        articles: Array.isArray(body.articles) ? body.articles.filter((a) => typeof a === "string" && a.trim()) : [],
        myth_text: typeof body.myth_text === "string" ? body.myth_text.trim() : undefined,
        fact_text: typeof body.fact_text === "string" ? body.fact_text.trim() : undefined,
        symptom_text: typeof body.symptom_text === "string" ? body.symptom_text.trim() : undefined,
        order: Number(body.order) || 0,
        is_published: body.is_published !== false,
      });
      res.status(201).json({ success: true, data: item });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/education/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};
    if (typeof body.content_type === "string" && ["topic", "myth", "symptom"].includes(body.content_type.trim())) {
      update.content_type = body.content_type.trim();
    }
    if (typeof body.title === "string") update.title = body.title.trim();
    if (typeof body.description === "string") update.description = body.description.trim();
    if (typeof body.icon === "string") update.icon = body.icon.trim();
    if (Array.isArray(body.articles)) update.articles = body.articles.filter((a) => typeof a === "string" && a.trim());
    if (typeof body.myth_text === "string") update.myth_text = body.myth_text.trim();
    if (typeof body.fact_text === "string") update.fact_text = body.fact_text.trim();
    if (typeof body.symptom_text === "string") update.symptom_text = body.symptom_text.trim();
    if (typeof body.order === "number") update.order = body.order;
    if (typeof body.is_published === "boolean") update.is_published = body.is_published;
    try {
      const item = await EducationContent.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!item) {
        return res.status(404).json({ success: false, message: "Content not found" });
      }
      res.json({ success: true, data: item });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/education/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const item = await EducationContent.findByIdAndDelete(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, message: "Content not found" });
      }
      res.json({ success: true, message: "Content deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== ADMIN CONTACT MESSAGES ==============

/**
 * @swagger
 * /api/admin/contact-messages:
 *   get:
 *     tags: [Admin]
 *     summary: Get all contact messages
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [new, read, responded]
 *     responses:
 *       200:
 *         description: Contact messages list
 */
app.get(
  "/api/admin/contact-messages",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const { status } = req.query;
    try {
      const query = {};
      if (status && ["new", "read", "responded"].includes(String(status))) {
        query.status = status;
      }
      const rows = await ContactMessage.find(query).sort({ createdAt: -1 });
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/contact-messages/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Update contact message status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, read, responded]
 *               responded_by:
 *                 type: string
 *               response_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contact message updated
 */
app.patch(
  "/api/admin/contact-messages/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.status === "string") {
      if (!["new", "read", "responded"].includes(body.status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }
      update.status = body.status;
    }
    if (typeof body.responded_by === "string") {
      update.responded_by = body.responded_by.trim();
    }
    if (typeof body.response_notes === "string") {
      update.response_notes = body.response_notes.trim();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const msg = await ContactMessage.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!msg) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }
      res.json({ success: true, data: msg });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/contact-messages/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete contact message
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contact message deleted
 */
app.delete(
  "/api/admin/contact-messages/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const msg = await ContactMessage.findByIdAndDelete(req.params.id);
      if (!msg) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }
      res.json({ success: true, message: "Message deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Get admin analytics
 *     parameters:
 *       - name: timeRange
 *         in: query
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data
 */
app.get(
  "/api/admin/analytics",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const { timeRange = "30d" } = req.query;
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      let startDate = new Date(now);
      switch (timeRange) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      const timeFilter = { createdAt: { $gte: startDate } };
      const scheduledFilter = { scheduled_at: { $gte: startDate } };
      const recordDateFilter = { record_date: { $gte: startDate } };
      const referralDateFilter = { createdAt: { $gte: startDate } };

      const totalPatients = await User.countDocuments({ role: "patient" });
      const consultations = await Appointment.countDocuments({
        type: "consultation",
        status: "completed",
        ...timeFilter,
      });
      const appointments = await Appointment.countDocuments({
        ...timeFilter,
        status: { $ne: "cancelled" },
      });
      const districtsCovered = await MobileClinic.distinct("location").then(
        (d) => d.length,
      );

      const newPatientsToday = await User.countDocuments({
        role: "patient",
        createdAt: { $gte: todayStart },
      });
      const consultationsToday = await Appointment.countDocuments({
        type: "consultation",
        status: "completed",
        scheduled_at: { $gte: todayStart },
      });
      const appointmentsToday = await Appointment.countDocuments({
        scheduled_at: { $gte: todayStart },
        status: { $ne: "cancelled" },
      });
      const teleconsultationsToday = await Appointment.countDocuments({
        type: "teleconsultation",
        scheduled_at: { $gte: todayStart },
        status: { $ne: "cancelled" },
      });

      const monthsToDisplay = timeRange === "1y" ? 12 : 6;
      const monthlyData = [];
      for (let i = monthsToDisplay - 1; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(
          now.getFullYear(),
          now.getMonth() - i + 1,
          0,
          23,
          59,
          59,
        );
        const monthName = monthStart.toLocaleString("default", {
          month: "short",
        });

        const patients = await User.countDocuments({
          role: "patient",
          createdAt: { $gte: monthStart, $lte: monthEnd },
        });
        const consults = await Appointment.countDocuments({
          type: "consultation",
          scheduled_at: { $gte: monthStart, $lte: monthEnd },
        });

        monthlyData.push({
          month: monthName,
          patients,
          consultations: consults,
        });
      }

      const appointmentStatusData = await Appointment.aggregate([
        { $match: timeFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, status: "$_id", count: "$count" } },
      ]);

      const appointmentTypeData = await Appointment.aggregate([
        { $match: timeFilter },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, type: "$_id", count: "$count" } },
      ]);

      const serviceTypeData = await Appointment.aggregate([
        { $match: { ...timeFilter, service_type_id: { $ne: null } } },
        {
          $lookup: {
            from: "servicetypes",
            localField: "service_type_id",
            foreignField: "_id",
            as: "service",
          },
        },
        { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              id: "$service_type_id",
              name: { $ifNull: ["$service.name", "Unassigned"] },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            name: "$_id.name",
            appointments: "$count",
          },
        },
      ]);

      const hospitalData = await User.aggregate([
        { $match: { role: "patient", hospital_id: { $ne: null } } },
        {
          $lookup: {
            from: "hospitals",
            localField: "hospital_id",
            foreignField: "_id",
            as: "hospital",
          },
        },
        { $unwind: { path: "$hospital", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              id: "$hospital_id",
              name: { $ifNull: ["$hospital.name", "Unassigned"] },
            },
            patients: { $sum: 1 },
          },
        },
        { $sort: { patients: -1 } },
        { $limit: 8 },
        {
          $project: {
            _id: 0,
            name: "$_id.name",
            patients: "$patients",
          },
        },
      ]);

      const mobileClinicData = await MobileClinic.aggregate([
        {
          $project: {
            _id: 0,
            name: 1,
            status: 1,
            patients: { $ifNull: ["$patients_served", 0] },
          },
        },
        { $sort: { patients: -1 } },
        { $limit: 8 },
      ]);

      const medicalRecordTypeData = await MedicalRecord.aggregate([
        { $match: recordDateFilter },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
        { $project: { _id: 0, type: "$_id", count: "$count" } },
      ]);

      const prescriptionStatusData = await Prescription.aggregate([
        { $match: timeFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, status: "$_id", count: "$count" } },
      ]);

      const referralStatusData = await Referral.aggregate([
        { $match: referralDateFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, status: "$_id", count: "$count" } },
      ]);

      const referralPriorityData = await Referral.aggregate([
        { $match: referralDateFilter },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, priority: "$_id", count: "$count" } },
      ]);

      const clinicScheduleSummary = await ClinicSchedule.aggregate([
        { $match: { schedule_date: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            visits: { $sum: 1 },
            expectedPatients: { $sum: { $ifNull: ["$expected_patients", 0] } },
          },
        },
      ]);

      const recentAppointments = await Appointment.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("patient_id", "name")
        .populate("doctor_id", "name");
      const recentUsers = await User.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name role");

      const recentActivity = [];

      for (const apt of recentAppointments) {
        recentActivity.push({
          id: apt._id,
          type: apt.status === "completed" ? "consultation" : "appointment",
          title:
            apt.status === "completed"
              ? "Consultation Completed"
              : "New Appointment",
          description: `${apt.patient_id?.name || "Patient"} - ${apt.type || "General"}`,
          time: apt.createdAt
            ? new Date(apt.createdAt).toLocaleTimeString()
            : "Recently",
        });
      }

      for (const user of recentUsers) {
        recentActivity.push({
          id: user._id,
          type: "registration",
          title: "New Registration",
          description: `${user.name} registered as ${user.role}`,
          time: "Recently",
        });
      }

      res.json({
        success: true,
        data: {
          overview: {
            totalPatients,
            consultations,
            appointments,
            districtsCovered,
          },
          todayStats: {
            newPatientsToday,
            consultationsToday,
            appointmentsToday,
            teleconsultationsToday,
          },
          monthlyData,
          regionData: hospitalData.map((item) => ({
            region: item.name,
            patients: item.patients,
            percentage: totalPatients ? Math.round((item.patients / totalPatients) * 100) : 0,
          })),
          recentActivity: recentActivity.slice(0, 8),
          appointmentStatusData,
          appointmentTypeData,
          serviceTypeData,
          hospitalData,
          mobileClinicData,
          medicalRecordTypeData,
          prescriptionStatusData,
          referralStatusData,
          referralPriorityData,
          clinicScheduleSummary: clinicScheduleSummary[0] || { visits: 0, expectedPatients: 0 },
        },
      });
    } catch (e) {
      console.error("[analytics] Error:", e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     parameters:
 *       - name: role
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: search
 *         in: query
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Users list
 *   post:
 *     tags: [Admin]
 *     summary: Create user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, role]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *               role: { type: string, enum: [admin, doctor, optometrist, patient] }
 *               specialty: { type: string }
 *               hospital_id: { type: string }
 *     responses:
 *       201:
 *         description: User created
 */
app.get(
  "/api/admin/users",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const { role, status, search } = req.query;
    try {
      let query = {};
      if (role) query.role = role;
      if (status) query.status = status;
      if (search)
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      const rows = await User.find(query)
        .populate("hospital_id", "name")
        .sort({ createdAt: -1 });
      const data = rows.map((u) => ({
        _id: u._id,
        pt_id: u.pt_id,
        dr_id: u.dr_id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        last_login: u.last_login,
        hospital_name: u.hospital_id ? u.hospital_id.name : null,
        phone: u.phone,
        district: u.district,
        specialty: u.specialty,
        createdAt: u.createdAt,
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/users",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    let { email, password, name, role, specialty, hospital_id, phone, district } =
      req.body || {};

    if (email) email = email.toLowerCase().trim();

    if (!email || !password || !name || !role) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Email, password, name and role are required",
        });
    }

    const allowedRoles = ["admin", "doctor", "optometrist", "patient"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      const oldRole = existingUser.role;
      let newPtId = existingUser.pt_id;
      let newDrId = existingUser.dr_id;
      if (role === "patient" && oldRole !== "patient") {
        newPtId = await generatePatientId();
        newDrId = null;
      } else if ((role === "doctor" || role === "optometrist") && oldRole !== "doctor" && oldRole !== "optometrist") {
        newPtId = null;
        newDrId = await generateDoctorId();
      } else if (role === "admin") {
        newPtId = null;
        newDrId = null;
      }
      await User.findByIdAndUpdate(existingUser._id, {
        $set: {
          password_hash: await bcrypt.hash(password, 10),
          name,
          role,
          pt_id: newPtId,
          dr_id: newDrId,
          specialty: specialty || existingUser.specialty,
          hospital_id: hospital_id || existingUser.hospital_id,
          phone: role === "patient" && phone ? phone : existingUser.phone,
          district: role === "patient" && district ? district : existingUser.district,
          status: "active",
        },
      });
      const updated = await User.findById(existingUser._id).lean();
      return res.status(200).json({
        success: true,
        message: "User updated successfully!",
        data: {
          id: updated._id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          pt_id: updated.pt_id,
          dr_id: updated.dr_id,
        },
      });
    }

    const hash = await bcrypt.hash(password, 10);
    let ptId = null;
    let drId = null;
    if (role === "patient") {
      ptId = await generatePatientId();
    } else if (role === "doctor" || role === "optometrist") {
      drId = await generateDoctorId();
    }

    let user = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        user = await User.create({
          email: normalizedEmail,
          password_hash: hash,
          name,
          role,
          pt_id: ptId,
          dr_id: drId,
          specialty: specialty || null,
          hospital_id: hospital_id || null,
          phone: role === "patient" && phone ? phone : null,
          district: role === "patient" && district ? district : null,
          status: "active",
        });
        break;
      } catch (e) {
        if (e.code !== 11000) throw e;
        if (e.keyPattern?.pt_id) {
          ptId = await generatePatientId();
        } else if (e.keyPattern?.dr_id) {
          drId = await generateDoctorId();
        } else {
          throw e;
        }
      }
    }
    if (!user) {
      return res.status(500).json({ success: false, message: "Failed to create user after retries. Please try again." });
    }
    res.status(201).json({
      success: true,
      message: "User created successfully!",
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        pt_id: user.pt_id,
        dr_id: user.dr_id,
      },
    });
  },
);

/**
 * @swagger
 * /api/admin/users/{id}/approve:
 *   patch:
 *     tags: [Admin]
 *     summary: Approve user
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User approved
 */
app.patch(
  "/api/admin/users/:id/approve",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      await User.updateOne({ _id: req.params.id }, { status: "active" });
      await createNotification(
        req.params.id,
        "Account approved",
        "Your account has been approved.",
        "success",
      );
      res.json({ success: true, message: "User approved successfully" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/users/{id}/deactivate:
 *   patch:
 *     tags: [Admin]
 *     summary: Deactivate user
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deactivated
 */
app.patch(
  "/api/admin/users/:id/deactivate",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      await User.updateOne({ _id: req.params.id }, { status: "inactive" });
      res.json({ success: true, message: "User deactivated" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.put(
  "/api/admin/users/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      console.log("[edit user] params:", req.params.id, "body email:", req.body?.email, "current email:", user.email);
      const { name, email, role, specialty, hospital_id, phone, district, password } =
        req.body || {};

      const update = {};
      const unset = {};
      if (name) update.name = name.trim();
      if (email && email !== user.email) {
        const exists = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
        if (exists) {
          return res.status(400).json({ success: false, message: "Email already registered to another user" });
        }
        update.email = email.toLowerCase().trim();
      }
      const targetRole = role || user.role;
      if (role) {
        const allowedRoles = ["admin", "doctor", "optometrist", "patient"];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ success: false, message: "Invalid role" });
        }
        update.role = role;
      }
      if (targetRole === "patient") {
        if (!user.pt_id) update.pt_id = await generatePatientId();
        unset.dr_id = "";
      } else if (targetRole === "doctor" || targetRole === "optometrist") {
        unset.pt_id = "";
        if (!user.dr_id) update.dr_id = await generateDoctorId();
      } else {
        unset.pt_id = "";
        unset.dr_id = "";
      }
      if (specialty !== undefined) {
        update.specialty = specialty || null;
      }
      if (hospital_id !== undefined) {
        update.hospital_id = hospital_id || null;
      }
      if (phone !== undefined) {
        update.phone = phone || null;
      }
      if (district !== undefined) {
        update.district = district || null;
      }
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }
        update.password_hash = await bcrypt.hash(password, 10);
      }

      await User.findByIdAndUpdate(user._id, {
        $set: update,
        ...(Object.keys(unset).length ? { $unset: unset } : {}),
      });
      const updated = await User.findById(user._id).lean();
      res.json({
        success: true,
        message: "User updated successfully!",
        data: {
          id: updated._id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
          pt_id: updated.pt_id,
          dr_id: updated.dr_id,
        },
      });
    } catch (e) {
      console.error("[edit user]", e);
      if (e.code === 11000) {
        const key = e.keyPattern || {};
        if (key.email) {
          return res.status(400).json({ success: false, message: "Email already registered" });
        }
        if (key.pt_id) {
          return res.status(400).json({ success: false, message: "Patient ID already exists. Try again." });
        }
        if (key.dr_id) {
          return res.status(400).json({ success: false, message: "Doctor ID already exists. Try again." });
        }
        return res.status(400).json({ success: false, message: "Duplicate value" });
      }
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      await User.findByIdAndDelete(req.params.id);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/admin/clinics:
 *   get:
 *     tags: [Admin]
 *     summary: Get mobile clinics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Mobile clinics list
 *   post:
 *     tags: [Admin]
 *     summary: Create mobile clinic
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, location]
 *             properties:
 *               name: { type: string }
 *               location: { type: string }
 *               equipment: { type: string }
 *               status: { type: string }
 *     responses:
 *       201:
 *         description: Clinic created
 */
app.get(
  "/api/admin/clinics",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const rows = await MobileClinic.find({}).sort({ name: 1 });
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/clinics",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const equipment = typeof body.equipment === "string" ? body.equipment.trim() : null;
    const photoUrl = typeof body.photo_url === "string" ? body.photo_url.trim() : null;
    const patientsServedValue = Number(body.patients_served ?? 0);

    if (!name || !location) {
      return res
        .status(400)
        .json({ success: false, message: "Name and location are required" });
    }
    if (!Number.isFinite(patientsServedValue)) {
      return res.status(400).json({ success: false, message: "Patients served must be a number" });
    }

    if (!["active", "maintenance", "scheduled"].includes(body.status || "active")) {
      return res.status(400).json({ success: false, message: "Invalid clinic status" });
    }

    try {
      const clinic = await MobileClinic.create({
        name,
        location,
        equipment: equipment || null,
        status: body.status || "active",
        patients_served: patientsServedValue,
        photo_url: photoUrl || null,
      });
      res.status(201).json({
        success: true,
        data: {
          _id: clinic._id,
          name: clinic.name,
          location: clinic.location,
          status: clinic.status,
          patients_served: clinic.patients_served || 0,
          equipment: clinic.equipment || null,
          photo_url: clinic.photo_url || null,
          createdAt: clinic.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/admin/clinics/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const update = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return res.status(400).json({ success: false, message: "Name is required" });
      update.name = name;
    }
    if (typeof body.location === "string") {
      const location = body.location.trim();
      if (!location) return res.status(400).json({ success: false, message: "Location is required" });
      update.location = location;
    }
    if (typeof body.equipment === "string") update.equipment = body.equipment.trim() || null;
    if (typeof body.photo_url === "string") update.photo_url = body.photo_url.trim() || null;
    if (typeof body.status === "string") {
      if (!["active", "maintenance", "scheduled"].includes(body.status)) {
        return res.status(400).json({ success: false, message: "Invalid clinic status" });
      }
      update.status = body.status;
    }
    if (Object.prototype.hasOwnProperty.call(body, "patients_served")) {
      const patientsServedValue = Number(body.patients_served);
      if (!Number.isFinite(patientsServedValue)) {
        return res.status(400).json({ success: false, message: "Patients served must be a number" });
      }
      update.patients_served = patientsServedValue;
    }
    if (typeof body.next_visit === "string") {
      const nextVisit = new Date(body.next_visit);
      if (Number.isNaN(nextVisit.getTime())) {
        return res.status(400).json({ success: false, message: "Next visit date is invalid" });
      }
      update.next_visit = nextVisit;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "No update data provided" });
    }

    try {
      const clinic = await MobileClinic.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!clinic) {
        return res.status(404).json({ success: false, message: "Mobile clinic not found" });
      }
      res.json({
        success: true,
        data: {
          _id: clinic._id,
          name: clinic.name,
          location: clinic.location,
          status: clinic.status,
          patients_served: clinic.patients_served || 0,
          equipment: clinic.equipment || null,
          photo_url: clinic.photo_url || null,
          createdAt: clinic.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/clinics/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const clinic = await MobileClinic.findByIdAndDelete(req.params.id);
      if (!clinic) {
        return res.status(404).json({ success: false, message: "Mobile clinic not found" });
      }
      await ClinicSchedule.deleteMany({ clinic_id: req.params.id });
      res.json({ success: true, message: "Mobile clinic deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.get(
  "/api/admin/clinics/schedules",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const schedules = await ClinicSchedule.find({})
        .populate("clinic_id", "name")
        .sort({ schedule_date: 1, createdAt: 1 })
        .lean();
      const data = schedules.map((schedule) => ({
        _id: schedule._id,
        clinic_id: schedule.clinic_id?._id || schedule.clinic_id,
        clinic_name: schedule.clinic_id?.name || "Unknown clinic",
        location_detail: schedule.location_detail || null,
        schedule_date: schedule.schedule_date,
        time_slot: schedule.time_slot || null,
        expected_patients: schedule.expected_patients || 0,
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/admin/clinics/schedules",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    const body = req.body || {};
    const clinicId = typeof body.clinic_id === "string" ? body.clinic_id.trim() : "";
    const locationDetail = typeof body.location_detail === "string" ? body.location_detail.trim() : null;
    const timeSlot = typeof body.time_slot === "string" ? body.time_slot.trim() : null;
    const expectedPatientsValue = Number(body.expected_patients ?? 0);
    const scheduleDate = new Date(body.schedule_date);

    if (!clinicId) {
      return res.status(400).json({ success: false, message: "Clinic is required" });
    }
    if (Number.isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ success: false, message: "Schedule date is required" });
    }
    if (!Number.isFinite(expectedPatientsValue)) {
      return res.status(400).json({ success: false, message: "Expected patients must be a number" });
    }

    try {
      const clinic = await MobileClinic.findById(clinicId);
      if (!clinic) {
        return res.status(404).json({ success: false, message: "Mobile clinic not found" });
      }
      const schedule = await ClinicSchedule.create({
        clinic_id: clinicId,
        location_detail: locationDetail || null,
        schedule_date: scheduleDate,
        time_slot: timeSlot || null,
        expected_patients: expectedPatientsValue,
      });
      res.status(201).json({
        success: true,
        data: {
          _id: schedule._id,
          clinic_id: schedule.clinic_id,
          clinic_name: clinic.name,
          location_detail: schedule.location_detail || null,
          schedule_date: schedule.schedule_date,
          time_slot: schedule.time_slot || null,
          expected_patients: schedule.expected_patients || 0,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.delete(
  "/api/admin/clinics/schedules/:id",
  authMiddleware,
  requireRole("super_admin", "admin"),
  async (req, res) => {
    try {
      const schedule = await ClinicSchedule.findByIdAndDelete(req.params.id);
      if (!schedule) {
        return res.status(404).json({ success: false, message: "Schedule not found" });
      }
      res.json({ success: true, message: "Schedule deleted" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT ROUTES ==============

/**
 * @swagger
 * /api/patients:
 *   get:
 *     tags: [Patients]
 *     summary: Get all patients
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated patients list
 *   post:
 *     tags: [Patients]
 *     summary: Create new patient
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Patient created
 */
app.get(
  "/api/patients",
  authMiddleware,
  requireRole("doctor", "admin"),
  async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;
    try {
      const patients = await User.find({ role: "patient" })
        .select("pt_id name email phone status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      const total = await User.countDocuments({ role: "patient" });
      res.json({ success: true, data: patients, total, page, limit });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/patients",
  authMiddleware,
  requireRole("doctor", "admin"),
  async (req, res) => {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Name, email and password are required",
        });
    }
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existing = await User.findOne({
        email: new RegExp(`^${escapedEmail}$`, "i"),
      });
      if (existing) {
        const newPtId = await generatePatientId();
        await User.findByIdAndUpdate(existing._id, {
          $set: {
            name,
            role: "patient",
            pt_id: newPtId,
            phone: phone || existing.phone,
            status: "active",
          },
        });
        const updated = await User.findById(existing._id).lean();
        return res.status(200).json({
          success: true,
          message: "Patient updated successfully!",
          data: {
            id: updated._id,
            pt_id: updated.pt_id,
            email: updated.email,
            name: updated.name,
            role: updated.role,
          },
        });
      }

      const hash = await bcrypt.hash(password, 10);
      const ptId = await generatePatientId();

      const user = await User.create({
        email: normalizedEmail,
        password_hash: hash,
        name,
        role: "patient",
        pt_id: ptId,
        phone: phone || null,
        status: "active",
      });

      res.status(201).json({
        success: true,
        message: "Patient created successfully!",
        data: {
          id: user._id,
          pt_id: user.pt_id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (e) {
      if (e.code === 11000) {
        if (e.keyPattern?.email) {
          return res.status(400).json({ success: false, message: "Email already registered" });
        }
        if (e.keyPattern?.pt_id) {
          const fixedPtId = await generatePatientId();
          return res.status(500).json({ success: false, message: `Patient ID collision. Retrying with ${fixedPtId}...` });
        }
        return res.status(500).json({ success: false, message: e.message });
      }
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patients/pt_id/{ptId}:
 *   get:
 *     tags: [Patients]
 *     summary: Get patient by pt_id
 *     parameters:
 *       - name: ptId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient found
 */
app.get(
  "/api/patients/pt_id/:ptId",
  authMiddleware,
  requireRole("doctor", "admin"),
  async (req, res) => {
    try {
      const patient = await User.findOne({
        pt_id: req.params.ptId,
        role: "patient",
      }).select("pt_id name email phone status createdAt");
      if (!patient)
        return res
          .status(404)
          .json({ success: false, message: "Patient not found" });
      res.json({ success: true, data: patient });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patients/search:
 *   get:
 *     tags: [Patients]
 *     summary: Search patients
 *     parameters:
 *       - name: q
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Search results
 */
app.get(
  "/api/patients/search",
  authMiddleware,
  requireRole("doctor", "admin"),
  async (req, res) => {
    const { q } = req.query || {};
    if (!q)
      return res
        .status(400)
        .json({ success: false, message: "Search query required" });
    try {
      const patients = await User.find({
        role: "patient",
        $or: [
          { pt_id: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      })
        .select("pt_id name email phone status")
        .limit(20);
      res.json({ success: true, data: patients });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT PROFILE ==============

/**
 * @swagger
 * /api/patient/profile:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient profile
 *   patch:
 *     tags: [Patient]
 *     summary: Update patient profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
app.get(
  "/api/patient/profile",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const u = await User.findById(req.user.id).select(
        "email name phone role pt_id",
      );
      if (!u)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      res.json({ success: true, data: u });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.patch(
  "/api/patient/profile",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    const { name, phone } = req.body || {};
    try {
      await User.updateOne({ _id: req.user.id }, { name, phone });
      res.json({ success: true, message: "Profile updated" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT APPOINTMENTS ==============

/**
 * @swagger
 * /api/patient/appointments:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient appointments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient appointments
 *   post:
 *     tags: [Patient]
 *     summary: Book appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppointmentRequest'
 *     responses:
 *       201:
 *         description: Appointment booked
 */
app.get(
  "/api/patient/appointments",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    const { status } = req.query;
    try {
      let query = { patient_id: req.user.id };
      if (status) query.status = status;
      const rows = await Appointment.find(query)
        .populate("doctor_id", "name specialty")
        .populate("service_type_id", "name")
        .sort({ scheduled_at: -1 })
        .limit(50);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/patient/appointments",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    const { doctorId, serviceTypeId, date, time, notes, isVirtual, location } =
      req.body || {};
    if (!doctorId || !date || !time) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Doctor, date and time are required",
        });
    }
    try {
      const scheduledAt = new Date(`${date}T${time}`);
      if (isNaN(scheduledAt.getTime())) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid date/time" });
      }
      const appointment = await Appointment.create({
        patient_id: req.user.id,
        doctor_id: doctorId,
        service_type_id: serviceTypeId || null,
        scheduled_at: scheduledAt,
        notes: notes || "",
        is_virtual: isVirtual || false,
        location: location || "",
        status: "pending",
        type: isVirtual ? "teleconsultation" : "in-person",
      });

      await createNotification(
        doctorId,
        "New Appointment Request",
        `A patient has requested an appointment on ${new Date(
          scheduledAt,
        ).toLocaleString()}`,
        "info",
      );

      res.status(201).json({
        success: true,
        data: appointment,
        message: "Appointment request sent!",
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patient/appointments/{id}/cancel:
 *   patch:
 *     tags: [Patient]
 *     summary: Cancel appointment
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Appointment cancelled
 */
app.patch(
  "/api/patient/appointments/:id/cancel",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const r = await Appointment.updateOne(
        { _id: req.params.id, patient_id: req.user.id },
        { status: "cancelled" },
      );
      if (r.modifiedCount === 0)
        return res
          .status(404)
          .json({
            success: false,
            message: "Appointment not found or cannot be cancelled",
          });
      res.json({
        success: true,
        message: "Appointment cancelled successfully!",
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT FEEDBACK ============

app.post(
  "/api/patient/appointments/:id/feedback",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) {
        return res.status(404).json({ success: false, message: "Appointment not found" });
      }
      if (String(appointment.patient_id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: "Not your appointment" });
      }
      if (appointment.status !== "completed") {
        return res.status(400).json({ success: false, message: "Can only rate completed appointments" });
      }
      const existing = await DoctorRating.findOne({ appointment_id: appointment._id, patient_id: req.user.id });
      if (existing) {
        return res.status(400).json({ success: false, message: "You already rated this appointment" });
      }

      const { rating, comment } = req.body || {};
      const ratingNum = Number(rating);
      if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, message: "Rating must be 1-5" });
      }

      const doctorId = appointment.doctor_id;
      const feedback = await DoctorRating.create({
        doctor_id: doctorId,
        patient_id: req.user.id,
        appointment_id: appointment._id,
        rating: ratingNum,
        comment: typeof comment === "string" ? comment.trim() : "",
      });

      await createNotification(
        doctorId,
        "New Appointment Feedback",
        `You received a ${ratingNum}-star rating${comment ? ' with a comment' : ''}.`,
        "info",
      );

      res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        data: {
          id: feedback._id,
          rating: feedback.rating,
          comment: feedback.comment,
          createdAt: feedback.createdAt,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT RECORDS ==============

/**
 * @swagger
 * /api/patient/records:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient medical records
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient medical records
 */
app.get(
  "/api/patient/records",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    try {
      const rows = await MedicalRecord.find({ patient_id: req.user.id })
        .populate("doctor_id", "name")
        .sort({ record_date: -1 })
        .limit(limit);
      res.json({ success: true, data: rows });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patient/records/{id}/export:
 *   get:
 *     tags: [Patient]
 *     summary: Export medical record as HTML
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: HTML document
 */
app.get(
  "/api/patient/records/:id/export",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const frontendBaseUrl =
        process.env.FRONTEND_URL || "http://localhost:8080";

      const record = await MedicalRecord.findById(req.params.id)
        .populate('doctor_id', 'name specialty')
        .populate('patient_id', 'name email phone');
      if (!record)
        return res
          .status(404)
          .json({ success: false, message: 'Record not found' });
      // Some parts of the app store JWT user id as string id, while Mongoose may store patient_id as ObjectId.
      // Compare robustly.
      const recordPatientId = record.patient_id?._id ? String(record.patient_id._id) : String(record.patient_id);
      const reqUserId = req.user?.id ? String(req.user.id) : '';
      if (!recordPatientId || recordPatientId !== reqUserId) {
        return res
          .status(403)
          .json({ success: false, message: 'Access denied' });
      }
      const findings =
        typeof record.findings === 'object' && record.findings !== null
          ? record.findings
          : {};
      const medications = Array.isArray(record.medications) ? record.medications : [];
      const visualAcuity = record.visualAcuity || findings.visual_acuity;
      const intraocularPressure = record.intraocularPressure || findings.intraocular_pressure;
      const visualAcuityText = visualAcuity
        ? typeof visualAcuity === 'object'
          ? visualAcuity.both || [
              visualAcuity.right && `Right: ${visualAcuity.right}`,
              visualAcuity.left && `Left: ${visualAcuity.left}`,
            ].filter(Boolean).join(' | ')
          : String(visualAcuity)
        : '';
      const intraocularPressureText = intraocularPressure
        ? typeof intraocularPressure === 'object'
          ? [
              intraocularPressure.right && `Right: ${intraocularPressure.right}`,
              intraocularPressure.left && `Left: ${intraocularPressure.left}`,
            ].filter(Boolean).join(' | ')
          : String(intraocularPressure)
        : '';
      const eyeMeasurementsHtml = visualAcuityText || intraocularPressureText
        ? `<div class='section'>
            <h2>Eye Measurements</h2>
            <table>
              ${visualAcuityText ? `<tr><th>Visual Acuity</th><td>${escapeHtml(visualAcuityText)}</td></tr>` : ''}
              ${intraocularPressureText ? `<tr><th>Intraocular Pressure</th><td>${escapeHtml(intraocularPressureText)}</td></tr>` : ''}
            </table>
          </div>`
        : '';
      const medicationRowsHtml = medications.length > 0
        ? medications.map((item) => `
            <tr>
              <td>${escapeHtml(normalizeMedicationValue(item.medication))}</td>
              <td>${escapeHtml(normalizeMedicationValue(item.dosage))}</td>
              <td>${escapeHtml(normalizeMedicationValue(item.duration))}</td>
            </tr>`).join('')
        : `<tr><td colspan='3'>No prescribed medications recorded.</td></tr>`;
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>IMBONI EyeLink - Medical Record</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; color: #000000; }
    .page { max-width: 980px; margin: 0 auto; }
    .header { position: relative; border-bottom: 2px solid #3b82f6; padding: 10px 0 16px; margin-bottom: 18px; }
    .header-row { display: flex; align-items: center; gap: 18px; }
    .logo { height: 92px; width: auto; object-fit: contain; }
    .brand h1 { color: #3b82f6; margin: 0; font-size: 28px; line-height: 1.1; }
    .brand p { margin: 4px 0 0; color: #6b7280; font-size: 14px; font-weight: 700; }
    .badge { position: absolute; top: 0; right: 0; background: transparent; border: 0; color: #000000; padding: 0; border-radius: 0; font-weight: 900; font-size: 13px; text-align: right; line-height: 1.2; }
    .badge .mr { display:block; font-weight: 800; opacity: 1; margin-top: 2px; }
    h2 { color: #000000; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 18px 0 10px; font-size: 18px; }
    .section { margin-bottom: 18px; }
    .label { font-weight: 900; color: #000000; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
    .kv { padding: 6px 0; }
    .kv .value { font-weight: 700; color: #000000; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 9px 10px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    .actions { margin-top: 18px; text-align: center; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 18px; margin: 6px; text-decoration: none; border-radius: 6px; font-weight: 900; border: 0; cursor: pointer; }
    @media print { body { margin: 0; } .actions { display: none; } .badge { border: 0; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="badge">
        Medical Record
        <span class="mr">MR-${escapeHtml(String(record._id).slice(-6))}</span>
      </div>

      <div class="header-row">
        <img src="${frontendBaseUrl}/IMBONI.png" alt="IMBONI EyeLink" class="logo" />
        <div class="brand">
          <h1>IMBONI EyeLink</h1>
          <p>Comprehensive Eye Care Services</p>
          <p style="margin-top:10px; color:#6b7280; font-weight:700;">
            ${escapeHtml(record.type)} &nbsp;|&nbsp; ${escapeHtml(new Date(record.record_date).toLocaleDateString())}
          </p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Patient Information</h2>
      <div class="grid-2">
        <div class="kv"><span class="label">Name:</span> <span class="value">${escapeHtml(record.patient_id?.name || "Unknown")}</span></div>
        <div class="kv"><span class="label">Email:</span> <span class="value">${escapeHtml(record.patient_id?.email || "")}</span></div>
        <div class="kv"><span class="label">Phone:</span> <span class="value">${escapeHtml(record.patient_id?.phone || "")}</span></div>
        <div class="kv"><span class="label">Date:</span> <span class="value">${escapeHtml(new Date(record.record_date).toLocaleDateString())}</span></div>
      </div>
    </div>

    ${record.summary ? `<div class="section"><h2>Clinical Summary</h2><p>${escapeHtml(record.summary)}</p></div>` : ""}
    ${record.diagnosis || findings.diagnosis ? `<div class="section"><h2>Diagnosis</h2><p>${escapeHtml(record.diagnosis || findings.diagnosis)}</p></div>` : ""}
    ${findings.remark ? `<div class="section"><h2>Remark</h2><p>${escapeHtml(findings.remark)}</p></div>` : ""}

    ${eyeMeasurementsHtml}

    ${record.recommendations ? `<div class="section"><h2>Recommendations</h2><p>${escapeHtml(record.recommendations)}</p></div>` : ""}

    <div class="section">
      <h2>Prescribed Medications</h2>
      <table>
        <thead>
          <tr><th>Medication</th><th>Dosage</th><th>Duration</th></tr>
        </thead>
        ${medicationRowsHtml}
      </table>
    </div>

    <div class="actions">
      <button onclick="window.print()" class="btn">Print Record</button>
    </div>
  </div>
</body>
</html>`;
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT PRESCRIPTIONS ==============

/**
 * @swagger
 * /api/patient/prescriptions:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient prescriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient prescriptions
 */
app.get(
  "/api/patient/prescriptions",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const rows = await Prescription.find({ patient_id: req.user.id })
        .populate("doctor_id", "name specialty hospital")
        .sort({ createdAt: -1 })
        .limit(100);
      const data = rows.map((r) => ({
        id: r._id,
        content: r.content,
        status: r.status,
        createdAt: r.createdAt,
        doctor: r.doctor_id?.name,
        doctor_id: r.doctor_id?._id,
        doctor_specialty: r.doctor_id?.specialty,
        hospital: r.doctor_id?.hospital,
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patient/prescriptions/{id}/export:
 *   get:
 *     tags: [Patient]
 *     summary: Export prescription as HTML
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: HTML document
 */
app.get(
  "/api/patient/prescriptions/:id/export",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const rx = await Prescription.findById(req.params.id)
        .populate('doctor_id', 'name specialty hospital')
        .populate('patient_id', 'name email phone');
      if (!rx)
        return res
          .status(404)
          .json({ success: false, message: 'Prescription not found' });
      if (String(rx.patient_id) !== String(req.user.id)) {
        return res
          .status(403)
          .json({ success: false, message: 'Access denied' });
      }
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>IMBONI EyeLink - Prescription</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { height: 60px; margin-bottom: 10px; }
    h1 { color: #3b82f6; margin: 0; font-size: 24px; }
    .section { margin-bottom: 20px; }
    .label { font-weight: bold; color: #4b5563; }
    .content { background: #f9fafb; padding: 20px; border-radius: 8px; white-space: pre-wrap; }
    .actions { margin-top: 30px; text-align: center; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; margin: 5px; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class='header'>
    <h1>IMBONI EyeLink</h1>
    <p>Comprehensive Eye Care Services</p>
    <p><strong>Prescription</strong> RX-${escapeHtml(String(rx._id).slice(-6))} | ${escapeHtml(new Date(rx.createdAt).toLocaleDateString())}</p>
  </div>
  <div class='section'>
    <h2>Patient Information</h2>
    <p><span class='label'>Name:</span> ${escapeHtml(rx.patient_id?.name || 'Unknown')}</p>
    <p><span class='label'>Email:</span> ${escapeHtml(rx.patient_id?.email || '')}</p>
    <p><span class='label'>Phone:</span> ${escapeHtml(rx.patient_id?.phone || '')}</p>
  </div>
  <div class='section'>
    <h2>Doctor Information</h2>
    <p><span class='label'>Name:</span> ${escapeHtml(rx.doctor_id?.name || 'Unknown')}</p>
    <p><span class='label'>Specialty:</span> ${escapeHtml(rx.doctor_id?.specialty || '')}</p>
    ${rx.doctor_id?.hospital ? `<p><span class='label'>Hospital:</span> ${escapeHtml(rx.doctor_id.hospital)}</p>` : ''}
  </div>
  <div class='section'>
    <h2>Prescription Details</h2>
    <div class='content'>${escapeHtml(rx.content)}</div>
  </div>
  <div class='actions'>
    <button onclick='window.print()' class='btn'>Print Prescription</button>
  </div>
</body>
</html>`;
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patient/prescriptions/{id}/refill:
 *   post:
 *     tags: [Patient]
 *     summary: Request prescription refill
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Refill request sent
 */
app.post(
  "/api/patient/prescriptions/:id/refill",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const rx = await Prescription.findById(req.params.id);
      if (!rx)
        return res
          .status(404)
          .json({ success: false, message: "Prescription not found" });
      if (String(rx.patient_id) !== String(req.user.id)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
      await createNotification(
        rx.doctor_id,
        "Refill Request",
        `Patient requested refill for: ${rx.content}`,
        "info",
      );
      res.json({ success: true, message: "Refill request sent to doctor" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PATIENT MESSAGES ==============

/**
 * @swagger
 * /api/patient/messages/conversations:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Patient conversations
 */
app.get(
  "/api/patient/messages/conversations",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const rows = await Conversation.find({ patient_id: req.user.id })
        .populate("doctor_id", "name specialty")
        .sort({ updatedAt: -1 });
      const data = (await Promise.all(
        rows.map(async (r) => {
          const last = await Message.findOne({ conversation_id: r._id }).sort({
            createdAt: -1,
          });
          return {
            id: r._id,
            doctor_id: r.doctor_id._id,
            doctor_name: r.doctor_id.name,
            specialty: r.doctor_id.specialty,
            last_message: last ? last.text : null,
            last_at: last ? last.createdAt : null,
            unread_count: await getUnreadMessageCount(r._id, req.user.id),
          };
        }),
      )).sort((a, b) => {
        const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
        if (unreadDiff) return unreadDiff;
        return Number(new Date(b.last_at || 0)) - Number(new Date(a.last_at || 0));
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/patient/messages/conversations/{id}/messages:
 *   get:
 *     tags: [Patient]
 *     summary: Get conversation messages
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversation messages
 *   post:
 *     tags: [Patient]
 *     summary: Send message
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       201:
 *         description: Message sent
 */
app.get(
  "/api/patient/messages/conversations/:id/messages",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const conv = await Conversation.findOne({
        _id: req.params.id,
        patient_id: req.user.id,
      });
      if (!conv)
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      
      const rows = await Message.find({ conversation_id: req.params.id }).sort({
        createdAt: 1,
      });
      
      const patientId = req.user.id.toString();
      const doctorId = conv.doctor_id.toString();
      
// Mark messages as seen when patient views them
       const unreadMessages = rows.filter(m => 
         m.sender_id.toString() !== patientId && 
         !m.seenAtBy.some((s) => s.user_id.toString() === patientId)
       );
       
       for (const msg of unreadMessages) {
         await Message.findByIdAndUpdate(msg._id, {
           $push: { seenAtBy: { user_id: patientId, seenAt: new Date() } },
         });
       }
       
const data = rows.map((r) => ({
        id: r._id,
        sender_id: r.sender_id.toString(),
        text: r.text,
        created_at: r.createdAt,
        delivered: r.deliveredAtBy.some((d) => d.user_id.toString() === doctorId),
        seen: r.seenAtBy.some((s) => s.user_id.toString() === patientId),
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/patient/messages/conversations/:id/messages",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    const { text } = req.body || {};
    if (!text || !text.trim())
      return res
        .status(400)
        .json({ success: false, message: "Message text required" });
    try {
      const conv = await Conversation.findOne({
        _id: req.params.id,
        patient_id: req.user.id,
      });
      if (!conv)
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      
      // Encrypt the message before storing
      const { ciphertext, iv } = encryptText(text.trim());
      const message = await Message.create({
        conversation_id: req.params.id,
        sender_id: req.user.id,
        ciphertext,
        iv,
        encryptionVersion: 'v1',
      });
      conv.updatedAt = new Date();
      await conv.save();
      
      // Mark as delivered to the other participant (doctor)
      const patientId = req.user.id.toString();
      const doctorId = conv.doctor_id.toString();
      const io = req.app.get("io");
      if (io && io.onlineUsers && io.onlineUsers.has(doctorId)) {
        await Message.findByIdAndUpdate(message._id, {
          $push: { deliveredAtBy: { user_id: doctorId, deliveredAt: new Date() } },
        });
      }
      
      // Emit real-time events
      if (io) {
        const msgData = {
          id: message._id,
          conversationId: req.params.id,
          senderId: String(req.user.id),
          content: text.trim(),
          createdAt: message.createdAt,
          delivered: io.onlineUsers?.has(doctorId) || false,
          seen: false,
        };
        io.to(patientId).emit("message:receive", msgData);
        io.to(doctorId).emit("message:receive", msgData);
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Message sent",
        data: { id: message._id }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== DOCTOR ROUTES ==============

/**
 * @swagger
 * /api/doctor/dashboard/stats:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor dashboard stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor stats
 */
app.get(
  "/api/doctor/dashboard/stats",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart);
      todayEnd.setHours(24, 0, 0, 0);
      const todayAppointments = await Appointment.countDocuments({
        doctor_id: req.user.id,
        scheduled_at: { $gte: todayStart, $lt: todayEnd },
        status: { $ne: "cancelled" },
      });
      const totalPatients = await Appointment.distinct("patient_id", {
        doctor_id: req.user.id,
      }).length;
      const pending = await Appointment.countDocuments({
        doctor_id: req.user.id,
        status: "pending",
        scheduled_at: { $gte: new Date() },
      });
      const completedToday = await Appointment.countDocuments({
        doctor_id: req.user.id,
        scheduled_at: { $gte: todayStart, $lt: todayEnd },
        status: "completed",
      });
      res.json({
        success: true,
        data: {
          todayAppointments,
          totalPatients,
          pendingReviews: pending,
          completedToday,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/appointments:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor appointments
 *     parameters:
 *       - name: date
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor appointments list
 */
app.get(
  "/api/doctor/appointments",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { date, status } = req.query;
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;
    try {
      let query = { doctor_id: req.user.id };
      if (status) query.status = status;
      if (date === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(24, 0, 0, 0);
        query.scheduled_at = { $gte: todayStart, $lt: todayEnd };
      }
      const total = await Appointment.countDocuments(query);
      const rows = await Appointment.find(query)
        .populate("patient_id", "name")
        .sort({ scheduled_at: 1 })
        .skip(skip)
        .limit(limit);
      res.json({ success: true, data: rows, total, page, limit });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/appointments/{id}:
 *   patch:
 *     tags: [Doctor]
 *     summary: Update appointment (status or reschedule)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, cancelled, completed]
 *               scheduled_at:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment updated
 */
app.patch(
  "/api/doctor/appointments/:id",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { status, scheduled_at, notes } = req.body || {};
    const update = {};
    if (status && ["confirmed", "cancelled", "completed"].includes(status))
      update.status = status;
    if (scheduled_at) update.scheduled_at = new Date(scheduled_at);
    if (typeof notes === "string") update.notes = notes;
    if (Object.keys(update).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    }
    try {
      const r = await Appointment.updateOne(
        { _id: req.params.id, doctor_id: req.user.id },
        update,
      );
      if (r.modifiedCount === 0)
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      res.json({ success: true, message: "Appointment updated" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/patients:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor patients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor patients list
 */
app.get(
  "/api/doctor/patients",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page || "1");
      const limit = parseInt(req.query.limit || "20");
      const skip = (page - 1) * limit;
      const patients = await User.find({ role: "patient" })
        .select("pt_id name email phone status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      const total = await User.countDocuments({ role: "patient" });
      res.json({ success: true, data: patients, total, page, limit });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/records:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor medical records
 *     parameters:
 *       - name: patient_id
 *         in: query
 *         schema:
 *           type: string
 *       - name: limit
 *         in: query
 *         schema:
 *           type: number
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor medical records
 */
app.get(
  "/api/doctor/records",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { patient_id, page } = req.query;
    const limit = 20;
    const skip = (parseInt(page || "1") - 1) * limit;
    try {
      let query = { doctor_id: req.user.id };
      if (patient_id) query.patient_id = patient_id;
      const total = await MedicalRecord.countDocuments(query);
      const rows = await MedicalRecord.find(query)
        .populate("patient_id", "name")
        .sort({ record_date: -1 })
        .skip(skip)
        .limit(limit);
      const data = rows.map((r) => ({
        id: r._id,
        patient: r.patient_id
          ? typeof r.patient_id === "object"
            ? r.patient_id.name || "Unknown"
            : String(r.patient_id)
          : "Unknown",
        patient_id: r.patient_id?._id,
        recordType: r.type,
        date: r.record_date ? new Date(r.record_date).toISOString() : "",
        title: r.title,
        summary: r.summary || null,
        findings: r.findings || null,
        recommendations: r.recommendations || null,
        diagnosis: r.diagnosis || "",
        treatmentPlan: r.treatmentPlan || "",
        medications: Array.isArray(r.medications) ? r.medications : [],
        visualAcuity: r.visualAcuity || null,
        intraocularPressure: r.intraocularPressure || null,
        attachments: r.attachments || [],
      }));
      res.json({ success: true, data, total, page: parseInt(page || "1"), limit });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/doctor/records",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const {
      patient_id,
      appointment_id,
      title,
      type,
      record_date,
      summary,
      findings,
      recommendations,
      diagnosis,
      treatmentPlan,
      medications,
      visualAcuity,
      intraocularPressure,
    } = req.body || {};

    if (!patient_id || !title || !type || !record_date) {
      return res.status(400).json({
        success: false,
        message: "Patient, title, record type and record date are required",
      });
    }

    try {
      const patient = await User.findById(patient_id).select("role name");
      if (!patient || patient.role !== "patient") {
        return res.status(400).json({
          success: false,
          message: "Valid patient is required",
        });
      }

      const normalizedFindings =
        findings && typeof findings === "object" && !Array.isArray(findings)
          ? findings
          : {};

      if (diagnosis && typeof diagnosis === "string") {
        normalizedFindings.diagnosis = diagnosis.trim();
      }

      const normalizedMedications = Array.isArray(medications)
        ? medications
            .map((item) => ({
              medication: String(item.medication || "").trim(),
              dosage: String(item.dosage || "").trim(),
              duration: String(item.duration || "").trim(),
            }))
            .filter((item) => item.medication)
        : [];

      const record = await MedicalRecord.create({
        patient_id,
        doctor_id: req.user.id,
        appointment_id: appointment_id || null,
        title: String(title).trim(),
        type: String(type).trim(),
        record_date: new Date(record_date),
        summary: typeof summary === "string" ? summary.trim() || null : null,
        findings: normalizedFindings,
        recommendations:
          typeof recommendations === "string"
            ? recommendations.trim() || null
            : null,
        diagnosis: typeof diagnosis === "string" ? diagnosis.trim() || null : null,
        treatmentPlan:
          typeof treatmentPlan === "string" ? treatmentPlan.trim() || null : null,
        medications: normalizedMedications,
        visualAcuity:
          visualAcuity && typeof visualAcuity === "object" ? visualAcuity : null,
        intraocularPressure:
          intraocularPressure && typeof intraocularPressure === "object"
            ? intraocularPressure
            : null,
      });

      await createNotification(
        patient_id,
        "New Medical Record",
        "Your doctor created a new medical record.",
        "info",
      );

      res.status(201).json({
        success: true,
        data: record,
        message: "Medical record created successfully",
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/records/{id}/export:
 *   get:
 *     tags: [Doctor]
 *     summary: Export medical record as HTML
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: HTML document
 */
app.get(
  "/api/doctor/records/:id/export",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const frontendBaseUrl =
        process.env.FRONTEND_URL || "http://localhost:8080";

      const record = await MedicalRecord.findById(req.params.id).populate(
        "patient_id",
        "name email phone",
      );
      if (!record)
        return res
          .status(404)
          .json({ success: false, message: "Record not found" });
      if (String(record.doctor_id) !== String(req.user.id)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
      const findings =
        typeof record.findings === "object" && record.findings !== null
          ? record.findings
          : {};
      const medications = Array.isArray(record.medications) ? record.medications : [];
      const visualAcuity = record.visualAcuity || findings.visual_acuity;
      const intraocularPressure = record.intraocularPressure || findings.intraocular_pressure;
      const visualAcuityText = visualAcuity
        ? typeof visualAcuity === "object"
          ? visualAcuity.both || [
              visualAcuity.right && `Right: ${visualAcuity.right}`,
              visualAcuity.left && `Left: ${visualAcuity.left}`,
            ].filter(Boolean).join(" | ")
          : String(visualAcuity)
        : "";
      const intraocularPressureText = intraocularPressure
        ? typeof intraocularPressure === "object"
          ? [
              intraocularPressure.right && `Right: ${intraocularPressure.right}`,
              intraocularPressure.left && `Left: ${intraocularPressure.left}`,
            ].filter(Boolean).join(" | ")
          : String(intraocularPressure)
        : "";
      const eyeMeasurementsHtml = visualAcuityText || intraocularPressureText
        ? `<div class="section">
            <h2>Eye Measurements</h2>
            <table>
              ${visualAcuityText ? `<tr><th>Visual Acuity</th><td>${escapeHtml(visualAcuityText)}</td></tr>` : ""}
              ${intraocularPressureText ? `<tr><th>Intraocular Pressure</th><td>${escapeHtml(intraocularPressureText)}</td></tr>` : ""}
            </table>
          </div>`
        : "";
      const medicationRowsHtml = medications.length > 0
        ? medications.map((item) => `
            <tr>
              <td>${escapeHtml(normalizeMedicationValue(item.medication))}</td>
              <td>${escapeHtml(normalizeMedicationValue(item.dosage))}</td>
              <td>${escapeHtml(normalizeMedicationValue(item.duration))}</td>
            </tr>`).join("")
        : `<tr><td colspan="3">No prescribed medications recorded.</td></tr>`;
      const html = `<!DOCTYPE html>
<html>
<head>
  <title>IMBONI EyeLink - Medical Record</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 28px; color: #111827; }
    .page { max-width: 980px; margin: 0 auto; }
    .header {
      position: relative;
      border-bottom: 2px solid #3b82f6;
      padding: 10px 0 16px;
      margin-bottom: 18px;
    }
    .header-row { display: flex; align-items: center; gap: 18px; }
    .logo { height: 92px; width: auto; object-fit: contain; }
    .brand h1 { color: #3b82f6; margin: 0; font-size: 28px; line-height: 1.1; }
    .brand p { margin: 4px 0 0; color: #6b7280; font-size: 14px; font-weight: 700; }
    .badge {
      position: absolute;
      top: 0;
      right: 0;
      background: rgba(59,130,246,0.10);
      border: 1px solid rgba(59,130,246,0.35);
      color: #1d4ed8;
      padding: 8px 12px;
      border-radius: 10px;
      font-weight: 900;
      font-size: 13px;
      text-align: right;
      line-height: 1.2;
    }
    .badge .mr { display:block; font-weight: 800; opacity: 0.92; margin-top: 2px; }
    h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin: 18px 0 10px; font-size: 18px; }
    .section { margin-bottom: 18px; }
    .label { font-weight: 900; color: #4b5563; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
    .kv { padding: 6px 0; }
    .kv .value { font-weight: 700; color: #111827; word-break: break-word; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 9px 10px; text-align: left; vertical-align: top; }
    th { background: #f9fafb; }
    .actions { margin-top: 18px; text-align: center; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 10px 18px; margin: 6px; text-decoration: none; border-radius: 6px; font-weight: 900; border: 0; cursor: pointer; }
    @media print {
      body { margin: 0; }
      .actions { display: none; }
      .badge { border: 1px solid rgba(0,0,0,0.12); }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="badge">
        Medical Record
        <span class="mr">MR-${escapeHtml(String(record._id).slice(-6))}</span>
      </div>

      <div class="header-row">
        <img src="${frontendBaseUrl}/IMBONI.png" alt="IMBONI EyeLink" class="logo" />
        <div class="brand">
          <h1>IMBONI EyeLink</h1>
          <p>Comprehensive Eye Care Services</p>
          <p style="margin-top:10px; color:#6b7280; font-weight:700;">
            ${escapeHtml(record.type)} &nbsp;|&nbsp; ${escapeHtml(new Date(record.record_date).toLocaleDateString())}
          </p>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Patient Information</h2>
      <div class="grid-2">
        <div class="kv"><span class="label">Name:</span> <span class="value">${escapeHtml(record.patient_id?.name || "Unknown")}</span></div>
        <div class="kv"><span class="label">Email:</span> <span class="value">${escapeHtml(record.patient_id?.email || "")}</span></div>
        <div class="kv"><span class="label">Phone:</span> <span class="value">${escapeHtml(record.patient_id?.phone || "")}</span></div>
        <div class="kv"><span class="label">Date:</span> <span class="value">${escapeHtml(new Date(record.record_date).toLocaleDateString())}</span></div>
      </div>
    </div>

    ${record.summary ? `<div class="section"><h2>Clinical Summary</h2><p>${escapeHtml(record.summary)}</p></div>` : ""}
    ${record.diagnosis || findings.diagnosis ? `<div class="section"><h2>Diagnosis</h2><p>${escapeHtml(record.diagnosis || findings.diagnosis)}</p></div>` : ""}
    ${findings.remark ? `<div class="section"><h2>Remark</h2><p>${escapeHtml(findings.remark)}</p></div>` : ""}

    ${eyeMeasurementsHtml}

    ${record.recommendations ? `<div class="section"><h2>Recommendations</h2><p>${escapeHtml(record.recommendations)}</p></div>` : ""}

    <div class="section">
      <h2>Prescribed Medications</h2>
      <table>
        <thead>
          <tr><th>Medication</th><th>Dosage</th><th>Duration</th></tr>
        </thead>
        ${medicationRowsHtml}
      </table>
    </div>

    <div class="actions">
      <button onclick="window.print()" class="btn">Print Record</button>
    </div>
  </div>
</body>
</html>`;
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/prescriptions:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor prescriptions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor prescriptions list
 *   post:
 *     tags: [Doctor]
 *     summary: Create prescription
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, content]
 *             properties:
 *               patient_id: { type: string }
 *               content: { type: string }
 *               appointment_id: { type: string }
 *     responses:
 *       201:
 *         description: Prescription created
 */
app.get(
  "/api/doctor/prescriptions",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = 20;
    const skip = (page - 1) * limit;
    try {
      const total = await Prescription.countDocuments({ doctor_id: req.user.id });
      const rows = await Prescription.find({ doctor_id: req.user.id })
        .populate("patient_id", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      const data = rows.map((r) => ({
        id: r._id,
        patient: r.patient_id?.name || "Unknown",
        patient_id: r.patient_id?._id,
        content: r.content,
        medication: r.content,
        dosage: "",
        duration: "",
        date: r.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        createdAt: r.createdAt,
        status: r.status,
        notes: "",
      }));
      res.json({ success: true, data, total, page, limit });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/doctor/prescriptions",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { patient_id, content, appointment_id } = req.body || {};
    if (!patient_id || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Patient and content are required" });
    }
    try {
      const prescription = await Prescription.create({
        patient_id,
        doctor_id: req.user.id,
        appointment_id: appointment_id || null,
        content,
        status: "active",
      });
      await createNotification(
        patient_id,
        "New Prescription",
        "You have a new prescription from your doctor.",
        "info",
      );
      res.json({
        success: true,
        data: prescription,
        message: "Prescription created successfully",
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/prescriptions/{id}/send:
 *   post:
 *     tags: [Doctor]
 *     summary: Send prescription to patient
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prescription sent
 */
app.post(
  "/api/doctor/prescriptions/:id/send",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const prescription = await Prescription.findById(req.params.id);
      if (!prescription)
        return res
          .status(404)
          .json({ success: false, message: "Prescription not found" });
      if (String(prescription.doctor_id) !== String(req.user.id)) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }
      await createNotification(
        prescription.patient_id,
        "Prescription Sent",
        "Your doctor has sent you a prescription.",
        "info",
      );
      res.json({ success: true, message: "Prescription sent to patient" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/prescriptions/by-date:
 *   get:
 *     tags: [Doctor]
 *     summary: Get prescriptions by patient and date
 *     parameters:
 *       - name: patient_id
 *         in: query
 *         schema:
 *           type: string
 *       - name: date
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Prescriptions for patient on given date
 */
app.get(
  "/api/doctor/prescriptions/by-date",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { patient_id, date } = req.query;
    if (!patient_id || !date) {
      return res.status(400).json({ success: false, message: "patient_id and date are required" });
    }
    try {
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);

      const rows = await Prescription.find({
        doctor_id: req.user.id,
        patient_id: patient_id,
        createdAt: { $gte: dateStart, $lt: dateEnd },
      }).sort({ createdAt: -1 });

      const data = rows.map((r) => ({
        id: r._id,
        content: r.content,
        createdAt: r.createdAt,
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/referrals:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor referrals
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor referrals list
 *   post:
 *     tags: [Doctor]
 *     summary: Create referral
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id, to_facility, reason]
 *             properties:
 *               patient_id: { type: string }
 *               to_facility: { type: string }
 *               reason: { type: string }
 *               priority: { type: string, enum: [low, medium, high, urgent] }
 *     responses:
 *       201:
 *         description: Referral created
 */
app.get(
  "/api/doctor/referrals",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = 20;
    const skip = (page - 1) * limit;
    try {
      const total = await Referral.countDocuments({ from_doctor_id: req.user.id });
      const rows = await Referral.find({ from_doctor_id: req.user.id })
        .populate("patient_id", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      const data = rows.map((r) => ({
        id: r._id,
        patient: r.patient_id.name,
        referTo: r.to_facility || "",
        reason: r.reason || "",
        status: r.status,
        date: r.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }));
      res.json({ success: true, data, total, page, limit });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/doctor/referrals",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { patient_id, to_facility, reason, priority } = req.body || {};
    if (!patient_id || !to_facility || !reason) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Patient, facility, and reason are required",
        });
    }
    try {
      const referral = await Referral.create({
        patient_id,
        from_doctor_id: req.user.id,
        to_facility,
        reason,
        priority: priority || "medium",
        status: "pending",
      });
      await createNotification(
        patient_id,
        "Referral Created",
        "Your doctor has created a referral for you.",
        "info",
      );
      res.json({
        success: true,
        data: referral,
        message: "Referral created successfully",
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/performance/stats:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor performance stats
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor performance stats
 */
app.get(
  "/api/doctor/performance/stats",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const patientsSeenArr = await Appointment.distinct("patient_id", {
        doctor_id: req.user.id,
        status: "completed",
      });
      const patientsSeen = patientsSeenArr.length;
      const appointments = await Appointment.countDocuments({
        doctor_id: req.user.id,
      });
      const ratingAgg = await DoctorRating.aggregate([
        { $match: { doctor_id: new mongoose.Types.ObjectId(req.user.id) } },
        {
          $group: {
            _id: null,
            avg_rating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);
      const avgRating =
        ratingAgg.length > 0 ? ratingAgg[0].avg_rating.toFixed(1) : "0";
      const ratingCount = ratingAgg.length > 0 ? ratingAgg[0].count : 0;
      const recentFeedback = await DoctorRating.find({ doctor_id: req.user.id })
        .populate("patient_id", "name")
        .sort({ createdAt: -1 })
        .limit(5);

      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const appointmentTrendAgg = await Appointment.aggregate([
        {
          $match: {
            doctor_id: new mongoose.Types.ObjectId(req.user.id),
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%b %Y", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { month: "$_id", count: 1, _id: 0 } },
      ]);

      const ratingDistAgg = await DoctorRating.aggregate([
        { $match: { doctor_id: new mongoose.Types.ObjectId(req.user.id) } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $project: { rating: "$_id", count: 1, _id: 0 } },
      ]);
      const ratingDistribution = [
        { rating: 1, count: 0 },
        { rating: 2, count: 0 },
        { rating: 3, count: 0 },
        { rating: 4, count: 0 },
        { rating: 5, count: 0 },
      ];
      ratingDistAgg.forEach((r) => {
        const idx = ratingDistribution.findIndex(
          (item) => item.rating === r.rating,
        );
        if (idx >= 0) ratingDistribution[idx].count = r.count;
      });

      const achievements = [
        {
          title: "100 Patients Milestone",
          description: "Treated over 100 unique patients",
          earned: patientsSeen >= 100,
        },
        {
          title: "Perfect Rating Week",
          description: "Achieved 5.0 rating for an entire week",
          earned: Number(avgRating) === 5.0,
        },
        {
          title: "500 Consultations",
          description: "Completed 500 total consultations",
          earned: appointments >= 500,
        },
        {
          title: "Research Contributor",
          description: "Published a research paper through IMBONI",
          earned: false,
        },
      ];

      const feedbackData = recentFeedback.map((r, i) => ({
        id: String(r._id || i),
        patient: r.patient_id?.name || "Unknown",
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      }));
      res.json({
        success: true,
        data: {
          patientsSeen,
          appointments,
          avgRating,
          ratingCount,
          recentFeedback: feedbackData,
          appointmentTrend: appointmentTrendAgg,
          ratingDistribution,
          achievements,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== DOCTOR PROFILE ==============

/**
 * @swagger
 * /api/doctors/profile:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor profile
 *   put:
 *     tags: [Doctor]
 *     summary: Update doctor profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               specialty: { type: string }
 *               licenseNumber: { type: string }
 *               hospital: { type: string }
 *               experience: { type: string }
 *               education: { type: string }
 *               languages: { type: string }
 *               bio: { type: string }
 *               availability: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
app.get(
  "/api/doctors/profile",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const u = await User.findById(req.user.id).select(
        "name email phone specialty licenseNumber hospital experience education languages bio availability dr_id",
      );
      if (!u)
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      res.json({
        success: true,
        data: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          specialty: u.specialty,
          licenseNumber: u.licenseNumber,
          hospital: u.hospital,
          experience: u.experience,
          education: u.education,
          languages: u.languages,
          bio: u.bio,
          availability: u.availability,
          dr_id: u.dr_id,
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.put(
  "/api/doctors/profile",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const {
      name,
      phone,
      specialty,
      licenseNumber,
      hospital,
      experience,
      education,
      languages,
      bio,
      availability,
    } = req.body || {};
    try {
      const update = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phone;
      if (specialty !== undefined) update.specialty = specialty;
      if (licenseNumber !== undefined) update.licenseNumber = licenseNumber;
      if (hospital !== undefined) update.hospital = hospital;
      if (experience !== undefined) update.experience = experience;
      if (education !== undefined) update.education = education;
      if (languages !== undefined) update.languages = languages;
      if (bio !== undefined) update.bio = bio;
      if (availability !== undefined) update.availability = availability;

      const updated = await User.findByIdAndUpdate(req.user.id, update, {
        new: true,
      }).select(
        "name email phone specialty licenseNumber hospital experience education languages bio availability dr_id",
      );

      res.json({ success: true, data: updated });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== DOCTOR MESSAGES ==============

/**
 * @swagger
 * /api/doctor/messages/conversations:
 *   get:
 *     tags: [Doctor]
 *     summary: Get doctor conversations
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Doctor conversations
 */
app.get(
  "/api/doctor/messages/conversations",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const rows = await Conversation.find({ doctor_id: req.user.id })
        .populate("patient_id", "name")
        .sort({ updatedAt: -1 });
      const data = (await Promise.all(
        rows.map(async (r) => {
          const last = await Message.findOne({ conversation_id: r._id }).sort({
            createdAt: -1,
          });
          return {
            id: r._id,
            patient_id: r.patient_id._id,
            patient_name: r.patient_id.name,
            last_message: last ? last.text : null,
            last_at: last ? last.createdAt : null,
            unread_count: await getUnreadMessageCount(r._id, req.user.id),
          };
        }),
      )).sort((a, b) => {
        const unreadDiff = (b.unread_count || 0) - (a.unread_count || 0);
        if (unreadDiff) return unreadDiff;
        return Number(new Date(b.last_at || 0)) - Number(new Date(a.last_at || 0));
      });
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/messages/conversations/{id}/messages:
 *   get:
 *     tags: [Doctor]
 *     summary: Get conversation messages
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversation messages
 *   post:
 *     tags: [Doctor]
 *     summary: Send message
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 */
app.get(
  "/api/doctor/messages/conversations/:id/messages",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const conv = await Conversation.findOne({
        _id: req.params.id,
        doctor_id: req.user.id,
      });
      if (!conv)
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      
      const rows = await Message.find({ conversation_id: req.params.id }).sort({
        createdAt: 1,
      });
      
      const doctorId = req.user.id.toString();
      const patientId = conv.patient_id.toString();
      
// Mark messages as seen when doctor views them
       const unreadMessages = rows.filter(m => 
         m.sender_id.toString() !== doctorId && 
         !m.seenAtBy.some((s) => s.user_id.toString() === doctorId)
       );
       
       for (const msg of unreadMessages) {
         await Message.findByIdAndUpdate(msg._id, {
           $push: { seenAtBy: { user_id: doctorId, seenAt: new Date() } },
         });
       }
       
const data = rows.map((r) => ({
        id: r._id,
        sender_id: r.sender_id.toString(),
        text: r.text,
        created_at: r.createdAt,
        delivered: r.deliveredAtBy.some((d) => d.user_id.toString() === patientId),
        seen: r.seenAtBy.some((s) => s.user_id.toString() === doctorId),
      }));
      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

app.post(
  "/api/doctor/messages/conversations/:id/messages",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { text } = req.body || {};
    if (!text || !text.trim())
      return res
        .status(400)
        .json({ success: false, message: "Message text required" });
    try {
      const conv = await Conversation.findOne({
        _id: req.params.id,
        doctor_id: req.user.id,
      });
      if (!conv)
        return res
          .status(404)
          .json({ success: false, message: "Conversation not found" });
      
      // Encrypt the message before storing
      const { ciphertext, iv } = encryptText(text.trim());
      const message = await Message.create({
        conversation_id: req.params.id,
        sender_id: req.user.id,
        ciphertext,
        iv,
        encryptionVersion: 'v1',
      });
      conv.updatedAt = new Date();
      await conv.save();
      
      // Mark as delivered to the other participant (patient)
      const doctorId = req.user.id.toString();
      const patientId = conv.patient_id.toString();
      const io = req.app.get("io");
      if (io && io.onlineUsers && io.onlineUsers.has(patientId)) {
        await Message.findByIdAndUpdate(message._id, {
          $push: { deliveredAtBy: { user_id: patientId, deliveredAt: new Date() } },
        });
      }
      
      // Emit real-time events
      if (io) {
        const msgData = {
          id: message._id,
          conversationId: req.params.id,
          senderId: String(req.user.id),
          content: text.trim(),
          createdAt: message.createdAt,
          delivered: io.onlineUsers?.has(patientId) || false,
          seen: false,
        };
        io.to(patientId).emit("message:receive", msgData);
        io.to(doctorId).emit("message:receive", msgData);
      }
      
      res.status(201).json({ 
        success: true, 
        message: "Message sent",
        data: { id: message._id }
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/doctor/messages/conversations:
 *   post:
 *     tags: [Doctor]
 *     summary: Create new conversation with a patient
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient_id]
 *             properties:
 *               patient_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation created
 */
app.post(
  "/api/doctor/messages/conversations",
  authMiddleware,
  requireRole("doctor"),
  async (req, res) => {
    const { patient_id } = req.body || {};
    if (!patient_id)
      return res
        .status(400)
        .json({ success: false, message: "Patient ID required" });
    try {
      const patient = await User.findOne({ _id: patient_id, role: "patient" });
      if (!patient)
        return res
          .status(404)
          .json({ success: false, message: "Patient not found" });
      const existing = await Conversation.findOne({
        doctor_id: req.user.id,
        patient_id,
      });
      if (existing)
        return res
          .json({ success: true, data: { id: existing._id } });
      const conv = await Conversation.create({
        doctor_id: req.user.id,
        patient_id,
      });
      res.status(201).json({ success: true, data: { id: conv._id } });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== PRESENCE ==============
app.get("/api/presence/:userId", async (req, res) => {
  const userId = req.params.userId;
  const io = req.app.get("io");
  if (io && io.onlineUsers) {
    const isOnline = io.onlineUsers.has(String(userId));
    res.json({ success: true, online: isOnline });
  } else {
    res.json({ success: true, online: false });
  }
});

// ============== MEETINGS / WAITING ROOM ==============

/**
 * @swagger
 * /api/meetings/spaces:
 *   post:
 *     tags: [Meetings]
 *     summary: Create a Google Meet space for a virtual appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [appointmentId]
 *             properties:
 *               appointmentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meet space created
 */
app.post("/api/meetings/spaces", authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.body || {};
    const isDoctor =
      req.user.role === "doctor" || req.user.role === "optometrist";
    const isPatient = req.user.role === "patient";
    if (!isDoctor && !isPatient) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    let appointment = null;
    if (appointmentId) {
      appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res
          .status(404)
          .json({ success: false, message: "Appointment not found" });
      }
      const patientId =
        typeof appointment.patient_id === "object"
          ? appointment.patient_id.toString()
          : appointment.patient_id;
      const doctorId =
        typeof appointment.doctor_id === "object"
          ? appointment.doctor_id.toString()
          : appointment.doctor_id;
      if (isDoctor && doctorId !== req.user.id) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Not authorized for this appointment",
          });
      }
      if (isPatient && patientId !== req.user.id) {
        return res
          .status(403)
          .json({
            success: false,
            message: "Not authorized for this appointment",
          });
      }
    }

    let meetingUri = appointment?.meeting_uri;
    if (!meetingUri) {
      const newUri = await createGoogleMeetSpace();
      if (!newUri) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to create Meet space" });
      }
      meetingUri = newUri;
    }

    if (appointment) {
      if (!appointment.meeting_uri) {
        appointment.meeting_uri = meetingUri;
        await appointment.save();
        const io = req.app.get("io");
        const pId =
          typeof appointment.patient_id === "object"
            ? appointment.patient_id.toString()
            : appointment.patient_id;
        const dId =
          typeof appointment.doctor_id === "object"
            ? appointment.doctor_id.toString()
            : appointment.doctor_id;
        if (io) {
          io.to(`user:${pId}`).emit("meeting:ready", {
            appointmentId: appointment._id,
            meetingUri,
          });
          io.to(`user:${dId}`).emit("meeting:ready", {
            appointmentId: appointment._id,
            meetingUri,
          });
        }
      }
      return res.json({ success: true, data: { meetingUri } });
    }

    res.json({ success: true, data: { meetingUri } });
  } catch (e) {
    res
      .status(500)
      .json({
        success: false,
        message: e.message || "Meet space creation failed",
      });
  }
});

/**
 * @swagger
 * /api/meetings/waiting-room:
 *   post:
 *     tags: [Meetings]
 *     summary: Create a waiting room for patients to join
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting room created
 */
app.post(
  "/api/meetings/waiting-room",
  authMiddleware,
  requireRole("doctor", "optometrist"),
  async (req, res) => {
    try {
      const existing = await WaitingRoom.findOne({
        doctor_id: req.user.id,
        status: "waiting",
      });
      if (existing) {
        return res.json({
          success: true,
          data: {
            waitingRoomId: existing._id,
            meetingUri: existing.meeting_uri,
          },
        });
      }

      const meetingUri = await createGoogleMeetSpace();
      if (!meetingUri) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to create waiting room" });
      }

      await WaitingRoom.updateMany(
        { doctor_id: req.user.id, status: "waiting" },
        { status: "completed" },
      );

      const waitingRoom = await WaitingRoom.create({
        doctor_id: req.user.id,
        meeting_uri: meetingUri,
        status: "waiting",
      });

      const io = req.app.get("io");
      if (io) {
        io.to("doctors").emit("waiting-room:created", {
          waitingRoomId: waitingRoom._id,
          doctorId: req.user.id,
          meetingUri,
        });
      }

      res.json({
        success: true,
        data: { waitingRoomId: waitingRoom._id, meetingUri },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/meetings/waiting-room:
 *   get:
 *     tags: [Meetings]
 *     summary: Get active waiting room for doctor
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting room status
 */
app.get(
  "/api/meetings/waiting-room",
  authMiddleware,
  requireRole("doctor", "optometrist"),
  async (req, res) => {
    try {
      const waitingRoom = await WaitingRoom.findOne({
        doctor_id: req.user.id,
        status: "waiting",
      }).populate("patient_ids", "name");

      if (!waitingRoom) {
        return res.json({ success: true, data: null });
      }

      res.json({
        success: true,
        data: {
          waitingRoomId: waitingRoom._id,
          meetingUri: waitingRoom.meeting_uri,
          patient_ids: waitingRoom.patient_ids.map(function (p) {
            return { _id: p._id ? p._id.toString() : p, name: p.name };
          }),
        },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/meetings/waiting-room/{id}/join:
 *   post:
 *     tags: [Meetings]
 *     summary: Patient joins a waiting room
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Joined waiting room
 */
app.post(
  "/api/meetings/waiting-room/:id/join",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const waitingRoom = await WaitingRoom.findById(req.params.id);
      if (!waitingRoom || waitingRoom.status !== "waiting") {
        return res
          .status(404)
          .json({ success: false, message: "Waiting room not available" });
      }

      waitingRoom.patient_ids.push(req.user.id);
      await waitingRoom.save();

      const io = req.app.get("io");
      if (io) {
        const dId =
          typeof waitingRoom.doctor_id === "object" && waitingRoom.doctor_id._id
            ? waitingRoom.doctor_id._id.toString()
            : waitingRoom.doctor_id?.toString?.() || waitingRoom.doctor_id;
        io.to(`user:${dId}`).emit("waiting-room:patient-joined", {
          patientId: req.user.id,
          patientName: (await User.findById(req.user.id)).name,
        });
      }

      waitingRoom.status = "in_progress";
      await waitingRoom.save();

      res.json({
        success: true,
        data: { meetingUri: waitingRoom.meeting_uri },
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/meetings/waiting-rooms:
 *   get:
 *     tags: [Meetings]
 *     summary: Get available waiting rooms for patients
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available waiting rooms
 */
app.get(
  "/api/meetings/waiting-rooms",
  authMiddleware,
  requireRole("patient"),
  async (req, res) => {
    try {
      const waitingRooms = await WaitingRoom.find({ status: "waiting" })
        .populate("doctor_id", "name")
        .sort({ createdAt: -1 })
        .limit(10);

      const seenDoctors = new Set();
      const data = waitingRooms
        .filter((wr) => {
          const did = wr.doctor_id._id.toString();
          if (seenDoctors.has(did)) return false;
          seenDoctors.add(did);
          return true;
        })
        .map((wr) => ({
          waitingRoomId: wr._id,
          doctorId: wr.doctor_id._id,
          doctorName: wr.doctor_id.name,
          createdAt: wr.createdAt,
        }));

      res.json({ success: true, data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

/**
 * @swagger
 * /api/meetings/waiting-room/{id}:
 *   patch:
 *     tags: [Meetings]
 *     summary: Update waiting room status
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [waiting, in_progress, completed]
 *     responses:
 *       200:
 *         description: Waiting room updated
 */
app.patch(
  "/api/meetings/waiting-room/:id",
  authMiddleware,
  requireRole("doctor", "optometrist"),
  async (req, res) => {
    const { status } = req.body || {};
    if (!["waiting", "in_progress", "completed"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }
    try {
      const waitingRoom = await WaitingRoom.findOneAndUpdate(
        { _id: req.params.id, doctor_id: req.user.id },
        { status },
        { new: true },
      );
      if (!waitingRoom) {
        return res
          .status(404)
          .json({ success: false, message: "Waiting room not found" });
      }
      res.json({ success: true, data: waitingRoom });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  },
);

// ============== START SERVER ==============

initDb()
  .then(() => {
    const server = http.createServer(app);

    // Socket.io setup
    const io = new Server(server, {
      cors: {
        origin: corsOrigins.length ? corsOrigins : "*",
        methods: ["GET", "POST"],
      },
    });

    // Track online users
    const onlineUsers = new Map();

    // Swagger setup
    setupSwagger(app);

    io.on("connection", (socket) => {
      console.log("[socket] Client connected:", socket.id);

      const token = socket.handshake.auth?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          socket.userId = decoded.id;
        } catch (e) {
          console.warn("[socket] Invalid token for socket:", socket.id);
        }
      }

      // Track presence - emit when user is online/offline
      if (socket.userId) {
        onlineUsers.set(String(socket.userId), { 
          socketId: socket.id, 
          lastSeen: new Date().toISOString() 
        });
        socket.broadcast.emit('presence:update', { 
          userId: String(socket.userId), 
          online: true 
        });
      }

      socket.on("join", (userId) => {
        socket.join(userId);
        if (socket.userId) {
          User.findById(socket.userId)
            .then((user) => {
              if (
                user &&
                (user.role === "doctor" || user.role === "optometrist")
              ) {
                socket.join("doctors");
                console.log("[socket] Doctor joined doctors room:", userId);
              }
            })
            .catch(() => {});
        }
        console.log("[socket] User joined room:", userId);
      });

      socket.on("join:conversation", (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        console.log("[socket] Joined conversation room:", conversationId);
      });

      socket.on("leave:conversation", (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        console.log("[socket] Left conversation room:", conversationId);
      });

      socket.on("message:send", async (data) => {
        const { conversationId, content } = data;
        if (!conversationId || !content || !socket.userId) return;
        try {
          const conv = await Conversation.findById(conversationId);
          if (!conv) return;
          
          // Encrypt the message
          const { ciphertext, iv } = encryptText(content.trim());
          
          const message = await Message.create({
            conversation_id: conversationId,
            sender_id: socket.userId,
            ciphertext,
            iv,
            encryptionVersion: 'v1',
          });
          
          conv.updatedAt = new Date();
          await conv.save();
          
          // Determine recipient and mark delivered if online
          const otherParticipantId = conv.patient_id.toString() === socket.userId 
            ? conv.doctor_id.toString() 
            : conv.patient_id.toString();
          
          if (io.onlineUsers && io.onlineUsers.has(otherParticipantId)) {
            await Message.findByIdAndUpdate(message._id, {
              $push: { deliveredAtBy: { user_id: otherParticipantId, deliveredAt: new Date() } },
            });
          }
          
          const msgData = {
            id: message._id,
            conversationId: conversationId,
            senderId: String(socket.userId),
            content: content.trim(),
            createdAt: message.createdAt,
            delivered: io.onlineUsers?.has(otherParticipantId) || false,
            seen: false,
          };
          const patientUserId = conv.patient_id.toString();
          const doctorUserId = conv.doctor_id.toString();
          io.to(patientUserId).emit("message:receive", msgData);
          io.to(doctorUserId).emit("message:receive", msgData);
          if (patientUserId !== socket.userId) {
            io.to(patientUserId).emit("notification:new", {
              id: message._id,
              title: "New Message",
              body: content.trim().substring(0, 100),
              type: "info",
              source: "message",
            });
          }
          if (doctorUserId !== socket.userId) {
            io.to(doctorUserId).emit("notification:new", {
              id: message._id,
              title: "New Message",
              body: content.trim().substring(0, 100),
              type: "info",
              source: "message",
            });
          }
        } catch (e) {
          console.error("[socket] Error sending message:", e.message);
        }
      });

      socket.on("typing:start", (conversationId) => {
        if (!socket.userId) return;
        socket.to(`conversation:${conversationId}`).emit("typing:user", {
          userId: socket.userId,
          conversationId,
        });
      });

      socket.on("typing:stop", (conversationId) => {
        if (!socket.userId) return;
        socket.to(`conversation:${conversationId}`).emit("typing:stopped", {
          userId: socket.userId,
          conversationId,
        });
      });

      // Mark messages as seen when user is viewing the conversation
      socket.on("message:seen", async (conversationId) => {
        if (!socket.userId) return;
        try {
          const conv = await Conversation.findById(conversationId);
          if (!conv) return;
          
          const otherParticipantId = conv.patient_id.toString() === socket.userId 
            ? conv.doctor_id.toString() 
            : conv.patient_id.toString();
          
          // Mark all unread messages from other participant as seen
          const unreadMessages = await Message.find({
            conversation_id: conversationId,
            sender_id: { $ne: socket.userId },
          });
          
          for (const msg of unreadMessages) {
            const alreadySeen = msg.seenAtBy?.some((s) => s.user_id.toString() === socket.userId);
            if (!alreadySeen) {
              await Message.findByIdAndUpdate(msg._id, {
                $push: { seenAtBy: { user_id: socket.userId, seenAt: new Date() } },
              });
              
              // Notify sender that their message was seen
              io.to(`conversation:${conversationId}`).emit("message:seen:update", {
                messageId: msg._id,
                seenBy: socket.userId,
              });
            }
          }
        } catch (e) {
          console.error("[socket] Error marking messages as seen:", e.message);
        }
      });

      socket.on("disconnect", () => {
        console.log("[socket] Client disconnected:", socket.id);
        // Mark user as offline
        if (socket.userId) {
          onlineUsers.delete(String(socket.userId));
          socket.broadcast.emit('presence:update', { 
            userId: String(socket.userId), 
            online: false 
          });
        }
      });
    });

    // Make io accessible to routes
    app.set("io", io);
    io.onlineUsers = onlineUsers;

    server.listen(PORT, () => {
      console.log(`[server] IMBONI EyeLink server running on port ${PORT}`);
      console.log(
        `[swagger] API documentation available at http://localhost:${PORT}/api-docs`,
      );
      console.log(`[server] Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch((err) => {
    console.error("[server] Failed to initialize database:", err.message);
    console.warn(
      "[server] Starting server anyway for API documentation/testing. Database routes will fail until MongoDB is reachable.",
    );

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: corsOrigins.length ? corsOrigins : "*",
        methods: ["GET", "POST"],
      },
    });

    setupSwagger(app);
    app.set("io", io);

    server.listen(PORT, () => {
      console.log(`[server] IMBONI EyeLink server running on port ${PORT}`);
      console.log(
        `[swagger] API documentation available at http://localhost:${PORT}/api-docs`,
      );
      console.log(`[server] Health check: http://localhost:${PORT}/health`);
    });
  });
