/**
 * ============================================================================
 * Laksanasoft Corporate Payment Portal - Google Apps Script Backend (Hardened v3)
 * Real-Time Chat Engine, Vendor/TargetUser Isolation & Full Admin Control Suite
 * ============================================================================
 */

const API_SECRET_TOKEN = 'LAKSA_SECURE_TOKEN_2026_98F3A';
const TELEGRAM_BOT_TOKEN = '8814615182:AAF_bAmLXUQrUkmxLfCBrnZEKUoFPeyQ0_w';

// Helper function to send Telegram Bot notification
function sendTelegramNotification(messageText) {
  if (!TELEGRAM_BOT_TOKEN) return;

  try {
    const props = PropertiesService.getScriptProperties();
    let chatId = props.getProperty('TELEGRAM_CHAT_ID');

    // Auto-detect Chat ID from getUpdates if not stored
    if (!chatId) {
      const updatesUrl = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/getUpdates";
      const response = UrlFetchApp.fetch(updatesUrl, { muteHttpExceptions: true });
      const json = JSON.parse(response.getContentText());

      if (json.ok && json.result && json.result.length > 0) {
        const lastUpdate = json.result[json.result.length - 1];
        if (lastUpdate.message && lastUpdate.message.chat) {
          chatId = String(lastUpdate.message.chat.id);
          props.setProperty('TELEGRAM_CHAT_ID', chatId);
        }
      }
    }

    if (chatId) {
      const sendUrl = "https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN + "/sendMessage";
      const payload = {
        chat_id: chatId,
        text: messageText,
        parse_mode: 'HTML'
      };

      UrlFetchApp.fetch(sendUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
    }
  } catch (e) {
    Logger.log("Telegram notification error: " + e.toString());
  }
}

function verifyApiToken(token) {
  return token === API_SECRET_TOKEN;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>"'&]/g, function(m) {
    return { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[m];
  });
}

function findSheetFlexible(ss, targetNames) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const name = sheets[i].getName().trim().toLowerCase();
    for (let j = 0; j < targetNames.length; j++) {
      if (name === targetNames[j].toLowerCase()) return sheets[i];
    }
  }
  return null;
}

function findHeaderIdx(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim().toLowerCase();
    for (let j = 0; j < aliases.length; j++) {
      if (h === aliases[j].toLowerCase()) return i;
    }
  }
  return -1;
}

// PRODUCTION: SYSTEM_ROLES_DB hanya berisi Super Admin.
// Seluruh pengguna lain (client, vendor, mitra) dikelola di Google Sheets tab Users.
const SYSTEM_ROLES_DB = [
  {
    username: 'admin',
    password: 'admin',
    userData: {
      corpId: 'admin',
      userId: 'admin',
      name: 'Super Administrator',
      company: 'PT Laksana Software Solutions',
      role: 'Super Admin Korporat',
      roleType: 'ADMIN',
      pin: '',
      status: 'ACTIVE'
    }
  }
];

