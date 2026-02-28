// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Error: ', err));
    });
}






document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setDefaultDates();
    initGlobalDates();
    loadAllData();

    // --- Tom Select for Smart Bazar Search ---
    const tempItemSelect = document.getElementById('temp-item-name');
    if (tempItemSelect) {
        new TomSelect(tempItemSelect, {
            create: true, 
            sortField: [], // ম্যাজিক: এটি ফাঁকা রাখলে HTML এর অরিজিনাল সিরিয়াল ঠিক থাকবে!
            placeholder: "-- বাজার সিলেক্ট করুন বা টাইপ করুন --"
        });
    }
});


// গ্লোবাল ডেট ইনিশিয়ালাইজ করার ফাংশন
function initGlobalDates() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const offset = now.getTimezoneOffset() * 60000;
    globalStartDate = new Date(firstDay.getTime() - offset).toISOString().split('T')[0];
    globalEndDate = new Date(lastDay.getTime() - offset).toISOString().split('T')[0];

    const startInput = document.getElementById('global-start-date');
    const endInput = document.getElementById('global-end-date');

    if (startInput) startInput.value = globalStartDate;
    if (endInput) endInput.value = globalEndDate;

    updateDateRangeDisplay(); // UI আপডেট করবে
}

// ফিল্টার অ্যাপ্লাই করার ফাংশন
function applyGlobalFilter() {
    globalStartDate = document.getElementById('global-start-date').value;
    globalEndDate = document.getElementById('global-end-date').value;

    if (!globalStartDate || !globalEndDate) {
        alert("দয়া করে From এবং To তারিখ ঠিকমতো সিলেক্ট করুন।");
        return;
    }

    updateDateRangeDisplay(); // UI আপডেট করবে
    loadAllData(); // ডেটা রিলোড করবে
}

// UI তে সুন্দর করে তারিখ এবং সিস্টেম দেখানোর ফাংশন
function updateDateRangeDisplay() {
    const displaySpan = document.getElementById('display-date-range');
    if (displaySpan && globalStartDate && globalEndDate) {
        const startObj = new Date(globalStartDate);
        const endObj = new Date(globalEndDate);

        // তারিখগুলোকে "Feb 01" এবং "Feb 28, 2026" ফরম্যাটে সাজানো
        const startStr = startObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        const endStr = endObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

        displaySpan.innerText = `(${startStr} - ${endStr})`;
    }

    // ম্যাজিক: ক্যালকুলেশন মোড (Average/Fixed) ব্যাজে আপডেট করা
    const modeTextEl = document.getElementById('calc-mode-text');
    const calcModeBadge = document.getElementById('display-calc-mode');
    
    if (modeTextEl && calcModeBadge) {
        const currentMode = localStorage.getItem('calcMode') || 'average';
        if (currentMode === 'fixed') {
            modeTextEl.innerText = 'Fixed Rate';
            calcModeBadge.className = 'badge bg-warning bg-opacity-10 text-dark border border-warning border-opacity-50';
        } else {
            modeTextEl.innerText = 'Average';
            calcModeBadge.className = 'badge bg-success bg-opacity-10 text-success border border-success border-opacity-25';
        }
    }
}

// ফিল্টার অ্যাপ্লাই করে ডাটাবেসে সেভ করা এবং ড্যাশবোর্ডে ফিরে যাওয়ার ফাংশন
window.applyGlobalFilterAndGoHome = async function() {
    globalStartDate = document.getElementById('global-start-date').value;
    globalEndDate = document.getElementById('global-end-date').value;

    if (!globalStartDate || !globalEndDate) {
        alert("দয়া করে From এবং To তারিখ ঠিকমতো সিলেক্ট করুন।");
        return;
    }

    // বাটনে লোডিং অ্যানিমেশন দেখানো
    const btn = document.querySelector('button[onclick="applyGlobalFilterAndGoHome()"]');
    const origText = btn.innerHTML;
    if(btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
        btn.disabled = true;
    }

    try {
        // ম্যাজিক: সিলেক্ট করা তারিখ ডাটাবেসের গ্লোবাল সেটিংসে সেভ করে দেওয়া হচ্ছে!
        await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                periodStart: globalStartDate,
                periodEnd: globalEndDate
            })
        });

        updateDateRangeDisplay(); 
        await loadAllData(); 
        
        // সাকসেস মেসেজ দেখানো এবং ড্যাশবোর্ডে চলে যাওয়া
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Global Period Saved!' });

        const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
        if(dashboardBtn) dashboardBtn.click();

    } catch (error) {
        console.error("Error saving global dates:", error);
        Swal.fire('Error!', 'তারিখ সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
        if(btn) {
            btn.innerHTML = origText;
            btn.disabled = false;
        }
    }
}


