const mongoose = require('mongoose');

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  console.error('[db_config] Missing MONGO_URI. Check BACKEND/.env');
}
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const normalizedMongoUri = MONGO_URI.replace(/(mongodb\+srv?:\/\/[^/]+)\/\/(.+)/, '$1/$2');

async function connectDb() {
  try {
    const uri = normalizedMongoUri || MONGO_URI;
    console.log('[db_config] Connecting to MongoDB...');
    if (normalizedMongoUri !== MONGO_URI) {
      console.log('[db_config] Normalized MongoDB URI to fix double slashes');
    }
    await mongoose.connect(uri);
    console.log('[db_config] MongoDB connected');
  } catch (err) {
    console.error('[db_config] MongoDB connection failed:', err.message);
    throw err;
  }
}

const idCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
}, { collection: 'id_counters' });

const IdCounter = mongoose.model('IdCounter', idCounterSchema);

// Schemas
const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  region: String,
  district: String,
  address: String,
  phone: String,
  hours: String,
  rating: { type: Number, default: 0 },
  services: [String],
  featured: { type: Boolean, default: false },
  photo_url: String,
}, { timestamps: true });

hospitalSchema.index({ name: 1 });
hospitalSchema.index({ featured: 1, name: 1 });
const Hospital = mongoose.model('Hospital', hospitalSchema);

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin', 'optometrist'], required: true },
  pt_id: { type: String, unique: true, sparse: true }, // Patient ID like 2025IBN001
  dr_id: { type: String, unique: true, sparse: true }, // Doctor ID like 2025DR001
  status: { type: String, enum: ['active', 'inactive', 'pending'], default: 'pending' },
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', default: null },
  specialty: String,
  phone: String,
  district: String,
  last_login: Date,
  // Doctor-specific fields
  licenseNumber: String,
  hospital: String,
  experience: String,
  education: String,
  languages: [String],
  bio: String,
  availability: {
    monday: String,
    tuesday: String,
    wednesday: String,
    thursday: String,
    friday: String,
    saturday: String,
    sunday: String,
  },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const serviceTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  duration_minutes: Number,
  price: Number
}, { timestamps: true });

serviceTypeSchema.index({ name: 1 });
const ServiceType = mongoose.model('ServiceType', serviceTypeSchema);

const appointmentSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service_type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceType', default: null },
  type: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  scheduled_at: { type: Date, required: true },
  location: String,
  is_virtual: { type: Boolean, default: false },
  meeting_uri: String,
  notes: String,
}, { timestamps: true });
const Appointment = mongoose.model('Appointment', appointmentSchema);

const medicalRecordSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  title: { type: String, required: true },
  type: { type: String, required: true },
  record_date: { type: Date, required: true },
  summary: String,
  findings: Object,
  recommendations: String,
  diagnosis: String,
  treatmentPlan: String,
  medications: [{
    medication: { type: String, required: true },
    dosage: String,
    duration: String,
  }],
  visualAcuity: {
    right: String,
    left: String,
    both: String,
  },
  intraocularPressure: {
    right: String,
    left: String,
  },
  attachments: [{
    url: String,
    filename: String,
  }],
}, { timestamps: true });
const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

const prescriptionSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  content: { type: String, required: true },
  status: { type: String, enum: ['active', 'refilled', 'expired'], default: 'active' },
}, { timestamps: true });
const Prescription = mongoose.model('Prescription', prescriptionSchema);

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: String,
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  read: { type: Boolean, default: false },
}, { timestamps: true });
const Notification = mongoose.model('Notification', notificationSchema);

const mobileClinicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  status: { type: String, enum: ['active', 'maintenance', 'scheduled'], default: 'active' },
  equipment: String,
  patients_served: { type: Number, default: 0 },
  next_visit: Date,
  photo_url: String,
}, { timestamps: true });
const MobileClinic = mongoose.model('MobileClinic', mobileClinicSchema);

const clinicScheduleSchema = new mongoose.Schema({
  clinic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileClinic', required: true },
  location_detail: String,
  schedule_date: { type: Date, required: true },
  time_slot: String,
  expected_patients: { type: Number, default: 0 },
}, { timestamps: true });

mobileClinicSchema.index({ status: 1, name: 1 });
clinicScheduleSchema.index({ clinic_id: 1, schedule_date: 1 });
const ClinicSchedule = mongoose.model('ClinicSchedule', clinicScheduleSchema);

const conversationSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

conversationSchema.index({ patient_id: 1, doctor_id: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Encrypted payload (server-side encryption at rest)
  ciphertext: { type: String, required: true },
  iv: { type: String, required: true },
  encryptionVersion: { type: String, default: 'v1' },

  // Receipts
  deliveredAtBy: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deliveredAt: { type: Date, required: true },
  }],
  seenAtBy: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seenAt: { type: Date, required: true },
  }],
}, { timestamps: true });

