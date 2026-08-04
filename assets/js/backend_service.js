/* ==========================================================================
   Laksanasoft Payment Portal - Hardened Google Backend Service API Client (v4)
   Full 1-to-1 Google Apps Script Synchronization Engine
   CORS Pre-Flight Bypass & Cell Formatting Protection
   ========================================================================== */

(function () {
  'use strict';

  const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzw_neGT6xgtp14s5NNZ7Q1xEJzfdCIA3BJCyQOjkYpBI8OiXF80eoRmcSBRXItVz5wdQ/exec";
  const API_SECRET_TOKEN = "LAKSA_SECURE_TOKEN_2026_98F3A";

  function cleanNumber(val) {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const str = String(val).replace(/[^0-9]/g, '');
    return parseInt(str, 10) || 0;
  }

  window.GoogleBackend = {
    isConfigured: function () {
      return GOOGLE_WEB_APP_URL && GOOGLE_WEB_APP_URL.trim() !== "";
    },

    // 1. Fetch Invoices filtered by User ID & Role
    fetchInvoices: async function (userId = '', roleType = 'CLIENT') {
      if (!this.isConfigured()) return null;
      try {
        const url = `${GOOGLE_WEB_APP_URL}?action=getInvoices&token=${encodeURIComponent(API_SECRET_TOKEN)}&userId=${encodeURIComponent(userId)}&roleType=${encodeURIComponent(roleType)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "SUCCESS" && Array.isArray(json.data)) {
          return json.data.map(item => {
            let parsedItems = [];
            if (Array.isArray(item.items)) {
              parsedItems = item.items;
            } else if (typeof item.ItemsJSON === "string" && item.ItemsJSON.trim() !== "") {
              try { parsedItems = JSON.parse(item.ItemsJSON); } catch (e) { parsedItems = []; }
            }

            return {
              id: String(item.id || item.InvoiceID || item.invoiceId || ''),
              vendor: String(item.vendor || item.Vendor || ''),
              vendorLogo: String(item.vendorLogo || item.VendorLogo || 'domain'),
              category: String(item.category || item.Category || ''),
              issueDate: String(item.issueDate || item.IssueDate || ''),
              dueDate: String(item.dueDate || item.DueDate || ''),
              amount: cleanNumber(item.amount || item.Amount),
              tax: cleanNumber(item.tax || item.Tax),
              subtotal: cleanNumber(item.subtotal || item.Subtotal),
              status: String(item.status || item.Status || 'UNPAID').toUpperCase(),
              description: String(item.description || item.Description || ''),
              userId: String(item.userId || item.UserId || item.CorpId || ''),
              items: parsedItems
            };
          });
        }
        return null;
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets Invoices API:", err);
        return null;
      }
    },

    // 2. Fetch Proposals filtered by User ID & Role
    fetchProposals: async function (userId = '', roleType = 'CLIENT') {
      if (!this.isConfigured()) return null;
      try {
        const url = `${GOOGLE_WEB_APP_URL}?action=getProposals&token=${encodeURIComponent(API_SECRET_TOKEN)}&userId=${encodeURIComponent(userId)}&roleType=${encodeURIComponent(roleType)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "SUCCESS" && Array.isArray(json.data)) {
          return json.data.map(item => {
            let parsedItems = [];
            let parsedHistory = [];
            if (Array.isArray(item.items)) {
              parsedItems = item.items;
            } else if (typeof item.ItemsJSON === "string" && item.ItemsJSON.trim() !== "") {
              try { parsedItems = JSON.parse(item.ItemsJSON); } catch (e) { parsedItems = []; }
            }
            if (Array.isArray(item.history)) {
              parsedHistory = item.history;
            } else if (typeof item.HistoryJSON === "string" && item.HistoryJSON.trim() !== "") {
              try { parsedHistory = JSON.parse(item.HistoryJSON); } catch (e) { parsedHistory = []; }
            }

            return {
              id: String(item.id || item.ProposalID || item.proposalId || ''),
              vendor: String(item.vendor || item.Vendor || ''),
              vendorLogo: String(item.vendorLogo || item.VendorLogo || 'request_quote'),
              title: String(item.title || item.Title || ''),
              issueDate: String(item.issueDate || item.IssueDate || ''),
              validUntil: String(item.validUntil || item.ValidUntil || ''),
              originalPrice: cleanNumber(item.originalPrice || item.OriginalPrice),
              counterPrice: item.counterPrice || item.CounterPrice ? cleanNumber(item.counterPrice || item.CounterPrice) : null,
              status: String(item.status || item.Status || 'PENDING').toUpperCase(),
              notes: String(item.notes || item.Notes || ''),
              userId: String(item.userId || item.UserId || ''),
              items: parsedItems,
              history: parsedHistory
            };
          });
        }
        return null;
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets Proposals API:", err);
        return null;
      }
    },

    // 3. Fetch Service Requests filtered by User ID & Role
    fetchRequests: async function (userId = '', roleType = 'CLIENT') {
      if (!this.isConfigured()) return null;
      try {
        const url = `${GOOGLE_WEB_APP_URL}?action=getRequests&token=${encodeURIComponent(API_SECRET_TOKEN)}&userId=${encodeURIComponent(userId)}&roleType=${encodeURIComponent(roleType)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "SUCCESS" && Array.isArray(json.data)) {
          return json.data.map(item => ({
            id: String(item.ReqID || item.reqId || item.id || ''),
            title: String(item.Title || item.title || ''),
            category: String(item.Category || item.category || ''),
            priority: String(item.Priority || item.priority || 'NORMAL'),
            status: String(item.Status || item.status || 'PENDING').toUpperCase(),
            date: String(item.Date || item.date || ''),
            description: String(item.Description || item.description || ''),
            userId: String(item.UserId || item.userId || '')
          }));
        }
        return null;
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets Requests API:", err);
        return null;
      }
    },

    // 4. Fetch Transactions History
    fetchTransactions: async function () {
      if (!this.isConfigured()) return null;
      try {
        const url = `${GOOGLE_WEB_APP_URL}?action=getTransactions&token=${encodeURIComponent(API_SECRET_TOKEN)}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === "SUCCESS" && Array.isArray(json.data)) {
          return json.data.map(item => ({
            trxId: String(item.TrxID || item.trxId || ''),
            invoiceId: String(item.InvoiceID || item.invoiceId || ''),
            vendor: String(item.Vendor || item.vendor || ''),
            amount: cleanNumber(item.Amount || item.amount),
            date: String(item.Date || item.date || ''),
            method: String(item.Method || item.method || ''),
            status: String(item.Status || item.status || 'SUCCESS').toUpperCase(),
            refCode: String(item.RefCode || item.refCode || ''),
            driveReceiptUrl: String(item.DriveReceiptUrl || item.driveReceiptUrl || '')
          }));
        }
        return null;
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets Transactions API:", err);
        return null;
      }
    },

    // 5. Fetch Users List
    fetchUsers: async function () {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(`${GOOGLE_WEB_APP_URL}?action=getUsers&token=${encodeURIComponent(API_SECRET_TOKEN)}`);
        const json = await res.json();
        if (json.status === "SUCCESS" && Array.isArray(json.data)) {
          return json.data;
        }
        return null;
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets Users API:", err);
        return null;
      }
    },

    // 6. Fetch Real-time Live Chats
    fetchChats: async function () {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(`${GOOGLE_WEB_APP_URL}?action=getChats&token=${encodeURIComponent(API_SECRET_TOKEN)}`);
        const json = await res.json();
        if (json.status === "SUCCESS" && Array.isArray(json.data)) {
          return json.data.map(item => ({
            id: String(item.ChatID || item.chatId || ''),
            senderId: String(item.SenderID || item.senderId || ''),
            senderName: String(item.SenderName || item.senderName || ''),
            senderRole: String(item.SenderRole || item.senderRole || ''),
            recipientId: String(item.RecipientID || item.recipientId || ''),
            text: String(item.MessageText || item.text || ''),
            timestamp: String(item.Timestamp || item.timestamp || '')
          }));
        }
        return null;
      } catch (err) {
        console.warn("Gagal terhubung ke Google Sheets Chats API:", err);
        return null;
      }
    },

    // 7. Send Real-time Chat Message (Uses text/plain to bypass CORS Pre-flight OPTIONS)
    sendChatMessage: async function (msgData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "sendChatMessage",
            senderId: msgData.senderId,
            senderName: msgData.senderName,
            senderRole: msgData.senderRole,
            recipientId: msgData.recipientId || 'ALL',
            text: msgData.text
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal mengirim pesan chat:", err);
        return null;
      }
    },

    // 8. User Registration Endpoint
    createUser: async function (userData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "createUser",
            username: userData.username,
            password: userData.password,
            name: userData.name,
            role: userData.role,
            company: userData.company,
            pin: userData.pin
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal membuat user baru di Google Sheets:", err);
        return null;
      }
    },

    // 9. Super Admin Update User
    updateUser: async function (userData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "updateUser",
            username: userData.username,
            password: userData.password || "",
            name: userData.name || "",
            role: userData.role || "",
            company: userData.company || "",
            pin: userData.pin || "",
            status: userData.status || "ACTIVE"
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal meng-update data user:", err);
        return null;
      }
    },

    // 10. Super Admin Delete User
    deleteUser: async function (username) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "deleteUser",
            username: username
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal menghapus user:", err);
        return null;
      }
    },

    // 11. Super Admin Create Invoice
    createInvoice: async function (invData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "createInvoice",
            id: invData.id,
            vendor: invData.vendor,
            vendorLogo: invData.vendorLogo || 'domain',
            category: invData.category,
            issueDate: invData.issueDate,
            dueDate: invData.dueDate,
            amount: cleanNumber(invData.amount),
            tax: cleanNumber(invData.tax),
            subtotal: cleanNumber(invData.subtotal),
            description: invData.description,
            userId: invData.userId
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal membuat invoice baru di Google Sheets:", err);
        return null;
      }
    },

    // 12. Super Admin Delete Invoice
    deleteInvoice: async function (invoiceId) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "deleteInvoice",
            invoiceId: invoiceId
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal menghapus invoice:", err);
        return null;
      }
    },

    // 13. Create Service Request
    createServiceRequest: async function (reqData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "createServiceRequest",
            reqId: reqData.id,
            title: reqData.title,
            category: reqData.category,
            priority: reqData.priority,
            description: reqData.description,
            userId: reqData.userId
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal membuat permintaan layanan:", err);
        return null;
      }
    },

    // 14. Super Admin Update Request Status
    updateRequestStatus: async function (reqId, status) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "updateRequestStatus",
            reqId: reqId,
            status: status
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json : null;
      } catch (err) {
        console.error("Gagal meng-update status permintaan:", err);
        return null;
      }
    },

    // 15. Process Payment
    processPayment: async function (paymentData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "processPayment",
            invoiceId: paymentData.invoiceId,
            vendor: paymentData.vendor,
            amount: cleanNumber(paymentData.amount),
            method: paymentData.method
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json.data : null;
      } catch (err) {
        console.error("Gagal menyimpan ke Google Drive & Sheets:", err);
        return null;
      }
    },

    // 16. Update Proposal Status
    updateProposalStatus: async function (proposalData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "updateProposalStatus",
            proposalId: proposalData.proposalId,
            status: proposalData.status,
            counterPrice: proposalData.counterPrice ? cleanNumber(proposalData.counterPrice) : "",
            historyItem: proposalData.historyItem || null
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS" ? json.data : null;
      } catch (err) {
        console.error("Gagal mengupdate Proposal di Google Sheets:", err);
        return null;
      }
    },

    // 17. User Login Authentication
    loginUser: async function (username, password) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "loginUser",
            username: username,
            password: password
          })
        });
        const json = await res.json();
        if (json.status === "SUCCESS" && json.user) {
          return json.user;
        }
        return null;
      } catch (err) {
        console.error("Gagal otentikasi login dengan Google Sheets:", err);
        return null;
      }
    },

    // 18. Send Telegram Notification via Backend (BUG-012 FIX: token tidak pernah di frontend)
    sendTelegramNotification: async function (message) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "sendTelegramNotification",
            message: String(message || '').slice(0, 1000)
          })
        });
        const json = await res.json();
        return json.status === "SUCCESS";
      } catch (err) {
        console.warn("Gagal kirim notifikasi Telegram via backend:", err);
        return false;
      }
    }
  };

})();