// --- NAVIGATION LOGIC (With Smart Tab Memory) ---
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    // ১. পেজ লোড হলে আগের সেভ করা ট্যাব বের করা (না পেলে ডিফল্ট 'dashboard' দেখাবে)
    const savedTarget = localStorage.getItem('activeTab') || 'dashboard';

    navButtons.forEach(btn => {
        
        // ২. সেভ করা ট্যাব অনুযায়ী পেজ লোড করার সময় সঠিক সেকশনটি ওপেন রাখা
        if(btn.getAttribute('data-target') === savedTarget) {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
            const targetEl = document.getElementById(savedTarget);
            if(targetEl) targetEl.classList.remove('d-none');
        }

        // ৩. ক্লিক করার সাথে সাথে নতুন ট্যাবটি সেভ করে ফেলা
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            
            // ম্যাজিক: ব্রাউজারে ক্লিক করা ট্যাবের নাম সেভ করে রাখা হচ্ছে
            localStorage.setItem('activeTab', target);

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
            document.getElementById(target).classList.remove('d-none');
            
            // মোবাইলের মেনুবার ক্লিক করার পর অটোমেটিক বন্ধ করে দেওয়া
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                new bootstrap.Collapse(navbarCollapse).hide();
            }
        });
    });
}

function setDefaultDates() {
    // বাংলাদেশ সময় অনুযায়ী আজকের একদম সঠিক তারিখ (Local Timezone) বের করা
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset).toISOString().split('T')[0];

    const mealDateInput = document.getElementById('meal-date');
    const bazarDateInput = document.querySelector('#form-add-bazar input[type="date"]');

    if (mealDateInput) mealDateInput.value = localDate;
    if (bazarDateInput) bazarDateInput.value = localDate;
}







// --- SUBMIT ACTIONS (POST/PUT/DELETE) ---

// 1. Edit Member Modal
function openEditMemberModal(btn, id, name, room, phone) {
    activeEditBtn = btn;
    document.getElementById('edit-member-id').value = id;
    document.getElementById('edit-member-name').value = name;
    document.getElementById('edit-member-room').value = room;
    document.getElementById('edit-member-phone').value = (phone && phone !== 'undefined') ? phone : ''; // নতুন লাইন
    new bootstrap.Modal(document.getElementById('editMemberModal')).show();
}

// Edit Member

document.getElementById('form-edit-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-member-id').value;
    const name = document.getElementById('edit-member-name').value;
    const room = document.getElementById('edit-member-room').value;
    const phone = document.getElementById('edit-member-phone').value; // নতুন লাইন

    // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
    bootstrap.Modal.getInstance(document.getElementById('editMemberModal')).hide();

    // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
    if (activeEditBtn) {
        activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
        activeEditBtn.disabled = true;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/members/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, room, phone })
        });

        if (res.ok) {
            await loadAllData(); // ডেটা রিলোড হলে টেবিল নতুন করে তৈরি হবে এবং স্পিনার নিজে থেকেই গায়েব হয়ে যাবে
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Member Updated!' });
        } else {
            Swal.fire('Error!', 'আপডেট করতে সমস্যা হয়েছে।', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    } catch (error) {
        Swal.fire('Error!', 'নেটওয়ার্ক সমস্যা!', 'error');
        if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
    }
});