function validateUserCredentials(usernameInput, passwordInput) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Users', 'User', 'users', 'Data User', 'Pengguna']);
  
  const cleanUsername = String(usernameInput || '').trim().toLowerCase();
  const cleanPassword = String(passwordInput || '').trim();

  // 1. Check Google Sheets Users Table
  if (sheet) {
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length > 1) {
      const headers = data[0];
      const usernameIdx = findHeaderIdx(headers, ['Username', 'User', 'UserID', 'ID', 'Nama User']);
      const passwordIdx = findHeaderIdx(headers, ['Password', 'Pass', 'Pwd', 'Kata Sandi']);
      const nameIdx = findHeaderIdx(headers, ['Name', 'Nama', 'FullName', 'Nama Lengkap']);
      const companyIdx = findHeaderIdx(headers, ['Company', 'Perusahaan', 'Instansi', 'PT']);
      const roleIdx = findHeaderIdx(headers, ['Role', 'Jabatan', 'Level', 'Akses']);
      const pinIdx = findHeaderIdx(headers, ['PIN', 'Pin', 'PIN Transaksi']);
      const statusIdx = findHeaderIdx(headers, ['Status', 'State', 'Kondisi']);

      for (let i = 1; i < data.length; i++) {
        const uVal = String(data[i][usernameIdx !== -1 ? usernameIdx : 0] || '').trim();
        const pVal = String(data[i][passwordIdx !== -1 ? passwordIdx : 1] || '').trim();

        if (uVal.toLowerCase() === cleanUsername && pVal === cleanPassword) {
          const nameVal = nameIdx !== -1 ? String(data[i][nameIdx]).trim() : uVal;
          const companyVal = companyIdx !== -1 ? String(data[i][companyIdx]).trim() : 'PT Laksana Software Solutions';
          let roleVal = roleIdx !== -1 ? String(data[i][roleIdx]).trim() : 'Client Korporat';
          const pinVal = pinIdx !== -1 ? String(data[i][pinIdx]).trim() : '';
          const statusVal = statusIdx !== -1 ? String(data[i][statusIdx]).trim().toUpperCase() : 'ACTIVE';

          if (statusVal === 'SUSPENDED' || statusVal === 'NONACTIVE') {
            return { success: false, message: 'Akun Anda ditangguhkan oleh Super Admin.' };
          }

          let roleType = 'CLIENT';
          if (roleVal.toLowerCase().includes('admin')) roleType = 'ADMIN';
          else if (roleVal.toLowerCase().includes('vendor')) roleType = 'VENDOR';
          else if (roleVal.toLowerCase().includes('mitra')) roleType = 'MITRA';

          return {
            success: true,
            user: {
              corpId: uVal,
              userId: uVal,
              name: nameVal || uVal,
              company: companyVal || 'PT Laksana Software Solutions',
              role: roleVal || 'Client Korporat',
              roleType: roleType,
              pin: pinVal || '',
              status: statusVal
            }
          };
        }
      }
    }
  }

  // 2. Check System Roles DB
  for (let k = 0; k < SYSTEM_ROLES_DB.length; k++) {
    if (SYSTEM_ROLES_DB[k].username.toLowerCase() === cleanUsername && SYSTEM_ROLES_DB[k].password === cleanPassword) {
      return {
        success: true,
        user: SYSTEM_ROLES_DB[k].userData
      };
    }
  }

  return { success: false, message: 'Username atau Password Salah!' };
}

