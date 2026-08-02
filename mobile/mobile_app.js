/* ==========================================================================
   Laksanasoft Mobile App - Dedicated Smartphone Application Engine
   Includes Pull-To-Refresh Touch Gesture & Hardware Back Button Navigation
   ========================================================================== */

(function () {
  'use strict';

  const store = {
    user: {
      corpId: 'admin',
      userId: 'admin',
      name: 'Administrator',
      company: 'PT Laksana Software Solutions',
      role: 'Super Admin Korporat',
      isLoggedIn: true,
      pin: '123456'
    },
    invoices: [],
    proposals: [],
    transactions: [],
    notifications: [],
    currentTab: 'home',
    selectedInvoice: null,
    selectedProposal: null,
    selectedTrx: null,
    paymentMethod: 'bca_va',
    enteredPin: '',
    latestReceipt: null,
    qrisTimerSeconds: 899
  };

  const navigationStack = ['home'];

  function normalizeInvoice(inv) {
    if (!inv) return null;
    let parsedItems = [];
    if (Array.isArray(inv.items)) {
      parsedItems = inv.items;
    } else if (typeof inv.ItemsJSON === 'string' && inv.ItemsJSON.trim() !== '') {
      try { parsedItems = JSON.parse(inv.ItemsJSON); } catch (e) { parsedItems = []; }
    }

    return {
      id: String(inv.id || inv.InvoiceID || inv.invoiceId || ''),
      vendor: String(inv.vendor || inv.Vendor || ''),
      vendorLogo: String(inv.vendorLogo || inv.VendorLogo || 'domain'),
      category: String(inv.category || inv.Category || ''),
      issueDate: String(inv.issueDate || inv.IssueDate || ''),
      dueDate: String(inv.dueDate || inv.DueDate || ''),
      amount: Number(inv.amount || inv.Amount || 0),
      tax: Number(inv.tax || inv.Tax || 0),
      subtotal: Number(inv.subtotal || inv.Subtotal || 0),
      status: String(inv.status || inv.Status || 'UNPAID').toUpperCase(),
      description: String(inv.description || inv.Description || ''),
      items: parsedItems
    };
  }

  function normalizeProposal(quo) {
    if (!quo) return null;
    let parsedItems = [];
    let parsedHistory = [];
    if (Array.isArray(quo.items)) {
      parsedItems = quo.items;
    } else if (typeof quo.ItemsJSON === 'string' && quo.ItemsJSON.trim() !== '') {
      try { parsedItems = JSON.parse(quo.ItemsJSON); } catch (e) { parsedItems = []; }
    }
    if (Array.isArray(quo.history)) {
      parsedHistory = quo.history;
    } else if (typeof quo.HistoryJSON === 'string' && quo.HistoryJSON.trim() !== '') {
      try { parsedHistory = JSON.parse(quo.HistoryJSON); } catch (e) { parsedHistory = []; }
    }

    return {
      id: String(quo.id || quo.ProposalID || quo.proposalId || ''),
      vendor: String(quo.vendor || quo.Vendor || ''),
      vendorLogo: String(quo.vendorLogo || quo.VendorLogo || 'request_quote'),
      title: String(quo.title || quo.Title || ''),
      issueDate: String(quo.issueDate || quo.IssueDate || ''),
      validUntil: String(quo.validUntil || quo.ValidUntil || ''),
      originalPrice: Number(quo.originalPrice || quo.OriginalPrice || 0),
      counterPrice: quo.counterPrice || quo.CounterPrice ? Number(quo.counterPrice || quo.CounterPrice) : null,
      status: String(quo.status || quo.Status || 'PENDING').toUpperCase(),
      notes: String(quo.notes || quo.Notes || ''),
      items: parsedItems,
      history: parsedHistory
    };
  }

  function normalizeTransaction(trx) {
    if (!trx) return null;
    return {
      trxId: String(trx.trxId || trx.TrxID || trx.trxID || ''),
      invoiceId: String(trx.invoiceId || trx.InvoiceID || ''),
      vendor: String(trx.vendor || trx.Vendor || ''),
      amount: Number(trx.amount || trx.Amount || 0),
      date: String(trx.date || trx.Date || ''),
      method: String(trx.method || trx.Method || ''),
      status: String(trx.status || trx.Status || 'SUCCESS').toUpperCase(),
      refCode: String(trx.refCode || trx.RefCode || ''),
      driveReceiptUrl: String(trx.driveReceiptUrl || trx.DriveReceiptUrl || '')
    };
  }

  async function initMobileStore() {
    let synced = false;
    if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
      try {
        const remoteInvoices = await window.GoogleBackend.fetchInvoices();
        if (remoteInvoices && remoteInvoices.length > 0) {
          store.invoices = remoteInvoices.map(normalizeInvoice).filter(Boolean);
          synced = true;
        }

        const remoteProposals = await window.GoogleBackend.fetchProposals();
        if (remoteProposals && remoteProposals.length > 0) {
          store.proposals = remoteProposals.map(normalizeProposal).filter(Boolean);
        }

        const remoteTrx = await window.GoogleBackend.fetchTransactions();
        if (remoteTrx && remoteTrx.length > 0) {
          store.transactions = remoteTrx.map(normalizeTransaction).filter(Boolean);
        }
      } catch (e) {
        console.warn("Mobile API error:", e);
      }
    }

    if (!synced) {
      const savedInv = localStorage.getItem('laksanasoft_invoices');
      if (savedInv) store.invoices = JSON.parse(savedInv).map(normalizeInvoice).filter(Boolean);
    }
  }

  function saveStore() {
    localStorage.setItem('laksanasoft_invoices', JSON.stringify(store.invoices));
    localStorage.setItem('laksanasoft_proposals', JSON.stringify(store.proposals));
    localStorage.setItem('laksanasoft_transactions', JSON.stringify(store.transactions));
  }

  function formatIDR(val) {
    const num = Number(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  }

  function showMobileToast(msg, type = 'info') {
    const toast = document.getElementById('mobile-toast');
    if (!toast) return;
    document.getElementById('mobile-toast-msg').textContent = msg;
    toast.className = `fixed top-4 left-4 right-4 z-50 p-3.5 rounded-2xl shadow-xl text-xs font-bold text-white flex items-center gap-2.5 transition-all duration-300 transform translate-y-0 opacity-100 ${type === 'success' ? 'bg-emerald-700' : type === 'error' ? 'bg-rose-700' : 'bg-slate-900'}`;

    setTimeout(() => {
      toast.classList.add('-translate-y-12', 'opacity-0');
    }, 3500);
  }

  // --- PULL TO REFRESH TOUCH GESTURE ---
  function initPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    const threshold = 65;
    const indicator = document.getElementById('mobile-pull-indicator');
    const label = document.getElementById('pull-refresh-label');
    const icon = document.getElementById('pull-refresh-icon');

    if (!indicator) return;

    window.addEventListener('touchstart', function (e) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!isPulling || window.scrollY > 0) return;
      currentY = e.touches[0].clientY;
      const pullDist = Math.max(0, (currentY - startY) * 0.45);

      if (pullDist > 10) {
        indicator.style.height = `${Math.min(pullDist, 75)}px`;
        indicator.classList.add('pulling');

        if (pullDist >= threshold) {
          if (label) label.textContent = 'Lepaskan untuk memperbarui data...';
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          if (label) label.textContent = 'Tarik ke bawah untuk memperbarui data...';
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', async function () {
      if (!isPulling) return;
      isPulling = false;

      const pullDist = (currentY - startY) * 0.45;
      if (pullDist >= threshold && window.scrollY === 0) {
        indicator.style.height = '50px';
        indicator.classList.add('refreshing');
        if (label) label.textContent = 'Memuat data terbaru dari server...';

        await initMobileStore();
        renderCurrentTabContent();
        showMobileToast('Data berhasil diperbarui dari Google Sheets!', 'success');

        setTimeout(() => {
          indicator.style.height = '0';
          indicator.classList.remove('pulling', 'refreshing');
        }, 500);
      } else {
        indicator.style.height = '0';
        indicator.classList.remove('pulling');
      }

      startY = 0;
      currentY = 0;
    });
  }

  // --- ROUTER WITH DEVICE BACK BUTTON SUPPORT ---
  function switchMobileTab(tabName, pushToHistory = true) {
    if (store.currentTab === tabName && pushToHistory) return;

    store.currentTab = tabName;

    document.querySelectorAll('.mobile-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.mobile-nav-item').forEach(btn => btn.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.remove('hidden');

    const activeBtn = document.getElementById(`nav-btn-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');

    const backBtn = document.getElementById('header-back-btn');
    if (backBtn) {
      if (tabName !== 'home') backBtn.classList.remove('hidden');
      else backBtn.classList.add('hidden');
    }

    renderCurrentTabContent();

    if (pushToHistory) {
      navigationStack.push(tabName);
      history.pushState({ type: 'tab', tab: tabName }, '');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCurrentTabContent() {
    if (store.currentTab === 'home') renderMobileHome();
    else if (store.currentTab === 'proposals') renderMobileProposals();
    else if (store.currentTab === 'history') renderMobileHistory();
    else if (store.currentTab === 'profile') renderMobileProfile();
  }

  function goBackToPreviousTab() {
    const openSheetEl = document.querySelector('.mobile-bottom-sheet.open');
    if (openSheetEl) {
      openSheetEl.classList.remove('open');
      return;
    }

    if (navigationStack.length > 1) {
      navigationStack.pop();
      const prevTab = navigationStack[navigationStack.length - 1];
      switchMobileTab(prevTab, false);
    } else {
      switchMobileTab('home', false);
    }
  }

  window.addEventListener('popstate', function () {
    const openSheetEl = document.querySelector('.mobile-bottom-sheet.open');
    if (openSheetEl) {
      openSheetEl.classList.remove('open');
      return;
    }

    if (navigationStack.length > 1) {
      navigationStack.pop();
      const prevTab = navigationStack[navigationStack.length - 1];
      switchMobileTab(prevTab, false);
    }
  });

  // 1. Mobile Home View
  function renderMobileHome() {
    let unpaidTotal = 0;
    let unpaidCount = 0;

    store.invoices.forEach(inv => {
      if (inv.status === 'UNPAID' || inv.status === 'OVERDUE') {
        unpaidTotal += inv.amount;
        unpaidCount++;
      }
    });

    const totalEl = document.getElementById('mobile-unpaid-total');
    const countEl = document.getElementById('mobile-unpaid-count');
    if (totalEl) totalEl.textContent = formatIDR(unpaidTotal);
    if (countEl) countEl.textContent = `${unpaidCount} Tagihan Belum Dibayar`;

    const container = document.getElementById('mobile-invoice-list');
    if (!container) return;

    if (store.invoices.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <span class="material-symbols-outlined text-3xl mb-1 text-slate-300">task_alt</span>
          <p class="font-semibold text-xs">Belum ada tagihan.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = store.invoices.map(inv => `
      <div class="mobile-card space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <span class="material-symbols-outlined text-lg">${inv.vendorLogo || 'domain'}</span>
            </div>
            <div>
              <p class="font-bold text-xs text-slate-900">${inv.vendor}</p>
              <span class="text-[10px] text-slate-400 font-mono">${inv.id}</span>
            </div>
          </div>
          <div>
            ${inv.status === 'PAID' ? `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">LUNAS</span>
            ` : `
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">BELUM BAYAR</span>
            `}
          </div>
        </div>

        <div class="flex items-center justify-between text-xs">
          <span class="text-slate-500">Jatuh Tempo: <strong>${inv.dueDate}</strong></span>
          <span class="font-extrabold text-sm text-slate-900">${formatIDR(inv.amount)}</span>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
          ${inv.status !== 'PAID' ? `
            <button onclick="mobileApp.startPay('${inv.id}')" class="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition-transform">
              <span class="material-symbols-outlined text-base">payments</span> Bayar Sekarang
            </button>
          ` : `
            <button onclick="mobileApp.viewTrxByInv('${inv.id}')" class="w-full py-2.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
              <span class="material-symbols-outlined text-base">receipt_long</span> Lihat Resi Pembayaran
            </button>
          `}
        </div>
      </div>
    `).join('');
  }

  // 2. Mobile Proposals View
  function renderMobileProposals() {
    const container = document.getElementById('mobile-proposals-list');
    if (!container) return;

    if (store.proposals.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">Tidak ada penawaran.</div>`;
      return;
    }

    container.innerHTML = store.proposals.map(quo => `
      <div class="mobile-card space-y-3">
        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <span class="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">${quo.id} • ${quo.vendor}</span>
            <h4 class="font-extrabold text-xs text-slate-900 mt-0.5">${quo.title}</h4>
          </div>
        </div>

        <div class="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
          <div class="flex justify-between text-slate-500">
            <span>Penawaran Awal:</span>
            <strong class="text-slate-900">${formatIDR(quo.originalPrice)}</strong>
          </div>
          ${quo.counterPrice ? `
            <div class="flex justify-between text-emerald-700 font-bold">
              <span>Negosiasi Balik:</span>
              <span>${formatIDR(quo.counterPrice)}</span>
            </div>
          ` : ''}
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          ${quo.status === 'PENDING' || quo.status === 'NEGOTIATING' ? `
            <button onclick="mobileApp.openNegoModal('${quo.id}')" class="flex-1 py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl">Negosiasi</button>
            <button onclick="mobileApp.approveQuo('${quo.id}')" class="flex-1 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm">Setujui</button>
          ` : `
            <span class="text-xs font-bold text-emerald-700">Status: ${quo.status}</span>
          `}
        </div>
      </div>
    `).join('');
  }

  // 3. Mobile History View
  function renderMobileHistory() {
    const container = document.getElementById('mobile-history-list');
    if (!container) return;

    if (store.transactions.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-400">Belum ada riwayat transaksi.</div>`;
      return;
    }

    container.innerHTML = store.transactions.map(trx => `
      <div onclick="mobileApp.openTrxModal('${trx.trxId}')" class="mobile-card flex items-center justify-between cursor-pointer active:bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <span class="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div>
            <h4 class="font-extrabold text-xs text-slate-900">${trx.vendor}</h4>
            <span class="text-[10px] text-slate-400 block">${trx.date}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="font-extrabold text-xs text-slate-900 block">${formatIDR(trx.amount)}</span>
          <span class="text-[10px] font-bold text-emerald-600">Berhasil</span>
        </div>
      </div>
    `).join('');
  }

  // 4. Mobile Profile View
  function renderMobileProfile() {
    document.getElementById('mobile-prof-name').textContent = store.user.name;
    document.getElementById('mobile-prof-corp').textContent = store.user.company;
  }

  // Mobile Payment Flow
  function startPay(invId) {
    store.selectedInvoice = store.invoices.find(i => i.id === invId);
    if (!store.selectedInvoice) return;

    document.getElementById('mobile-pay-inv-id').textContent = store.selectedInvoice.id;
    document.getElementById('mobile-pay-vendor').textContent = store.selectedInvoice.vendor;
    document.getElementById('mobile-pay-amount').textContent = formatIDR(store.selectedInvoice.amount);

    openSheet('sheet-payment-confirm');
  }

  function proceedToPin() {
    closeSheet('sheet-payment-confirm', true);
    store.enteredPin = '';
    updatePinDots();
    openSheet('sheet-pin');
  }

  function pinInput(num) {
    if (store.enteredPin.length < 6) {
      store.enteredPin += num;
      updatePinDots();
    }
    if (store.enteredPin.length === 6) {
      setTimeout(verifyPin, 150);
    }
  }

  function pinBackspace() {
    if (store.enteredPin.length > 0) {
      store.enteredPin = store.enteredPin.slice(0, -1);
      updatePinDots();
    }
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('.mobile-pin-dot');
    dots.forEach((dot, index) => {
      if (index < store.enteredPin.length) {
        dot.classList.add('bg-slate-900');
        dot.classList.remove('bg-slate-200');
      } else {
        dot.classList.remove('bg-slate-900');
        dot.classList.add('bg-slate-200');
      }
    });
  }

  async function verifyPin() {
    if (store.enteredPin === store.user.pin || store.enteredPin === '123456') {
      closeSheet('sheet-pin', true);
      const inv = store.selectedInvoice;

      inv.status = 'PAID';
      const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
      const refCode = `LKS-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const trxId = `TRX-${Math.floor(100000000 + Math.random() * 900000000)}`;

      let driveUrl = '';
      if (window.GoogleBackend && window.GoogleBackend.isConfigured()) {
        showMobileToast('Menyimpan ke Google Drive & Sheets...', 'info');
        const res = await window.GoogleBackend.processPayment({
          invoiceId: inv.id,
          vendor: inv.vendor,
          amount: inv.amount,
          method: 'Virtual Account BCA'
        });
        if (res && res.driveReceiptUrl) driveUrl = res.driveReceiptUrl;
      }

      const trx = {
        trxId: trxId,
        invoiceId: inv.id,
        vendor: inv.vendor,
        amount: inv.amount,
        date: dateStr,
        method: 'Virtual Account BCA',
        status: 'SUCCESS',
        refCode: refCode,
        driveReceiptUrl: driveUrl
      };

      store.transactions.unshift(trx);
      saveStore();
      showMobileToast('Pembayaran Sukses!', 'success');
      renderMobileHome();
    } else {
      showMobileToast('PIN Salah! (PIN Demo: 123456)', 'error');
      store.enteredPin = '';
      updatePinDots();
    }
  }

  function openSheet(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('open');
      history.pushState({ type: 'sheet', sheetId: id }, '');
    }
  }

  function closeSheet(id, skipHistoryBack = false) {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open')) {
      el.classList.remove('open');
      if (!skipHistoryBack && history.state && history.state.type === 'sheet') {
        history.back();
      }
    }
  }

  document.addEventListener('keydown', function(e) {
    const sheet = document.getElementById('sheet-pin');
    if (!sheet || !sheet.classList.contains('open')) return;

    if (e.key >= '0' && e.key <= '9') pinInput(e.key);
    else if (e.key === 'Backspace') pinBackspace();
    else if (e.key === 'Escape') closeSheet('sheet-pin');
  });

  // Public API
  window.mobileApp = {
    init: async function () {
      await initMobileStore();
      initPullToRefresh();
      switchMobileTab('home', false);
    },
    switchTab: switchMobileTab,
    goBack: goBackToPreviousTab,
    refreshData: async function () {
      showMobileToast('Memuat data terbaru...', 'info');
      await initMobileStore();
      renderCurrentTabContent();
      showMobileToast('Data berhasil diperbarui!', 'success');
    },
    startPay: startPay,
    proceedToPin: proceedToPin,
    pinInput: pinInput,
    pinBackspace: pinBackspace,
    closeSheet: closeSheet,
    openTrxModal: function (trxId) {
      const trx = store.transactions.find(t => t.trxId === trxId);
      if (!trx) return;
      document.getElementById('mobile-trx-id').textContent = trx.trxId;
      document.getElementById('mobile-trx-ref').textContent = trx.refCode;
      document.getElementById('mobile-trx-vendor').textContent = trx.vendor;
      document.getElementById('mobile-trx-amount').textContent = formatIDR(trx.amount);

      const driveBox = document.getElementById('mobile-trx-drive');
      if (driveBox) {
        if (trx.driveReceiptUrl) {
          driveBox.innerHTML = `<a href="${trx.driveReceiptUrl}" target="_blank" class="w-full py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 mt-2"><span class="material-symbols-outlined text-sm">cloud_download</span> Buka Resi di Google Drive</a>`;
        } else {
          driveBox.innerHTML = '';
        }
      }
      openSheet('sheet-trx-detail');
    },
    viewTrxByInv: function(invId) {
      const trx = store.transactions.find(t => t.invoiceId === invId);
      if (trx) this.openTrxModal(trx.trxId);
      else showMobileToast('Resi belum tersedia.', 'error');
    },
    approveQuo: async function(quoId) {
      const quo = store.proposals.find(p => p.id === quoId);
      if (!quo) return;
      quo.status = 'APPROVED';
      if (window.GoogleBackend) {
        await window.GoogleBackend.updateProposalStatus({ proposalId: quo.id, status: 'APPROVED' });
      }
      saveStore();
      showMobileToast(`Penawaran ${quo.id} disetujui!`, 'success');
      renderMobileProposals();
    },
    openNegoModal: function(quoId) {
      const quo = store.proposals.find(p => p.id === quoId);
      if (!quo) return;
      store.selectedProposal = quo;
      document.getElementById('mobile-nego-id').textContent = quo.id;
      document.getElementById('mobile-nego-input').value = quo.originalPrice;
      openSheet('sheet-nego');
    },
    confirmNego: async function() {
      const quo = store.selectedProposal;
      if (!quo) return;
      const counter = Number(document.getElementById('mobile-nego-input')?.value || quo.originalPrice);
      quo.status = 'NEGOTIATING';
      quo.counterPrice = counter;
      if (window.GoogleBackend) {
        await window.GoogleBackend.updateProposalStatus({ proposalId: quo.id, status: 'NEGOTIATING', counterPrice: counter });
      }
      saveStore();
      closeSheet('sheet-nego');
      showMobileToast(`Negosiasi ${formatIDR(counter)} dikirim!`, 'success');
      renderMobileProposals();
    },
    switchToDesktop: function() {
      window.location.href = '../index.html?desktop=true';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.mobileApp.init();
  });

})();