document.getElementById('form-add-meal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('meal-date').value;
    const mealType = e.target.querySelector('select').value;
    const members = Array.from(document.querySelectorAll('.meal-checkbox:checked')).map(cb => cb.value);

    // মেম্বার সিলেক্ট না করলে প্রফেশনাল ওয়ার্নিং
    if (members.length === 0) {
        Swal.fire('Oops!', 'আপনাকে অন্তত একজন মেম্বার সিলেক্ট করতে হবে।', 'warning');
        return;
    }

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/meals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, mealType, members })
        });

        if (res.ok) {
            e.target.reset();
            setDefaultDates();
            await loadAllData();
            // এখান থেকে বিরক্তিকর alert('Meal entry saved!'); লাইনটি সরিয়ে দেওয়া হয়েছে

            // ছোট্ট একটি নোটিফিকেশন (Toast) দেখাতে চাইলে নিচের লাইনটি রাখতে পারেন, নাহলে কেটে দিতে পারেন। 
            // এটি স্ক্রিনের কোণায় আসবে, ইউজারকে ডিস্টার্ব করবে না।
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Meal Saved!' });
        } else {
            Swal.fire('Error!', 'মিল সেভ করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error saving meal:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // ডেটা সেভ হওয়ার পর বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});


// ==========================================
// --- ADD MEMBER & ADD BAZAR (WITH ANIMATION) ---
// ==========================================

// Add Member
document.getElementById('form-add-member').addEventListener('submit', async (e) => {
    e.preventDefault();

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: e.target[0].value, 
                room: e.target[1].value, 
                phone: document.getElementById('add-member-phone').value // নতুন লাইন
            })
        });

        if (res.ok) {
            e.target.reset();
            await loadAllData();

            // সাকসেস টোস্ট অ্যানিমেশন (কোনো পপআপ ছাড়া)
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Member Added!' });
        } else {
            Swal.fire('Error!', 'মেম্বার অ্যাড করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error adding member:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Add Bazar
// ==========================================
// --- SMART BULK BAZAR LOGIC ---
// ==========================================

let pendingBazarItems = []; 
let currentShopperId = ''; // ম্যাজিক: এখন আমরা নাম নয়, মেম্বারের ID সেভ রাখবো
let currentShopperName = '';
let currentBazarDate = '';

// Step 1: Start Button Click
document.getElementById('btn-start-bazar')?.addEventListener('click', () => {
    const dateInput = document.getElementById('bazar-bulk-date').value;
    const memberSelect = document.getElementById('bazar-bulk-member');
    
    if(!dateInput || !memberSelect.value) {
        Swal.fire('Oops!', 'দয়া করে তারিখ এবং বাজারকারীর নাম সিলেক্ট করুন!', 'warning');
        return;
    }

    currentBazarDate = dateInput;
    currentShopperId = memberSelect.value; // ড্রপডাউন থেকে সরাসরি Object ID নেওয়া হলো
    currentShopperName = memberSelect.options[memberSelect.selectedIndex].text.split(' (')[0]; 

    document.getElementById('display-shopper-name').innerText = currentShopperName;
    
    document.getElementById('bazar-step-1').classList.add('d-none');
    document.getElementById('bazar-step-2').classList.remove('d-none');
});

// Step 2: Add Item to Temporary List
document.getElementById('form-add-temp-item')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const itemName = document.getElementById('temp-item-name').value;
    const amount = Number(document.getElementById('temp-item-amount').value);

    const isDuplicate = pendingBazarItems.some(entry => entry.item === itemName);
    if (isDuplicate) {
        Swal.fire('Oops!', `"${itemName}" লিস্টে আগে থেকেই অ্যাড করা আছে!`, 'warning');
        return; 
    }

    pendingBazarItems.push({ item: itemName, amount: amount });
    e.target.reset();
    
    const tomSelectEl = document.getElementById('temp-item-name');
    if (tomSelectEl && tomSelectEl.tomselect) tomSelectEl.tomselect.clear();

    renderPendingBazarTable();
});

// (টেবিল রেন্ডার, রিমুভ, ক্যানসেল করার ফাংশনগুলো আগের মতোই থাকবে)
// টেবিল রেন্ডার করা
function renderPendingBazarTable() {
    const tbody = document.getElementById('temp-bazar-list');
    const tfoot = document.getElementById('temp-bazar-footer');
    const saveBtn = document.getElementById('btn-save-bulk-bazar');
    
    tbody.innerHTML = '';
    let total = 0;

    if(pendingBazarItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-muted small py-3">No items added yet.</td></tr>`;
        tfoot.classList.add('d-none');
        saveBtn.disabled = true;
        return;
    }

    pendingBazarItems.forEach((entry, index) => {
        total += entry.amount;
        tbody.innerHTML += `
            <tr>
                <td class="text-start ps-3 fw-bold text-dark">${entry.item}</td>
                <td class="fw-bold">৳${entry.amount}</td>
                <td>
                    <button onclick="removeTempItem(${index})" class="btn btn-sm btn-outline-danger py-0 px-2" title="Remove"><i class="bi bi-x-lg"></i></button>
                </td>
            </tr>
        `;
    });

    document.getElementById('temp-bazar-total').innerText = total;
    tfoot.classList.remove('d-none');
    saveBtn.disabled = false;
}

window.removeTempItem = function(index) {
    pendingBazarItems.splice(index, 1);
    renderPendingBazarTable();
};

window.editBazarInfo = function() {
    document.getElementById('bazar-step-2').classList.add('d-none');
    document.getElementById('bazar-step-1').classList.remove('d-none');
};

window.resetBulkBazar = function() {
    pendingBazarItems = [];
    renderPendingBazarTable();
    document.getElementById('bazar-step-2').classList.add('d-none');
    document.getElementById('bazar-step-1').classList.remove('d-none');
};