function doGet(e) {
  const token = e.parameter.token;
  if (!verifyApiToken(token)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: 'Akses Ditolak: Token API Tidak Valid!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action;
  const userId = e.parameter.userId || '';
  const roleType = e.parameter.roleType || 'CLIENT';
  let responseData = { status: 'SUCCESS' };

  try {
    if (action === 'getInvoices') {
      const allInvoices = getTableData('Invoices');
      if (roleType === 'ADMIN' || !userId) {
        responseData.data = allInvoices;
      } else {
        responseData.data = allInvoices.filter(inv => {
          const u = String(inv.UserId || inv.userId || inv.CorpId || inv.corpId || inv.Client || '').toLowerCase();
          return u === userId.toLowerCase();
        });
      }
    } else if (action === 'getProposals') {
      const allProposals = getTableData('Proposals');
      if (roleType === 'ADMIN' || !userId) {
        responseData.data = allProposals;
      } else {
        responseData.data = allProposals.filter(quo => {
          const u = String(quo.UserId || quo.userId || quo.TargetUserId || '').toLowerCase();
          const v = String(quo.VendorId || quo.vendorId || quo.Vendor || '').toLowerCase();
          return u === userId.toLowerCase() || v === userId.toLowerCase();
        });
      }
    } else if (action === 'getTransactions') {
      responseData.data = getTableData('Transactions');
    } else if (action === 'getNotifications') {
      responseData.data = getTableData('Notifications');
    } else if (action === 'getRequests') {
      const allRequests = getTableData('Requests');
      if (roleType === 'ADMIN' || !userId) {
        responseData.data = allRequests;
      } else {
        responseData.data = allRequests.filter(req => {
          const u = String(req.UserId || req.userId || req.SenderId || '').toLowerCase();
          return u === userId.toLowerCase();
        });
      }
    } else if (action === 'getUsers') {
      const sheetUsers = getTableData('Users');
      const map = new Map();
      SYSTEM_ROLES_DB.forEach(s => map.set(s.username.toLowerCase(), s.userData));
      sheetUsers.forEach(u => {
        const uname = String(u.Username || u.username || u.User || '').toLowerCase();
        if (uname) {
          map.set(uname, {
            corpId: uname,
            userId: uname,
            name: String(u.Name || u.name || uname),
            company: String(u.Company || u.company || 'PT Laksana Digital Industri'),
            role: String(u.Role || u.role || 'Client Korporat'),
            roleType: String(u.Role || u.role || '').toLowerCase().includes('admin') ? 'ADMIN' : String(u.Role || '').toLowerCase().includes('vendor') ? 'VENDOR' : String(u.Role || '').toLowerCase().includes('mitra') ? 'MITRA' : 'CLIENT',
            pin: String(u.PIN || u.pin || ''),
            status: String(u.Status || u.status || 'ACTIVE').toUpperCase()
          });
        }
      });
      responseData.data = Array.from(map.values());
    } else if (action === 'getChats') {
      responseData.data = getTableData('Chats');
    } else if (action === 'getUserDataFull') {
      const targetUser = e.parameter.targetUserId || '';
      responseData.data = {
        invoices: getTableData('Invoices').filter(i => String(i.UserId || i.userId || '').toLowerCase() === targetUser.toLowerCase()),
        proposals: getTableData('Proposals').filter(p => String(p.UserId || p.userId || '').toLowerCase() === targetUser.toLowerCase()),
        requests: getTableData('Requests').filter(r => String(r.UserId || r.userId || '').toLowerCase() === targetUser.toLowerCase())
      };
    } else if (action === 'initTables') {
      responseData.message = initializeDatabaseTables();
    } else {
      responseData = { status: 'ERROR', message: 'Aksi tidak dikenali!' };
    }

  } catch (error) {
    responseData = { status: 'ERROR', message: error.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let requestData = {};
  try {
    requestData = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: 'Format Payload JSON Tidak Valid!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (!verifyApiToken(requestData.token)) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'ERROR',
      message: 'Akses Ditolak: Token API Tidak Valid!'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = requestData.action;
  let responseData = { status: 'SUCCESS' };

  try {
    if (action === 'loginUser') {
      const username = sanitizeString(requestData.username);
      // BUG-010 FIX: Password tidak boleh di-sanitize sebelum perbandingan.
      // sanitizeString() mengubah karakter seperti & " ' < > menjadi HTML entity
      // sehingga password yang mengandung karakter tersebut SELALU gagal cocok.
      const password = String(requestData.password || '').trim();

      const authRes = validateUserCredentials(username, password);
      if (authRes.success) {
        responseData.user = authRes.user;
        responseData.message = "Login Berhasil!";
      } else {
        responseData = { status: 'ERROR', message: authRes.message || 'Username atau Password Salah!' };
      }

    } else if (action === 'sendChatMessage') {
      const chatRes = recordChatMessage(
        sanitizeString(requestData.senderId),
        sanitizeString(requestData.senderName),
        sanitizeString(requestData.senderRole),
        sanitizeString(requestData.recipientId),
        sanitizeString(requestData.text)
      );

      const telegramMsg = "<b>💬 PESAN CHAT BARU DIPORTAL</b>\n\n" +
        "• <b>Pengirim:</b> " + sanitizeString(requestData.senderName) + " (" + sanitizeString(requestData.senderRole) + ")\n" +
        "• <b>Tujuan:</b> " + sanitizeString(requestData.recipientId) + "\n" +
        "• <b>Pesan:</b> " + sanitizeString(requestData.text) + "\n" +
        "• <b>Waktu:</b> " + chatRes.timestamp;
      sendTelegramNotification(telegramMsg);

      responseData.chatId = chatRes.chatId;
      responseData.message = "Pesan terkirim!";

    } else if (action === 'createUser') {
      recordNewUser(
        sanitizeString(requestData.username),
        sanitizeString(requestData.password),
        sanitizeString(requestData.name),
        sanitizeString(requestData.role),
        sanitizeString(requestData.company),
        sanitizeString(requestData.pin)
      );
      responseData.message = "Pengguna berhasil didaftarkan ke spreadsheet!";

    } else if (action === 'updateUser') {
      updateUserRecord(sanitizeString(requestData.username), requestData);
      responseData.message = "Data pengguna berhasil diperbarui oleh Super Admin!";

    } else if (action === 'deleteUser') {
      deleteUserRecord(sanitizeString(requestData.username));
      responseData.message = "Pengguna berhasil dihapus!";

    } else if (action === 'createInvoice') {
      const invRes = recordNewInvoice(requestData);
      responseData.invoiceId = invRes.invoiceId;
      responseData.message = "Invoice baru berhasil dibuat!";

    } else if (action === 'deleteInvoice') {
      deleteInvoiceRecord(sanitizeString(requestData.invoiceId));
      responseData.message = "Invoice berhasil dihapus oleh Super Admin!";

    } else if (action === 'processPayment') {
      const invId = sanitizeString(requestData.invoiceId);
      const vendor = sanitizeString(requestData.vendor);
      const amount = Number(requestData.amount) || 0;
      const method = sanitizeString(requestData.method);

      const trxResult = recordPaymentTransaction(invId, vendor, amount, method);
      updateInvoiceStatus(invId, 'PAID');
      
      const receiptUrl = generateDriveReceiptPDF(trxResult.trxId, invId, vendor, amount, method, trxResult.refCode);
      updateTransactionDriveUrl(trxResult.trxId, receiptUrl);

      const telegramMsg = "<b>🔔 NOTIFIKASI PEMBAYARAN MASUK</b>\n\n" +
        "• <b>No. Invoice:</b> " + invId + "\n" +
        "• <b>Vendor:</b> " + vendor + "\n" +
        "• <b>Nominal:</b> Rp " + amount.toLocaleString('id-ID') + "\n" +
        "• <b>Metode:</b> " + method + "\n" +
        "• <b>Ref Code:</b> " + trxResult.refCode + "\n" +
        "• <b>Status:</b> LUNAS / VERIFIED\n\n" +
        "📄 <a href='" + receiptUrl + "'>Buka Kuitansi Google Drive</a>";
      sendTelegramNotification(telegramMsg);

      responseData.trxId = trxResult.trxId;
      responseData.refCode = trxResult.refCode;
      responseData.driveReceiptUrl = receiptUrl;

    } else if (action === 'updateProposalStatus') {
      const propId = sanitizeString(requestData.proposalId);
      const newStatus = sanitizeString(requestData.status);
      const counterPrice = requestData.counterPrice ? Number(requestData.counterPrice) : null;
      const historyItem = requestData.historyItem || null;

      updateProposalRecord(propId, newStatus, counterPrice, historyItem);

      let statusIcon = newStatus === 'APPROVED' ? '✅' : newStatus === 'REJECTED' ? '❌' : '🔄';
      let telegramMsg = "<b>" + statusIcon + " NOTIFIKASI PENAWARAN VENDOR</b>\n\n" +
        "• <b>ID Penawaran:</b> " + propId + "\n" +
        "• <b>Status Terbaru:</b> " + newStatus + "\n";

      if (counterPrice) telegramMsg += "• <b>Harga Negosiasi Balik:</b> Rp " + counterPrice.toLocaleString('id-ID') + "\n";
      if (historyItem && historyItem.text) telegramMsg += "• <b>Catatan:</b> " + sanitizeString(historyItem.text) + "\n";

      sendTelegramNotification(telegramMsg);
      responseData.message = "Status penawaran berhasil diperbarui!";

    } else if (action === 'createServiceRequest') {
      const reqId = sanitizeString(requestData.reqId);
      const title = sanitizeString(requestData.title);
      const category = sanitizeString(requestData.category);
      const priority = sanitizeString(requestData.priority);
      const desc = sanitizeString(requestData.description);
      const userId = sanitizeString(requestData.userId);

      recordServiceRequest(reqId, title, category, priority, desc, userId);

      const telegramMsg = "<b>📥 NOTIFIKASI PERMINTAAN LAYANAN BARU</b>\n\n" +
        "• <b>ID Permintaan:</b> " + reqId + "\n" +
        "• <b>Judul:</b> " + title + "\n" +
        "• <b>Kategori:</b> " + category + "\n" +
        "• <b>Prioritas:</b> " + priority + "\n" +
        "• <b>Deskripsi:</b> " + desc + "\n\n" +
        "Mohon segera ditinjau oleh tim teknis.";
      sendTelegramNotification(telegramMsg);

      responseData.message = "Permintaan layanan berhasil terkirim!";

    } else if (action === 'sendTelegramNotification') {
      // BUG-012 FIX: Notifikasi Telegram dikirim dari backend \u2014 token tidak pernah terekspos ke frontend
      const msgText = String(requestData.message || '').slice(0, 1000); // batas 1000 karakter
      if (msgText) {
        sendTelegramNotification(msgText);
        responseData.message = 'Notifikasi terkirim!';
      } else {
        responseData = { status: 'ERROR', message: 'Pesan kosong!' };
      }

    } else if (action === 'updateRequestStatus') {
      const reqId = sanitizeString(requestData.reqId);
      const newStatus = sanitizeString(requestData.status);
      updateRequestRecord(reqId, newStatus);
      responseData.message = "Status permintaan berhasil diperbarui oleh Super Admin!";

    } else {
      responseData = { status: 'ERROR', message: 'Aksi POST tidak valid!' };
    }
  } catch (err) {
    responseData = { status: 'ERROR', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

// Uses getDisplayValues() to preserve strings, leading zeros, and clean dates
function getTableData(tableName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, [tableName, tableName.slice(0, -1), 'Data ' + tableName]);
  if (!sheet) return [];

  const data = sheet.getDataRange().getDisplayValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function recordChatMessage(senderId, senderName, senderRole, recipientId, text) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = findSheetFlexible(ss, ['Chats', 'Chat', 'Data Chats']);
  if (!sheet) {
    sheet = ss.insertSheet('Chats');
    sheet.appendRow(['ChatID', 'SenderID', 'SenderName', 'SenderRole', 'RecipientID', 'MessageText', 'Timestamp', 'IsRead']);
  }

  const chatId = 'MSG-' + Math.floor(1000000 + Math.random() * 9000000);
  const timeStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([chatId, senderId, senderName, senderRole, recipientId || 'ALL', text, timeStr, 'FALSE']);
  return { chatId: chatId, timestamp: timeStr };
}

function recordNewUser(username, password, name, role, company, pin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = findSheetFlexible(ss, ['Users', 'User', 'Data Users']);
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['Username', 'Password', 'Name', 'Role', 'Company', 'PIN', 'Status']);
  }

  sheet.appendRow([username, password, name, role, company || 'PT Laksana Digital Industri', pin || '', 'ACTIVE']);
  return true;
}

function updateUserRecord(username, updateData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Users', 'User', 'Data Users']);
  if (!sheet) return false;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      if (updateData.password) sheet.getRange(i + 1, 2).setValue(updateData.password);
      if (updateData.name) sheet.getRange(i + 1, 3).setValue(updateData.name);
      if (updateData.role) sheet.getRange(i + 1, 4).setValue(updateData.role);
      if (updateData.company) sheet.getRange(i + 1, 5).setValue(updateData.company);
      if (updateData.pin) sheet.getRange(i + 1, 6).setValue(updateData.pin);
      if (updateData.status) sheet.getRange(i + 1, 7).setValue(updateData.status);
      return true;
    }
  }
  return false;
}

function deleteUserRecord(username) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Users', 'User', 'Data Users']);
  if (!sheet) return;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function recordNewInvoice(invData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = findSheetFlexible(ss, ['Invoices', 'Invoice', 'Data Invoices']);
  if (!sheet) {
    sheet = ss.insertSheet('Invoices');
    sheet.appendRow(['InvoiceID', 'Vendor', 'VendorLogo', 'Category', 'IssueDate', 'DueDate', 'Amount', 'Tax', 'Subtotal', 'Status', 'Description', 'UserId']);
  }

  const invId = invData.id || ('INV-' + Math.floor(1000 + Math.random() * 9000));
  sheet.appendRow([
    invId,
    invData.vendor || 'Laksanasoft',
    invData.vendorLogo || 'domain',
    invData.category || 'TI Services',
    invData.issueDate || '01 Agt 2026',
    invData.dueDate || '30 Agt 2026',
    invData.amount || 0,
    invData.tax || 0,
    invData.subtotal || 0,
    'UNPAID',
    invData.description || 'Layanan TI Korporat',
    invData.userId || ''
  ]);

  return { invoiceId: invId };
}

function deleteInvoiceRecord(invoiceId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Invoices', 'Invoice', 'Data Invoices']);
  if (!sheet) return;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(invoiceId).trim()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function recordServiceRequest(reqId, title, category, priority, desc, userId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = findSheetFlexible(ss, ['Requests', 'Request', 'Data Requests']);
  if (!sheet) {
    sheet = ss.insertSheet('Requests');
    sheet.appendRow(['ReqID', 'Title', 'Category', 'Priority', 'Status', 'Date', 'Description', 'UserId']);
  }

  const dateStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  sheet.appendRow([reqId, title, category, priority, 'PENDING', dateStr, desc, userId || '']);
}

function updateRequestRecord(reqId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Requests', 'Request', 'Data Requests']);
  if (!sheet) return;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(reqId).trim()) {
      sheet.getRange(i + 1, 5).setValue(newStatus);
      break;
    }
  }
}

function recordPaymentTransaction(invoiceId, vendor, amount, method) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = findSheetFlexible(ss, ['Transactions', 'Transaction', 'Data Transactions']);
  if (!sheet) {
    sheet = ss.insertSheet('Transactions');
    sheet.appendRow(['TrxID', 'InvoiceID', 'Vendor', 'Amount', 'Date', 'Method', 'Status', 'RefCode', 'DriveReceiptUrl']);
  }

  const trxId = 'TRX-' + Math.floor(100000000 + Math.random() * 900000000);
  const refCode = 'LKS-' + Math.floor(1000000000 + Math.random() * 9000000000);
  const dateStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

  sheet.appendRow([trxId, invoiceId, vendor, amount, dateStr, method, 'SUCCESS', refCode, '']);
  return { trxId: trxId, refCode: refCode };
}

