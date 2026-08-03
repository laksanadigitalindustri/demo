/**
 * ============================================================================
 * Laksanasoft Corporate Payment Portal - Google Apps Script Backend (Hardened)
 * Includes Flexible Sheet User Authentication & Telegram Bot Integration
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

function validateUserCredentials(usernameInput, passwordInput) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Users', 'User', 'users', 'Data User', 'Pengguna']);
  
  const cleanUsername = String(usernameInput || '').trim().toLowerCase();
  const cleanPassword = String(passwordInput || '').trim();

  if (sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      const headers = data[0];
      const usernameIdx = findHeaderIdx(headers, ['Username', 'User', 'UserID', 'ID', 'Nama User']);
      const passwordIdx = findHeaderIdx(headers, ['Password', 'Pass', 'Pwd', 'Kata Sandi']);
      const nameIdx = findHeaderIdx(headers, ['Name', 'Nama', 'FullName', 'Nama Lengkap']);
      const companyIdx = findHeaderIdx(headers, ['Company', 'Perusahaan', 'Instansi', 'PT']);
      const roleIdx = findHeaderIdx(headers, ['Role', 'Jabatan', 'Level', 'Akses']);
      const pinIdx = findHeaderIdx(headers, ['PIN', 'Pin', 'PIN Transaksi']);

      for (let i = 1; i < data.length; i++) {
        const uVal = String(data[i][usernameIdx !== -1 ? usernameIdx : 0] || '').trim();
        const pVal = String(data[i][passwordIdx !== -1 ? passwordIdx : 1] || '').trim();

        if (uVal.toLowerCase() === cleanUsername && pVal === cleanPassword) {
          const nameVal = nameIdx !== -1 ? String(data[i][nameIdx]).trim() : uVal;
          const companyVal = companyIdx !== -1 ? String(data[i][companyIdx]).trim() : 'PT Laksana Software Solutions';
          const roleVal = roleIdx !== -1 ? String(data[i][roleIdx]).trim() : 'Super Admin Korporat';
          const pinVal = pinIdx !== -1 ? String(data[i][pinIdx]).trim() : '123456';

          return {
            success: true,
            user: {
              corpId: uVal,
              userId: uVal,
              name: nameVal || uVal,
              company: companyVal || 'PT Laksana Software Solutions',
              role: roleVal || 'Super Admin Korporat',
              pin: pinVal || '123456'
            }
          };
        }
      }
    }
  }

  // Fallback demo credentials
  if ((cleanUsername === 'admin' && cleanPassword === 'admin') || (cleanUsername === 'superadmin' && cleanPassword === 'admin123')) {
    return {
      success: true,
      user: {
        corpId: cleanUsername,
        userId: cleanUsername,
        name: 'Administrator',
        company: 'PT Laksana Software Solutions',
        role: 'Super Admin Korporat',
        pin: '123456'
      }
    };
  }

  return { success: false };
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
  let responseData = { status: 'SUCCESS' };

  try {
    if (action === 'getInvoices') responseData.data = getTableData('Invoices');
    else if (action === 'getProposals') responseData.data = getTableData('Proposals');
    else if (action === 'getTransactions') responseData.data = getTableData('Transactions');
    else if (action === 'getNotifications') responseData.data = getTableData('Notifications');
    else if (action === 'getRequests') responseData.data = getTableData('Requests');
    else if (action === 'getUsers') responseData.data = getTableData('Users');
    else if (action === 'initTables') responseData.message = initializeDatabaseTables();
    else responseData = { status: 'ERROR', message: 'Aksi tidak dikenali!' };

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
      const password = sanitizeString(requestData.password);

      const authRes = validateUserCredentials(username, password);
      if (authRes.success) {
        responseData.user = authRes.user;
        responseData.message = "Login Berhasil!";
      } else {
        responseData = { status: 'ERROR', message: 'Username atau Password Salah!' };
      }

    } else if (action === 'processPayment') {
      const invId = sanitizeString(requestData.invoiceId);
      const vendor = sanitizeString(requestData.vendor);
      const amount = Number(requestData.amount) || 0;
      const method = sanitizeString(requestData.method);

      const trxResult = recordPaymentTransaction(invId, vendor, amount, method);
      updateInvoiceStatus(invId, 'PAID');
      
      const receiptUrl = generateDriveReceiptPDF(trxResult.trxId, invId, vendor, amount, method, trxResult.refCode);
      updateTransactionDriveUrl(trxResult.trxId, receiptUrl);

      // Telegram Bot Alert
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

      // Telegram Bot Alert for Proposals
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

      // Telegram Bot Alert for Service Request
      const telegramMsg = "<b>📥 NOTIFIKASI PERMINTAAN LAYANAN BARU</b>\n\n" +
        "• <b>ID Permintaan:</b> " + reqId + "\n" +
        "• <b>Judul:</b> " + title + "\n" +
        "• <b>Kategori:</b> " + category + "\n" +
        "• <b>Prioritas:</b> " + priority + "\n" +
        "• <b>Deskripsi:</b> " + desc + "\n\n" +
        "Mohon segera ditinjau oleh tim teknis.";
      sendTelegramNotification(telegramMsg);

      responseData.message = "Permintaan layanan berhasil terkirim!";
    } else {
      responseData = { status: 'ERROR', message: 'Aksi POST tidak valid!' };
    }
  } catch (err) {
    responseData = { status: 'ERROR', message: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function getTableData(tableName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, [tableName, tableName.slice(0, -1), 'Data ' + tableName]);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
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

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(invoiceId)) {
      sheet.getRange(i + 1, 7).setValue(newStatus);
      break;
    }
  }
}

function updateProposalRecord(proposalId, newStatus, counterPrice, historyItem) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = findSheetFlexible(ss, ['Proposals', 'Proposal', 'Data Proposals']);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(proposalId)) {
      sheet.getRange(i + 1, 7).setValue(newStatus);
      if (counterPrice) sheet.getRange(i + 1, 6).setValue(counterPrice);

      if (historyItem) {
        let existingHist = [];
        try { existingHist = JSON.parse(data[i][8]); } catch(e) { existingHist = []; }
        existingHist.push(historyItem);
        sheet.getRange(i + 1, 9).setValue(JSON.stringify(existingHist));
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