// Step 3: Save All to Database (প্রফেশনাল ওয়ে)
document.getElementById('btn-save-bulk-bazar')?.addEventListener('click', async () => {
    if(pendingBazarItems.length === 0) return;

    const btn = document.getElementById('btn-save-bulk-bazar');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving to Server...';
    btn.disabled = true;

    try {
        for(const entry of pendingBazarItems) {
            await fetch(`${API_BASE_URL}/bazar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    date: currentBazarDate, 
                    item: entry.item, 
                    amount: entry.amount,
                    note: "", // ম্যাজিক: Note এখন একদম ফাঁকা থাকবে!
                    shopper: currentShopperId // সরাসরি মেম্বারের ID পাঠানো হচ্ছে
                })
            });
        }

        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        Toast.fire({ icon: 'success', title: 'Full Bazar List Saved!' });
        
        resetBulkBazar(); 
        await loadAllData(); 

    } catch (error) {
        console.error("Bulk Save Error:", error);
        Swal.fire('Error!', 'সার্ভারে সেভ করতে সমস্যা হয়েছে।', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Add Deposit Submit
document.getElementById('form-add-deposit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('deposit-date').value;
    const member = document.getElementById('deposit-member').value;
    const amount = Number(document.getElementById('deposit-amount').value);

    // সাবমিট বাটনটি সিলেক্ট করা এবং আগের লেখা সেভ করে রাখা
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // বাটনে লোডিং স্পিনার দেখানো এবং বাটন ডিজেবল করা (যাতে ডাবল ক্লিক না হয়)
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/deposits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, member, amount })
        });

        if (res.ok) {
            e.target.reset();
            setDefaultDates();
            await loadAllData();
            // এখান থেকে alert('Deposit saved!'); লাইনটি সরিয়ে দেওয়া হয়েছে
        } else {
            alert('❌ ডেপোজিট সেভ করতে সমস্যা হয়েছে!');
        }
    } catch (error) {
        console.error("Error saving deposit:", error);
        alert('ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!');
    } finally {
        // ডেটা সেভ হওয়ার পর বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});



// --- BAZAR EDIT & DELETE LOGIC ---

// 2. Edit Bazar Modal
function openEditBazarModal(btn, id, date, item, amount, note) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    document.getElementById('edit-bazar-id').value = id;
    document.getElementById('edit-bazar-date').value = date;
    document.getElementById('edit-bazar-item').value = item;
    document.getElementById('edit-bazar-amount').value = amount;
    document.getElementById('edit-bazar-note').value = (note !== 'undefined' && note !== 'null') ? note : '';
    new bootstrap.Modal(document.getElementById('editBazarModal')).show();
}

// Edit Bazar

const formEditBazar = document.getElementById('form-edit-bazar');
if (formEditBazar) {
    formEditBazar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bazar-id').value;
        const date = document.getElementById('edit-bazar-date').value;
        const item = document.getElementById('edit-bazar-item').value;
        const amount = Number(document.getElementById('edit-bazar-amount').value);
        const note = document.getElementById('edit-bazar-note').value;

        // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
        bootstrap.Modal.getInstance(document.getElementById('editBazarModal')).hide();

        // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
        if (activeEditBtn) {
            activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
            activeEditBtn.disabled = true;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/bazar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, item, amount, note })
            });

            if (res.ok) {
                await loadAllData();
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
                Toast.fire({ icon: 'success', title: 'Bazar Updated!' });
            } else {
                Swal.fire('Error!', 'Failed to update.', 'error');
                if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
            }
        } catch (error) {
            Swal.fire('Error!', 'Network issue!', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    });
}

// --- PDF DOWNLOAD LOGIC ---
function downloadReportPDF() {
    // এটি ব্রাউজারের নিজস্ব এবং পাওয়ারফুল প্রিন্ট/পিডিএফ ইঞ্জিন চালু করবে
    window.print();
}

// --- DOWNLOAD TODAY'S MEALS AS PHOTO LOGIC (FIXED FOR MOBILE) ---
function downloadTodaysMealsPhoto() {
    const container = document.getElementById('today-meals-container');

    if (!container || container.innerHTML.includes('No meals added')) {
        alert("No meals available to download!");
        return;
    }

    // ডাউনলোড শুরু হওয়ার সময় বাটনের টেক্সট পরিবর্তন করা
    const btn = document.querySelector('button[onclick="downloadTodaysMealsPhoto()"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    btn.disabled = true;

    // ডিলিট বাটন (ডাস্টবিন আইকন) হাইড করা
    const deleteButtons = container.querySelectorAll('.btn');
    deleteButtons.forEach(btn => btn.style.display = 'none');

    // --- নতুন ফিক্স: মোবাইলের জন্য ফুল সাইজ ওপেন করা ---
    const tableResponsive = container.querySelector('.table-responsive');
    let originalOverflow = '';
    if (tableResponsive) {
        originalOverflow = tableResponsive.style.overflow;
        tableResponsive.style.overflow = 'visible'; // স্ক্রলবার সরিয়ে পুরো টেবিল দৃশ্যমান করা
    }

    // html-to-image ব্যবহার করে পুরো কন্টেইনারটিকে ছবিতে রূপান্তর
    htmlToImage.toJpeg(container, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        // স্ক্রিনের সাইজের বদলে টেবিলের আসল (পুরো) লম্বাই-চওড়াই বলে দেওয়া
        width: container.scrollWidth,
        height: container.scrollHeight,
        style: {
            transform: 'none',
        }
    })
        .then(function (dataUrl) {
            // ছবির নাম তৈরি করা
            const niceDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
            const fileName = `Todays_Meals_${niceDate}.jpg`;

            // ছবি ডাউনলোড করা
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            link.click();

            // কাজ শেষে টেবিল এবং বাটন আবার আগের অবস্থায় ফিরিয়ে আনা
            deleteButtons.forEach(btn => btn.style.display = '');
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (tableResponsive) tableResponsive.style.overflow = originalOverflow;
        })
        .catch(function (error) {
            console.error('Error generating image!', error);
            alert("Failed to save photo. Please try again.");

            // এরর হলেও যেন অ্যাপ আটকে না যায়, তাই সবকিছু আগের অবস্থায় ফেরানো
            deleteButtons.forEach(btn => btn.style.display = '');
            btn.innerHTML = originalText;
            btn.disabled = false;
            if (tableResponsive) tableResponsive.style.overflow = originalOverflow;
        });
}


// --- MEAL EDIT LOGIC ---

// এডিট পপ-আপ ওপেন করা এবং আগের ডেটা বসানো
// 3. Edit Meal Modal
function openEditMealModal(btn, mealId) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    const meal = state.meals.find(m => m._id === mealId);
    if (!meal) return;

    document.getElementById('edit-meal-id').value = meal._id;
    document.getElementById('edit-meal-date').value = meal.date.split('T')[0];
    document.getElementById('edit-meal-type').value = meal.mealType;

    const memberListDiv = document.getElementById('edit-meal-member-list');
    memberListDiv.innerHTML = '';

    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));

    const mealMemberIds = meal.members.map(m => m._id || m);

    activeMembers.forEach(member => {
        const isChecked = mealMemberIds.includes(member._id) ? 'checked' : '';
        memberListDiv.innerHTML += `
            <div class="form-check mb-2 border-bottom pb-1">
                <input class="form-check-input edit-meal-member-checkbox border-secondary" type="checkbox" value="${member._id}" id="edit-member-${member._id}" ${isChecked}>
                <label class="form-check-label ms-2 fw-bold text-dark" for="edit-member-${member._id}">
                    ${member.name} <span class="text-muted small fw-normal">(Room: ${member.room})</span>
                </label>
            </div>
        `;
    });

    new bootstrap.Modal(document.getElementById('editMealModal')).show();
}

// আপডেট করা মিল সেভ করা

async function saveEditedMeal(event) {
    event.preventDefault();

    const id = document.getElementById('edit-meal-id').value;
    const date = document.getElementById('edit-meal-date').value;
    const mealType = document.getElementById('edit-meal-type').value;

    const checkboxes = document.querySelectorAll('.edit-meal-member-checkbox:checked');
    const members = Array.from(checkboxes).map(cb => cb.value);

    if (members.length === 0) {
        Swal.fire('Oops!', 'আপডেট করার জন্য অন্তত একজন মেম্বার সিলেক্ট করতে হবে!', 'warning');
        return;
    }

    // ১. সাথে সাথে বক্সটি বন্ধ করে দেওয়া
    bootstrap.Modal.getInstance(document.getElementById('editMealModal')).hide();

    // ২. ব্যাকগ্রাউন্ডের পেন আইকনে স্পিনার ঘুরানো
    if (activeEditBtn) {
        activeEditBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
        activeEditBtn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/meals/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, mealType, members, totalMeals: members.length })
        });

        if (response.ok) {
            await loadAllData();
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Meal Updated!' });
        } else {
            Swal.fire('Error!', 'আপডেট করতে সমস্যা হয়েছে।', 'error');
            if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
        }
    } catch (error) {
        console.error("Error updating meal:", error);
        Swal.fire('Error!', 'নেটওয়ার্ক সমস্যা! দয়া করে আবার চেষ্টা করুন।', 'error');
        if (activeEditBtn) { activeEditBtn.innerHTML = '<i class="bi bi-pencil"></i>'; activeEditBtn.disabled = false; }
    }
}



// --- COPY LOW BALANCE NAMES LOGIC ---
function copyLowBalanceNames() {
    const thresholdInput = document.getElementById('low-balance-threshold');
    const threshold = Number(thresholdInput.value) || 0;

    if (!state.report || !state.report.members || state.report.members.length === 0) {
        alert("কপি করার মতো কোনো ডেটা নেই!");
        return;
    }

    // এখানেও শর্তটি আপডেট করা হলো (balance !== 0)
    const lowBalanceMembers = state.report.members.filter(m =>
        m.balance <= threshold && m.balance !== 0 && !m.isManager
    );

    if (lowBalanceMembers.length === 0) {
        alert("লিস্টে কপি করার মতো কোনো মেম্বার নেই!");
        return;
    }

    lowBalanceMembers.sort((a, b) => a.balance - b.balance);

    let copyText = `⚠️ Low Balance Alert (Below ৳${threshold}):\n\n`;

    lowBalanceMembers.forEach((member, index) => {
        const balanceText = member.balance < 0 ? `(Due: ৳${Math.abs(member.balance).toFixed(2)})` : `(Balance: ৳${member.balance.toFixed(2)})`;
        copyText += `${index + 1}. ${member.name} - Room: ${member.room} ${balanceText}\n`;
    });

    copyText += `\nদয়া করে দ্রুত মেসে টাকা জমা দিন।`;

    navigator.clipboard.writeText(copyText).then(() => {
        const copyBtn = document.querySelector('button[onclick="copyLowBalanceNames()"]');
        const originalHTML = copyBtn.innerHTML;

        copyBtn.innerHTML = '<i class="bi bi-check2-all"></i> Copied!';
        copyBtn.classList.replace('btn-danger', 'btn-success');

        setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.replace('btn-success', 'btn-danger');
        }, 2000);

    }).catch(err => {
        console.error("Copy failed", err);
        alert("কপি করতে সমস্যা হয়েছে। আপনার ব্রাউজার হয়তো এটি সাপোর্ট করছে কানা।");
    });
}


// --- DOWNLOAD LOW BALANCE AS IMAGE LOGIC ---
function downloadLowBalanceImage() {
    if (typeof html2canvas === 'undefined') {
        alert("ইমেজ লাইব্রেরি লোড হচ্ছে... অনুগ্রহ করে ২-৩ সেকেন্ড পর আবার চেষ্টা করুন।");
        return;
    }

    const card = document.getElementById('low-balance-card');
    const actionBox = document.getElementById('low-balance-actions');

    if (!card) return;

    // ১. ছবি তোলার আগে বাটন ও ইনপুট বক্স হাইড করে দেওয়া
    if (actionBox) actionBox.style.display = 'none';

    // ২. কার্ডের HD স্ক্রিনশট নেওয়া (scale: 2)
    html2canvas(card, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true
    }).then(canvas => {
        // ৩. ছবি তোলা শেষ হলে বাটনগুলো আবার ফিরিয়ে আনা
        if (actionBox) actionBox.style.display = 'flex';

        // ৪. ছবি ডাউনলোড করানো
        const link = document.createElement('a');
        const today = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        link.download = `Low_Balance_Alert_${today}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        // কোনো এরর হলেও যেন বাটনগুলো গায়েব না থাকে
        if (actionBox) actionBox.style.display = 'flex';
        console.error("Image generation failed:", err);
        alert("ছবি ডাউনলোড করতে সমস্যা হয়েছে।");
    });
}


// ==========================================
// --- REFUND MONEY LOGIC (AUTO MINUS) ---
// ==========================================

// মেম্বার লিস্ট আপডেট করার ফাংশন
const originalRenderDepositSelect = typeof renderDepositSelect === 'function' ? renderDepositSelect : function () { };
renderDepositSelect = function () {
    originalRenderDepositSelect(); // আগের ফাংশনটি কল করা হলো
    const refundSelect = document.getElementById('refund-member');
    if (refundSelect && state.members) {
        let options = '<option value="" disabled selected>-- মেম্বার সিলেক্ট করুন --</option>';
        state.members.filter(m => m.isActive).forEach(m => {
            options += `<option value="${m._id}">${m.name} (${m.room})</option>`;
        });
        refundSelect.innerHTML = options;
    }
};

// রিফান্ড ফর্ম সাবমিট করার লজিক
document.addEventListener("DOMContentLoaded", () => {
    const refundForm = document.getElementById('form-refund-money');
    if (refundForm) {
        // আজকের তারিখ ডিফল্টভাবে বসানো
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(today.getTime() - offset)).toISOString().split('T')[0];
        const dateInput = document.getElementById('refund-date');
        if (dateInput) dateInput.value = localISOTime;

        refundForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('refund-date').value;
            const memberId = document.getElementById('refund-member').value;
            const amountVal = document.getElementById('refund-amount').value;

            // ম্যাজিক: পজিটিভ নাম্বারকে অটোমেটিক মাইনাস (-) করে দেওয়া
            const autoMinusAmount = -Math.abs(Number(amountVal));

            // সাবমিট বাটনে লোডিং দেখানো
            const submitBtn = refundForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Processing...';
            submitBtn.disabled = true;

            try {
                const res = await fetch('https://mess-backend-pg3z.onrender.com/api/deposits', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date, member: memberId, amount: autoMinusAmount }) // মাইনাস ডেটা পাঠানো হলো
                });

                if (res.ok) {
                    // এখান থেকে alert মেসেজটি পুরোপুরি সরিয়ে দেওয়া হয়েছে
                    refundForm.reset();
                    if (dateInput) dateInput.value = localISOTime;
                    await loadAllData(); // ডেটা রিলোড করে ব্যালেন্স আপডেট করা
                } else {
                    const err = await res.json();
                    alert(`❌ সমস্যা হয়েছে: ${err.message || 'Refund failed'}`);
                }
            } catch (error) {
                console.error(error);
                alert('ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!');
            } finally {
                // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরে আসবে
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});