function updateInvoiceStatus(invoiceId, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Invoices', 'Invoice', 'Data Invoices']);
  if (!sheet) return;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(invoiceId)) {
      sheet.getRange(i + 1, 10).setValue(newStatus);
      break;
    }
  }
}

function updateTransactionDriveUrl(trxId, driveUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Transactions', 'Transaction', 'Data Transactions']);
  if (!sheet) return;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(trxId)) {
      sheet.getRange(i + 1, 9).setValue(driveUrl);
      break;
    }
  }
}

function updateProposalRecord(proposalId, newStatus, counterPrice, historyItem) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Proposals', 'Proposal', 'Data Proposals']);
  if (!sheet) return;

  const data = sheet.getDataRange().getDisplayValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(proposalId)) {
      sheet.getRange(i + 1, 9).setValue(newStatus);
      if (counterPrice) sheet.getRange(i + 1, 8).setValue(counterPrice);

      if (historyItem) {
        let existingHist = [];
        try { existingHist = JSON.parse(data[i][11]); } catch(e) { existingHist = []; }
        existingHist.push(historyItem);
        sheet.getRange(i + 1, 12).setValue(JSON.stringify(existingHist));
      }
      break;
    }
  }
}

function generateDriveReceiptPDF(trxId, invoiceId, vendor, amount, method, refCode) {
  try {
    const folderName = "Laksanasoft_Receipts_Cloud";
    const folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    const htmlContent = "<html><body style='font-family:sans-serif;padding:30px;'>" +
      "<h2 style='color:#0f172a;'>LAKSANASOFT BUKTI PEMBAYARAN KORPORAT</h2>" +
      "<hr/><p><b>ID Transaksi:</b> " + sanitizeString(trxId) + "</p>" +
      "<p><b>No. Invoice:</b> " + sanitizeString(invoiceId) + "</p>" +
      "<p><b>Vendor:</b> " + sanitizeString(vendor) + "</p>" +
      "<p><b>Total Pembayaran:</b> Rp " + Number(amount).toLocaleString('id-ID') + "</p>" +
      "<p><b>Metode:</b> " + sanitizeString(method) + "</p>" +
      "<p><b>Referensi Bank:</b> " + sanitizeString(refCode) + "</p>" +
      "<p><b>Status:</b> LUNAS / VERIFIED</p>" +
      "<hr/><p style='font-size:10px;color:gray;'>Dokumen ini diterbitkan secara otomatis oleh Laksanasoft Payment Portal.</p>" +
      "</body></html>";

    const file = folder.createFile("Resi_" + trxId + ".html", htmlContent, MimeType.HTML);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "";
  }
}

