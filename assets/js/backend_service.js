/* ==========================================================================
   Laksanasoft Payment Portal - Hardened Google Backend Service API Client
   Engine: Google Sheets (Database) & Google Drive (File Storage)
   Security: Secured with API Token & Real-Time Chat Synchronization
   ========================================================================== */

(function () {
  'use strict';

  const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzw_neGT6xgtp14s5NNZ7Q1xEJzfdCIA3BJCyQOjkYpBI8OiXF80eoRmcSBRXItVz5wdQ/exec";
  const API_SECRET_TOKEN = "LAKSA_SECURE_TOKEN_2026_98F3A";

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
              amount: Number(item.amount || item.Amount || 0),
              tax: Number(item.tax || item.Tax || 0),
              subtotal: Number(item.subtotal || item.Subtotal || 0),
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
              originalPrice: Number(item.originalPrice || item.OriginalPrice || 0),
              counterPrice: item.counterPrice || item.CounterPrice ? Number(item.counterPrice || item.CounterPrice) : null,
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

    // 3. Fetch Users List
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

    // 4. Fetch Real-time Live Chats
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

    // 5. Send Real-time Chat Message
    sendChatMessage: async function (msgData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

    // 6. User Registration Endpoint
    createUser: async function (userData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

    // 7. Process Payment
    processPayment: async function (paymentData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "processPayment",
            invoiceId: paymentData.invoiceId,
            vendor: paymentData.vendor,
            amount: paymentData.amount,
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

    // 8. Update Proposal Status
    updateProposalStatus: async function (proposalData) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: API_SECRET_TOKEN,
            action: "updateProposalStatus",
            proposalId: proposalData.proposalId,
            status: proposalData.status,
            counterPrice: proposalData.counterPrice || "",
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

    // 9. User Login Authentication
    loginUser: async function (username, password) {
      if (!this.isConfigured()) return null;
      try {
        const res = await fetch(GOOGLE_WEB_APP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    }
  };

})();