// Virtual for text (backward compatibility)
messageSchema.virtual('text').get(function() {
  const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'dev-only-insecure-change-me-32bytes-min';
  const MESSAGE_ENCRYPTION_ALGO = 'aes-256-gcm';
  
  function getKey32() {
    return require('crypto').createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
  }
  
  function decryptText(ciphertextB64, ivB64) {
    const crypto = require('crypto');
    const raw = Buffer.from(String(ciphertextB64), 'base64');
    if (raw.length < 16) return '';
    const tag = raw.slice(raw.length - 16);
    const ciphertext = raw.slice(0, raw.length - 16);
    const iv = Buffer.from(String(ivB64), 'base64');
    const decipher = crypto.createDecipheriv(MESSAGE_ENCRYPTION_ALGO, getKey32(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
  
  if (this.ciphertext && this.iv) {
    try {
      return decryptText(this.ciphertext, this.iv);
    } catch (e) {
      return '';
    }
  }
  return '';
});

// Transform for JSON serialization
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });
const Message = mongoose.model('Message', messageSchema);

const referralSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from_doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to_doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  to_facility: String,
  reason: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'accepted', 'completed'], default: 'pending' },
}, { timestamps: true });

const doctorRatingSchema = new mongoose.Schema({
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
}, { timestamps: true });
const Referral = mongoose.model('Referral', referralSchema);
const DoctorRating = mongoose.model('DoctorRating', doctorRatingSchema);

const settingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: Object,
}, { timestamps: true });
const Setting = mongoose.model('Setting', settingSchema);

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  department: String,
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'responded'], default: 'new' },
  responded_by: String,
  response_notes: String,
}, { timestamps: true });
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  specialty: String,
  bio: String,
  photo_url: String,
  order: { type: Number, default: 0 },
}, { timestamps: true });
const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

const waitingRoomSchema = new mongoose.Schema({
  doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  meeting_uri: { type: String, required: true },
  status: { type: String, enum: ['waiting', 'in_progress', 'completed'], default: 'waiting' },
  patient_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true, default: 'Patient' },
  location: String,
  rating: { type: Number, required: true, min: 1, max: 5, default: 5 },
  content: { type: String, required: true },
  image_url: String,
  is_published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
const Testimonial = mongoose.model('Testimonial', testimonialSchema);

const journeyMilestoneSchema = new mongoose.Schema({
  year: { type: String, required: true },
  event: { type: String, required: true },
  is_published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });
const JourneyMilestone = mongoose.model('JourneyMilestone', journeyMilestoneSchema);

const researchArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  authors: [String],
  journal: String,
  year: Number,
  category: { type: String, required: true },
  abstract: String,
  download_url: String,
  external_url: String,
  citations: { type: Number, default: 0 },
  is_published: { type: Boolean, default: true },
}, { timestamps: true });
const ResearchArticle = mongoose.model('ResearchArticle', researchArticleSchema);

researchArticleSchema.index({ category: 1, createdAt: -1 });
teamMemberSchema.index({ order: 1, createdAt: -1 });
testimonialSchema.index({ is_published: 1, order: 1, createdAt: -1 });
journeyMilestoneSchema.index({ is_published: 1, order: 1, createdAt: -1 });

const WaitingRoom = mongoose.model('WaitingRoom', waitingRoomSchema);

// Generate patient ID like 2025IBN001 – atomic counter, no hard limit
async function generatePatientId() {
  const year = new Date().getFullYear();
  const key = `patient_${year}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const counter = await IdCounter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      const num = counter.seq;
      const padded = String(num).padStart(3, '0');
      return `${year}IBN${padded}`;
    } catch (e) {
      if (e.code === 11000) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Failed to generate patient ID after retries');
}

// Generate doctor ID like 2025DR001 – atomic counter, no hard limit
async function generateDoctorId() {
  const year = new Date().getFullYear();
  const key = `doctor_${year}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const counter = await IdCounter.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true },
      );
      const num = counter.seq;
      const padded = String(num).padStart(3, '0');
      return `${year}DR${padded}`;
    } catch (e) {
      if (e.code === 11000) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Failed to generate doctor ID after retries');
}

async function ensureCollections() {
  const db = mongoose.connection.db;
  const modelNames = [
    Hospital, User, ServiceType, Appointment, MedicalRecord, Prescription,
    Notification, MobileClinic, ClinicSchedule, Conversation, Message,
    Referral, DoctorRating, Setting, ContactMessage, TeamMember,
    Testimonial, JourneyMilestone, ResearchArticle, WaitingRoom,
    DonationSettings, DonationPost, Donation,
    IdCounter
  ];
  const existing = await db.listCollections().toArray();
  const existingNames = new Set(existing.map((c) => c.name));
  for (const model of modelNames) {
    const name = model.collection.name;
    if (!existingNames.has(name)) {
      try {
        await db.createCollection(name);
        console.log(`[db] Created collection: ${name}`);
      } catch (e) {
        console.warn(`[db] Failed to create collection ${name}:`, e.message);
      }
    }
  }
}

async function initDb() {
  try {
    await connectDb();
    await ensureCollections();
    await syncIdCounters();
    console.log('[db] Initialization complete');
  } catch (e) {
    console.error('[db] Initialization failed:', e.message);
  }
}