function initializeDatabaseTables() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let uSheet = findSheetFlexible(ss, ['Users', 'User']);
  if (!uSheet) {
    uSheet = ss.insertSheet('Users');
    uSheet.appendRow(['Username', 'Password', 'Name', 'Role', 'Company', 'PIN', 'Status']);
    SYSTEM_ROLES_DB.forEach(s => uSheet.appendRow([s.username, s.password, s.userData.name, s.userData.role, s.userData.company, s.userData.pin, 'ACTIVE']));
  }

  let iSheet = findSheetFlexible(ss, ['Invoices', 'Invoice']);
  if (!iSheet) {
    iSheet = ss.insertSheet('Invoices');
    iSheet.appendRow(['InvoiceID', 'Vendor', 'VendorLogo', 'Category', 'IssueDate', 'DueDate', 'Amount', 'Tax', 'Subtotal', 'Status', 'Description', 'UserId']);
  }

  let pSheet = findSheetFlexible(ss, ['Proposals', 'Proposal']);
  if (!pSheet) {
    pSheet = ss.insertSheet('Proposals');
    pSheet.appendRow(['ProposalID', 'Vendor', 'VendorLogo', 'Title', 'IssueDate', 'ValidUntil', 'OriginalPrice', 'CounterPrice', 'Status', 'Notes', 'UserId', 'HistoryJSON']);
  }

  let rSheet = findSheetFlexible(ss, ['Requests', 'Request']);
  if (!rSheet) {
    rSheet = ss.insertSheet('Requests');
    rSheet.appendRow(['ReqID', 'Title', 'Category', 'Priority', 'Status', 'Date', 'Description', 'UserId']);
  }

  let tSheet = findSheetFlexible(ss, ['Transactions', 'Transaction']);
  if (!tSheet) {
    tSheet = ss.insertSheet('Transactions');
    tSheet.appendRow(['TrxID', 'InvoiceID', 'Vendor', 'Amount', 'Date', 'Method', 'Status', 'RefCode', 'DriveReceiptUrl']);
  }

  let cSheet = findSheetFlexible(ss, ['Chats', 'Chat']);
  if (!cSheet) {
    cSheet = ss.insertSheet('Chats');
    cSheet.appendRow(['ChatID', 'SenderID', 'SenderName', 'SenderRole', 'RecipientID', 'MessageText', 'Timestamp', 'IsRead']);
  }

  return "Tabel Database Berhasil Diinisialisasi Lengkap!";
}