// ==========================================
// --- PROFESSIONAL POPUPS (SWEETALERT2) ---
// ==========================================



// Delete Member
function deleteMember(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "This member will be deleted permanently!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete!',
        showLoaderOnConfirm: true, // বাটনে লোডিং অ্যানিমেশন চালু করবে
        preConfirm: async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/members/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Server Error');
                await loadAllData();
                return true;
            } catch (error) {
                Swal.showValidationMessage('সার্ভারে সমস্যা হয়েছে!');
            }
        },
        allowOutsideClick: () => !Swal.isLoading() // লোডিং চলাকালীন বাইরে ক্লিক করলে পপআপ কাটবে না
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Deleted!', text: 'Member has been deleted.', icon: 'success', timer: 1500, showConfirmButton: false });
        }
    });
}


// ==========================================
// --- EDIT OR ADD SHOPPER NAME FOR FULL DAY ---
// ==========================================
// ==========================================
// --- EDIT OR ADD SHOPPER NAME FOR FULL DAY ---
// ==========================================
window.editShopperForDate = async function(dateStr, currentShopperId) {
    const activeMembers = state.members
        .filter(m => m.isActive)
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true }));
    
    const inputOptions = {};
    activeMembers.forEach(m => {
        inputOptions[m._id] = `${m.name} (Room: ${m.room})`; // নাম নয়, ID সেভ হবে
    });

    const { value: selectedShopperId } = await Swal.fire({
        title: currentShopperId ? 'Edit Shopper' : 'Add Shopper',
        text: `বাজারের তারিখ: ${new Date(dateStr).toLocaleDateString('en-GB')}`,
        icon: 'question',
        input: 'select',
        inputOptions: inputOptions,
        inputValue: currentShopperId,
        inputPlaceholder: '-- মেম্বার সিলেক্ট করুন --',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="bi bi-check-circle"></i> Save Name',
        inputValidator: (value) => {
            if (!value) return 'দয়া করে একজন মেম্বার সিলেক্ট করুন!';
        }
    });

    if (selectedShopperId && selectedShopperId !== currentShopperId) {
        Swal.fire({ title: 'Saving...', html: 'পুরো দিনের ডেটা আপডেট হচ্ছে, দয়া করে অপেক্ষা করুন।', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        try {
            const daysItems = state.bazar.filter(b => b.date.startsWith(dateStr));
            
            for (const item of daysItems) {
                await fetch(`${API_BASE_URL}/bazar/${item._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        date: item.date, 
                        item: item.item, 
                        amount: item.amount, 
                        note: item.note, // আগের রিয়েল নোট থাকলে সেটা অক্ষত থাকবে
                        shopper: selectedShopperId // প্রফেশনাল মেম্বার ID বসবে
                    })
                });
            }
            
            await loadAllData();
            Swal.fire({ icon: 'success', title: 'Success!', text: 'বাজারকারীর নাম সফলভাবে আপডেট হয়েছে।', timer: 1500, showConfirmButton: false });
        } catch (error) {
            console.error("Shopper Update Error:", error);
            Swal.fire('Error!', 'সার্ভারে আপডেট করতে সমস্যা হয়েছে।', 'error');
        }
    }
};


// ==========================================
// --- SHOW SHOPPER DATES POPUP ---
// ==========================================
window.showShopperDates = function(name, datesJsonStr) {
    const datesArray = JSON.parse(decodeURIComponent(datesJsonStr));
    
    // তারিখগুলোকে সুন্দর করে লিস্ট আকারে সাজানো
    let listHTML = '<div class="list-group text-start mt-3 shadow-sm">';
    datesArray.forEach((dateStr, index) => {
        const dateObj = new Date(dateStr);
        const niceDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const dayName = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });
        
        listHTML += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <span class="fw-bold text-dark"><span class="text-primary me-2">${index + 1}.</span>${niceDate}</span>
                <span class="badge bg-light border text-secondary">${dayName}</span>
            </div>
        `;
    });
    listHTML += '</div>';

    // SweetAlert2 দিয়ে প্রফেশনাল পপআপ দেখানো
    Swal.fire({
        title: `<i class="bi bi-calendar-check text-primary"></i> ${name}`,
        html: `<div class="text-muted small mb-2">এই মাসে মোট <strong>${datesArray.length}</strong> দিন বাজার করেছেন:</div>` + listHTML,
        confirmButtonColor: '#0d6efd',
        confirmButtonText: 'Close',
        customClass: { popup: 'rounded-4' }
    });
};


// ==========================================
// --- MEAL SETTINGS LOGIC (DATABASE SYNC) ---
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Settings সেভ করা (সরাসরি ডাটাবেসে)
    const settingsForm = document.getElementById('form-meal-settings');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // বাটন লোডিং
            const btn = settingsForm.querySelector('button[type="submit"]');
            const origText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving...';
            btn.disabled = true;

            const newSettings = {
                calcMode: document.getElementById('setting-calc-mode').value,
                rateBreakfast: document.getElementById('rate-breakfast').value,
                rateLunch: document.getElementById('rate-lunch').value,
                rateDinner: document.getElementById('rate-dinner').value,
                rateSehri: document.getElementById('rate-sehri').value,
                rateIftar: document.getElementById('rate-iftar').value
            };

            try {
                // ডাটাবেসে সেভ করার রিকোয়েস্ট
                const res = await fetch(`${API_BASE_URL}/settings`, {
                    method: 'POST', // অথবা PUT (আপনার রাউট অনুযায়ী)
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newSettings)
                });

                if (res.ok) {
                    Swal.fire({ icon: 'success', title: 'Global Settings Saved!', text: 'হিসাবের নতুন নিয়ম সব ডিভাইসের জন্য কার্যকর হয়েছে।', timer: 2000, showConfirmButton: false });
                    await loadAllData(); 
                } else {
                    Swal.fire('Error!', 'সেটিংস সেভ করতে সমস্যা হয়েছে।', 'error');
                }
            } catch (error) {
                Swal.fire('Error!', 'সার্ভারে কানেক্ট করা যাচ্ছে না।', 'error');
            } finally {
                btn.innerHTML = origText;
                btn.disabled = false;
            }
        });
    }
});


