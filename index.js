const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to handle form submissions
app.post('/api/submit', async (req, res) => {
  try {
    const {
      firstNameEn, fatherNameEn, grandfatherNameEn, familyNameEn,
      firstNameAr, fatherNameAr, grandfatherNameAr, familyNameAr,
      branch, branchOther, iban, swift, bankName
    } = req.body;

    // Server-side validation
    if (!firstNameEn || !fatherNameEn || !grandfatherNameEn || !familyNameEn ||
        !firstNameAr || !fatherNameAr || !grandfatherNameAr || !familyNameAr ||
        !branch || !iban || !swift || !bankName) {
      return res.status(400).json({ error: 'All fields are required / جميع الحقول مطلوبة' });
    }

    // Validate IBAN: starts with JO, total length 30
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    if (!cleanIban.startsWith('JO') || cleanIban.length !== 30) {
      return res.status(400).json({ error: 'Invalid Jordan IBAN. Must start with JO and be 30 characters / رقم الآيبان غير صحيح' });
    }

    // Validate SWIFT Code: 8 or 11 alphanumeric characters
    const cleanSwift = swift.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{8}$|^[A-Z0-9]{11}$/.test(cleanSwift)) {
      return res.status(400).json({ error: 'Invalid SWIFT Code. Must be 8 or 11 alphanumeric characters / رمز السويفت غير صحيح' });
    }

    // Get branch name
    const finalBranch = branch === 'Other' ? (branchOther || 'Other') : branch;

    // Check environment variables
    const credsEnv = process.env.GOOGLE_CREDENTIALS;
    const sheetId = process.env.GOOGLE_SHEET_ID || process.env.SHEET_ID;

    if (!credsEnv || !sheetId) {
      console.error('Missing Google Credentials or Sheet ID in environment variables');
      return res.status(500).json({ error: 'Server configuration error / خطأ في إعدادات الخادم' });
    }

    // Parse credentials
    let credentials;
    try {
      credentials = JSON.parse(credsEnv);
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS environment variable:', e.message);
      return res.status(500).json({ error: 'Server credentials error / خطأ في بيانات المصادقة' });
    }

    // Google Sheets authorization
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const timestamp = new Date().toISOString();

    const row = [
      timestamp,
      firstNameEn.trim(),
      fatherNameEn.trim(),
      grandfatherNameEn.trim(),
      familyNameEn.trim(),
      firstNameAr.trim(),
      fatherNameAr.trim(),
      grandfatherNameAr.trim(),
      familyNameAr.trim(),
      finalBranch.trim(),
      cleanIban,
      cleanSwift,
      bankName.trim()
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:M",
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [row]
      }
    });

    return res.status(200).json({ success: true, message: 'Submitted successfully / تم التسجيل بنجاح' });
  } catch (error) {
    console.error('Error handling submission:', error);
    return res.status(500).json({ error: error.message || 'Submission failed / فشل إرسال البيانات' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
