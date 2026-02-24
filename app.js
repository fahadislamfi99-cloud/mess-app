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
    initGlobalDates(); // নতুন যোগ করা হলো
    loadAllData();
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

// UI তে সুন্দর করে তারিখ দেখানোর ফাংশন (নতুন)
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
}


function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('d-none'));
            document.getElementById(target).classList.remove('d-none');
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse.classList.contains('show')) new bootstrap.Collapse(navbarCollapse).hide();
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
function openEditMemberModal(btn, id, name, room) {
    activeEditBtn = btn; // ম্যাজিক: ক্লিক করা বাটনটি সেভ করে রাখলাম
    document.getElementById('edit-member-id').value = id;
    document.getElementById('edit-member-name').value = name;
    document.getElementById('edit-member-room').value = room;
    new bootstrap.Modal(document.getElementById('editMemberModal')).show();
}

// Edit Member

document.getElementById('form-edit-member').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-member-id').value;
    const name = document.getElementById('edit-member-name').value;
    const room = document.getElementById('edit-member-room').value;

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
            body: JSON.stringify({ name, room })
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
            body: JSON.stringify({ name: e.target[0].value, room: e.target[1].value })
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
// --- ADD BAZAR (Without Note & With Animation) ---
// ==========================================
document.getElementById('form-add-bazar').addEventListener('submit', async (e) => {
    e.preventDefault();

    // ম্যাজিক ফিক্স: Note ছাড়াই শুধু Date, Item এবং Amount নেওয়া হচ্ছে
    const dateVal = e.target.querySelector('input[type="date"]').value;
    const itemVal = document.getElementById('bazar-item-name').value; // Tom Select এর ID
    const amountVal = Number(e.target.querySelector('input[type="number"]').value);

    // বাটন সিলেক্ট করা এবং লোডিং অ্যানিমেশন দেওয়া
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Saving...';
    submitBtn.disabled = true;

    try {
        // note ছাড়াই ডেটা ডাটাবেসে পাঠানো হচ্ছে
        const res = await fetch(`${API_BASE_URL}/bazar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: dateVal, item: itemVal, amount: amountVal })
        });

        if (res.ok) {
            e.target.reset();

            // Tom Select এর বক্সটি আগের অবস্থায় (ফাঁকা) ফিরিয়ে আনার ম্যাজিক
            const tomSelectEl = document.getElementById('bazar-item-name');
            if (tomSelectEl && tomSelectEl.tomselect) {
                tomSelectEl.tomselect.clear();
            }

            setDefaultDates();
            await loadAllData();

            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Bazar Saved!' });
        } else {
            Swal.fire('Error!', 'বাজার সেভ করতে সমস্যা হয়েছে।', 'error');
        }
    } catch (error) {
        console.error("Error saving bazar:", error);
        Swal.fire('Error!', 'ইন্টারনেট কানেকশন বা সার্ভারে সমস্যা আছে!', 'error');
    } finally {
        // কাজ শেষ হলে বাটন আগের অবস্থায় ফিরিয়ে আনা
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
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