// Change Period বাটনে ক্লিক করলে Settings আসা-যাওয়ার (Toggle) বুলেটপ্রুফ লজিক
window.toggleSettingsView = function() {
    const settingsSection = document.getElementById('settings');
    const dashboardSection = document.getElementById('dashboard');

    if (!settingsSection || !dashboardSection) {
        console.error("Settings or Dashboard section not found in HTML!");
        return;
    }

    // যদি Settings হাইড করা থাকে (অর্থাৎ বন্ধ থাকে)
    if (settingsSection.classList.contains('d-none')) {
        // স্ক্রিনের সব সেকশন হাইড করে দাও
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
        // শুধু Settings টা ওপেন করো
        settingsSection.classList.remove('d-none');
        
        // (ঐচ্ছিক) মেনুবারে Settings এর রঙ অ্যাক্টিভ করা
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const settingsBtn = document.querySelector('.nav-btn[data-target="settings"]');
        if (settingsBtn) settingsBtn.classList.add('active');
        
    } else {
        // যদি Settings আগে থেকেই ওপেন থাকে, তাহলে সব হাইড করে ড্যাশবোর্ডে ফিরে যাও
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
        dashboardSection.classList.remove('d-none');
        
        // (ঐচ্ছিক) মেনুবারে Dashboard এর রঙ অ্যাক্টিভ করা
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const dashboardBtn = document.querySelector('.nav-btn[data-target="dashboard"]');
        if (dashboardBtn) dashboardBtn.classList.add('active');
    }
};