async function syncIdCounters() {
  const year = new Date().getFullYear();

  try {
    const db = mongoose.connection.db;
    const dropPt = db.collection('users').dropIndex('pt_id_1').catch((e) => e);
    const dropDr = db.collection('users').dropIndex('dr_id_1').catch((e) => e);
    await Promise.all([dropPt, dropDr]);
    const dropResults = [dropPt, dropDr];
    dropResults.forEach((err, i) => {
      if (err && err.codeName !== 'IndexNotFound') {
        console.warn(`[id_counters] Failed to drop ${i === 0 ? 'pt_id_1' : 'dr_id_1'}:`, err.message);
      }
    });
    await db.collection('users').createIndex(
      { pt_id: 1 },
      { unique: true, partialFilterExpression: { pt_id: { $type: 'string' } }, name: 'pt_id_partial_v1' },
    );
    await db.collection('users').createIndex(
      { dr_id: 1 },
      { unique: true, partialFilterExpression: { dr_id: { $type: 'string' } }, name: 'dr_id_partial_v1' },
    );
    await User.updateMany(
      { $or: [{ role: { $nin: ['patient'] }, pt_id: { $exists: true } }, { role: { $nin: ['doctor', 'optometrist'] }, dr_id: { $exists: true } }] },
      { $unset: { pt_id: '', dr_id: '' } }
    );
  } catch (e) {
    console.warn('[id_counters] index migration warning:', e.message);
  }

  try {
    const dupes = await mongoose.connection.db.collection('id_counters').aggregate([
      { $group: { _id: '$_id', count: { $sum: 1 }, maxSeq: { $max: '$seq' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    for (const dup of dupes) {
      await mongoose.connection.db.collection('id_counters').deleteMany({ _id: dup._id });
      await IdCounter.updateOne({ _id: dup._id }, { $set: { seq: dup.maxSeq } }, { upsert: true });
    }
  } catch (e) {
    console.warn('[id_counters] dedup warning:', e.message);
  }

  try {
    const ptLast = await User.findOne(
      { pt_id: { $regex: `^${year}IBN` } }
    ).sort({ pt_id: -1 }).lean();
    if (ptLast && ptLast.pt_id) {
      const m = ptLast.pt_id.match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
      const patientSeq = await IdCounter.findOne({ _id: `patient_${year}` }).lean();
      if (!patientSeq) {
        await IdCounter.updateOne({ _id: `patient_${year}` }, { $set: { seq: num } }, { upsert: true });
      } else {
        await IdCounter.updateOne({ _id: `patient_${year}` }, { $set: { seq: num } });
      }
      }
    }

    const drLast = await User.findOne(
      { dr_id: { $regex: `^${year}DR` } }
    ).sort({ dr_id: -1 }).lean();
    if (drLast && drLast.dr_id) {
      const m = drLast.dr_id.match(/(\d+)$/);
      if (m) {
        const num = parseInt(m[1], 10);
      const doctorSeq = await IdCounter.findOne({ _id: `doctor_${year}` }).lean();
      if (!doctorSeq) {
        await IdCounter.updateOne({ _id: `doctor_${year}` }, { $set: { seq: num } }, { upsert: true });
      } else {
        await IdCounter.updateOne({ _id: `doctor_${year}` }, { $set: { seq: num } });
      }
      }
    }
  } catch (e) {
    console.warn('[id_counters] sync warning:', e.message);
  }

  console.log('[id_counters] synced');
}

const donationSettingsSchema = new mongoose.Schema({
  mtn_number: { type: String, default: "" },
  airtel_number: { type: String, default: "" },
  headline: { type: String, default: "Support our eye care mission" },
  description: { type: String, default: "" },
  // Optional admin labels (ex: { "10":"10 USD", "25":"25 USD" })
  amount_labels: { type: Object, default: {} },
}, { timestamps: true });

const donationPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: "" },
  image_urls: { type: [String], default: [] },
  is_published: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const donationSchema = new mongoose.Schema({
  donor_name: { type: String, required: true },
  donor_phone: { type: String, default: "" },
  donor_email: { type: String, default: "" }, // optional; not used for verification
  provider: { type: String, enum: ["mtn", "airtel"], required: true },
  amount_value: { type: Number, required: true },
  amount_currency: { type: String, default: "USD" },
  ussd_reference: { type: String, required: true }, // free text confirmation code/reference
  status: { type: String, enum: ["submitted", "reviewed", "rejected"], default: "submitted" },
}, { timestamps: true });

donationSettingsSchema.index({ createdAt: -1 });
donationPostSchema.index({ is_published: 1, order: 1, createdAt: -1 });
donationSchema.index({ provider: 1, createdAt: -1 });

const DonationSettings = mongoose.model("DonationSettings", donationSettingsSchema);
const DonationPost = mongoose.model("DonationPost", donationPostSchema);
const Donation = mongoose.model("Donation", donationSchema);

module.exports = {
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
  Donation,
};