// ==========================================
// --- WHATSAPP AUTO NOTIFICATION ---
// ==========================================
window.sendWhatsAppMsg = function(phone, name, balance) {
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '88' + formattedPhone;
    } else if (!formattedPhone.startsWith('88')) {
        formattedPhone = '880' + formattedPhone; 
    }
    
    let message = '';
    const exactAmount = Math.abs(balance).toFixed(2);

    // ম্যাজিক: ব্যালেন্স মাইনাস নাকি প্লাস, তার ওপর ভিত্তি করে আলাদা মেসেজ!
    if (balance < 0) {
        // বকেয়া (Due) থাকলে এই মেসেজ যাবে
        message = `আসসালামু আলাইকুম ${name},\nমেস অ্যাকাউন্টে আপনার ৳${exactAmount} টাকা বকেয়া (Due) হয়েছে। দয়া করে দ্রুত টাকা জমা দিন।\n- মেস ম্যানেজার`;
    } else {
        // ব্যালেন্স প্লাস কিন্তু কম (Low Balance) থাকলে এই মেসেজ যাবে
        message = `আসসালামু আলাইকুম ${name},\nমেস অ্যাকাউন্টে আপনার ব্যালেন্স খুবই কম (মাত্র ৳${exactAmount} বাকি আছে)। মিল চালু রাখতে দয়া করে দ্রুত টাকা জমা দিন।\n- মেস ম্যানেজার`;
    }
    
    // হোয়াটসঅ্যাপ ওপেন করা
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
}