import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getDatabase, ref, set, get, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
        
        import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const database = getDatabase(app);
        const provider = new GoogleAuthProvider();
        
        // Global variables
        window.currentUser = null;
        window.goals = Array(10).fill('');
        window.exposures = [];
        window.summaries = [];
        window.editingExposureId = null;
        
        // Auth state observer
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                window.currentUser = user;
                showMainApp(user);
                loadUserData(user.uid);
            } else {
                // User is signed out
                window.currentUser = null;
                showLoginScreen();
            }
            // Hide loading overlay
            document.getElementById('loadingOverlay').style.display = 'none';
        });
        
        // Sign in function
        window.signIn = async function() {
            try {
                const result = await signInWithPopup(auth, provider);
                // User will be handled by onAuthStateChanged
            } catch (error) {
                console.error('Sign in error:', error);
                alert('Failed to sign in. Please try again.');
            }
        }
        
        // Sign out function
        window.signOut = async function() {
            try {
                await firebaseSignOut(auth);
                // User will be handled by onAuthStateChanged
            } catch (error) {
                console.error('Sign out error:', error);
                alert('Failed to sign out. Please try again.');
            }
        }
        
        // Show main app
        function showMainApp(user) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            document.getElementById('userInfo').style.display = 'flex';
            document.getElementById('userName').textContent = user.displayName || user.email;
            document.getElementById('userPhoto').src = user.photoURL || 'https://via.placeholder.com/32';
            
            // Initialize app components
            const today = new Date();
            const dateStr = today.getFullYear() + '-' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(today.getDate()).padStart(2, '0');
            document.getElementById('exposureDate').value = dateStr;
            updateReferencePreview();
            setupSliders();
            updateMotivationalQuote();
            setInterval(checkWeeklyReminder, 60000);
        }
        
        // Show login screen
        function showLoginScreen() {
            document.getElementById('loginScreen').style.display = 'flex';
            document.getElementById('mainApp').style.display = 'none';
            document.getElementById('userInfo').style.display = 'none';
        }
        
        // Load user data
        function loadUserData(userId) {
            const userRef = ref(database, 'users/' + userId);
            const goalsRef = ref(database, 'users/' + userId + '/goals');
            const exposuresRef = ref(database, 'users/' + userId + '/exposures');
            const summariesRef = ref(database, 'users/' + userId + '/summaries');
            
            // Load goals
            onValue(goalsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    window.goals = data;
                }
                renderGoals();
            });
            
            // Load exposures
            onValue(exposuresRef, (snapshot) => {
                const data = snapshot.val();
                window.exposures = data ? Object.entries(data).map(([id, exp]) => ({ ...exp, id })) : [];
                window.exposures.sort((a, b) => {
                    // Create full datetime for comparison (newest first)
                    const dateTimeA = new Date(`${a.date}T${a.time || '00:00'}:00`);
                    const dateTimeB = new Date(`${b.date}T${b.time || '00:00'}:00`);
                    return dateTimeB - dateTimeA;
                });
                renderExposures();
                checkWeeklyReminder();
            });
            
            // Load summaries
            onValue(summariesRef, (snapshot) => {
                const data = snapshot.val();
                window.summaries = data ? Object.entries(data).map(([id, sum]) => ({ ...sum, id })) : [];
                window.summaries.sort((a, b) => new Date(b.weekOf) - new Date(a.weekOf));
                renderSummaries();
            });
        }
        
        // Save functions
        window.saveGoals = async function() {
            if (!window.currentUser) return;
            
            try {
                await set(ref(database, 'users/' + window.currentUser.uid + '/goals'), window.goals);
            } catch (error) {
                console.error('Error saving goals:', error);
                alert('Failed to save goals. Please check your connection.');
            }
        }
        
        window.saveExposure = async function(exposure) {
            if (!window.currentUser) return;
            
            try {
                const exposuresRef = ref(database, 'users/' + window.currentUser.uid + '/exposures');
                if (exposure.id && typeof exposure.id === 'string') {
                    await set(ref(database, 'users/' + window.currentUser.uid + '/exposures/' + exposure.id), exposure);
                } else {
                    const newRef = push(exposuresRef);
                    exposure.id = newRef.key;
                    await set(newRef, exposure);
                }
            } catch (error) {
                console.error('Error saving exposure:', error);
                alert('Failed to save exposure. Please check your connection.');
            }
        }
        
        window.deleteExposureFromDb = async function(id) {
            if (!window.currentUser) return;
            
            try {
                await remove(ref(database, 'users/' + window.currentUser.uid + '/exposures/' + id));
            } catch (error) {
                console.error('Error deleting exposure:', error);
                alert('Failed to delete exposure. Please check your connection.');
            }
        }
        
        window.saveSummary = async function(summary) {
            if (!window.currentUser) return;
            
            try {
                const summariesRef = ref(database, 'users/' + window.currentUser.uid + '/summaries');
                const newRef = push(summariesRef);
                summary.id = newRef.key;
                await set(newRef, summary);
            } catch (error) {
                console.error('Error saving summary:', error);
                alert('Failed to save summary. Please check your connection.');
            }
        }
        
        window.deleteSummaryFromDb = async function(id) {
            if (!window.currentUser) return;
            
            try {
                await remove(ref(database, 'users/' + window.currentUser.uid + '/summaries/' + id));
            } catch (error) {
                console.error('Error deleting summary:', error);
                alert('Failed to delete summary. Please check your connection.');
            }
        }
        
        // Motivational quotes
        window.quotes = [
            { text: "Courage is not the absence of fear, but rather the assessment that something else is more important than fear.", author: "Franklin D. Roosevelt" },
            { text: "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.", author: "Eleanor Roosevelt" },
            { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
            { text: "Everything you want is on the other side of fear.", author: "Jack Canfield" },
            { text: "Fear is only as deep as the mind allows.", author: "Japanese Proverb" },
            { text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne" },
            { text: "The only way out is through.", author: "Robert Frost" },
            { text: "Feel the fear and do it anyway.", author: "Susan Jeffers" },
            { text: "Anxiety is the dizziness of freedom.", author: "Søren Kierkegaard" },
            { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
            { text: "Every small step forward is a victory worth celebrating.", author: "Anonymous" },
            { text: "Healing takes courage, and we all have courage, even if we have to dig a little to find it.", author: "Tori Amos" }
        ];
// Non-module scripts
        
        // Convert 24h time to 12h AM/PM format
        function formatTime12Hour(time24) {
            if (!time24) return '';
            const [hours, minutes] = time24.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
        }

        // Helper function to parse YYYY-MM-DD string as local time
        function parseDateString(dateStr) {
            if (!dateStr) return null;
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        
        // Format date string (YYYY-MM-DD) to display format
        function formatDate(dateStr) {
            if (!dateStr) return '';
            const date = parseDateString(dateStr);
            if (!date) return '';
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
        }
        
        // Check if weekly reminder should be shown
        function checkWeeklyReminder() {
            const now = new Date();
            const dayOfWeek = now.getDay();
            const hour = now.getHours();
            
            if (dayOfWeek === 0 && hour >= 21) {
                const thisWeekStart = new Date(now);
                thisWeekStart.setDate(now.getDate() - dayOfWeek);
                thisWeekStart.setHours(0, 0, 0, 0);
                
                const hasThisWeekSummary = window.summaries.some(summary => {
                    const summaryDate = parseDateString(summary.weekOf);
                    return summaryDate >= thisWeekStart;
                });
                
                if (!hasThisWeekSummary) {
                    document.getElementById('weeklyNotification').style.display = 'block';
                    const mobileNotification = document.getElementById('mobileWeeklyNotification');
                    if (mobileNotification) mobileNotification.style.display = 'block';
                } else {
                    document.getElementById('weeklyNotification').style.display = 'none';
                    const mobileNotification = document.getElementById('mobileWeeklyNotification');
                    if (mobileNotification) mobileNotification.style.display = 'none';
                }
            } else {
                document.getElementById('weeklyNotification').style.display = 'none';
                const mobileNotification = document.getElementById('mobileWeeklyNotification');
                if (mobileNotification) mobileNotification.style.display = 'none';
            }
        }
        
        // Get week bounds
        function getWeekBounds(date) {
            const d = parseDateString(date);
            const day = d.getDay();
            const diff = d.getDate() - day;
            const sunday = new Date(d.setDate(diff));
            const saturday = new Date(d.setDate(diff + 6));
            
            sunday.setHours(0, 0, 0, 0);
            saturday.setHours(23, 59, 59, 999);
            
            return { start: sunday, end: saturday };
        }
        
        // Update exposure count
        function updateExposureCount() {
            const weekOfDate = document.getElementById('weekOf').value;
            if (!weekOfDate) return;
            
            const { start, end } = getWeekBounds(weekOfDate);
            
            const exposuresInWeek = window.exposures.filter(exposure => {
                const exposureDate = parseDateString(exposure.date);
                return exposureDate >= start && exposureDate <= end;
            });
            
            document.getElementById('numExposures').value = exposuresInWeek.length;
        }
        
        // Generate reference number
        function generateReferenceNumber(date = null) {
            const refDate = date ? parseDateString(date) : parseDateString(document.getElementById('exposureDate').value);
            const year = refDate.getFullYear().toString().slice(-2);
            const month = (refDate.getMonth() + 1).toString().padStart(2, '0');
            const day = refDate.getDate().toString().padStart(2, '0');
            
            const dateStr = `${refDate.getFullYear()}-${month}-${day}`;
            const existingCount = window.exposures.filter(exp => exp.date === dateStr).length;
            const exposureNum = (existingCount + 1).toString().padStart(3, '0');
            
            return `EXP-${year}${month}${day}-${exposureNum}`;
        }
        
        // Update reference preview
        function updateReferencePreview() {
            const dateInput = document.getElementById('exposureDate').value;
            if (dateInput) {
                const refNumber = generateReferenceNumber(dateInput);
                document.getElementById('refNumberDisplay').textContent = refNumber;
            } else {
                document.getElementById('refNumberDisplay').textContent = '-';
            }
        }
        
        // Update motivational quote
        function updateMotivationalQuote() {
            const randomQuote = window.quotes[Math.floor(Math.random() * window.quotes.length)];
            document.getElementById('quoteText').textContent = `"${randomQuote.text}"`;
            document.getElementById('quoteAuthor').textContent = `- ${randomQuote.author}`;
        }
        
        // Tab switching
        function showSection(sectionName, isMobile = false) {
            // Update mobile nav buttons
            if(isMobile){
                document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
                event.target.closest('.mobile-nav-item').classList.add('active');
            }
            
            // Update desktop tabs to match
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.textContent.toLowerCase().includes(sectionName.substring(0, 4))) {
                    tab.classList.add('active');
                }
            });
            
            // Show the section
            document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
            document.getElementById(sectionName).classList.add('active');
            
            // Scroll to top on mobile
            if(isMobile){
                window.scrollTo(0, 0);
            }
            
            if (sectionName === 'summary') {
                checkWeeklyReminder();
                const now = new Date();
                if (now.getDay() === 0 && now.getHours() >= 21) {
                    document.getElementById('weekReminder').style.display = 'block';
                }
            }
        }
        
        // Goals functionality
        function renderGoals() {
            const goalsGrid = document.getElementById('goalsGrid');
            goalsGrid.textContent = '';
            
            for (let i = 0; i < 10; i++) {
                const goalCard = document.createElement('div');
                goalCard.className = 'goal-card';
                goalCard.setAttribute('data-number', i + 1);
                goalCard.innerHTML = `
                    <h3 style="margin-bottom: 10px;">Goal #${i + 1}</h3>
                    <input type="text" 
                           class="goal-input" 
                           placeholder="Enter your goal..."
                           value="${window.goals[i] || ''}"
                           onchange="updateGoal(${i}, this.value)">
                `;
                goalsGrid.appendChild(goalCard);
            }
        }
        
        function updateGoal(index, value) {
            window.goals[index] = value;
            window.saveGoals();
        }
        
        // Exposure functionality
        function setupSliders() {
            const anticipatedSlider = document.getElementById('anticipatedAnxiety');
            const anticipatedValue = document.getElementById('anticipatedValue');
            anticipatedSlider.oninput = function() {
                anticipatedValue.textContent = this.value;
            };
            
            const peakSlider = document.getElementById('peakAnxiety');
            const peakValue = document.getElementById('peakValue');
            peakSlider.oninput = function() {
                peakValue.textContent = this.value;
            };
            
            const confidenceSlider = document.getElementById('confidenceRating');
            const confidenceValue = document.getElementById('confidenceValue');
            confidenceSlider.oninput = function() {
                confidenceValue.textContent = this.value;
            };
        }
        
        function addExposure() {
            // Get the date value directly from the input (YYYY-MM-DD format)
            const dateValue = document.getElementById('exposureDate').value;
            
            const exposure = {
                date: dateValue, // Store the date string directly without conversion
                time: document.getElementById('exposureTime').value,
                situation: document.getElementById('exposureSituation').value,
                anticipatedAnxiety: document.getElementById('anticipatedAnxiety').value,
                peakAnxiety: document.getElementById('peakAnxiety').value,
                duration: document.getElementById('duration').value,
                fearWillHappen: document.getElementById('fearWillHappen').value,
                whatActuallyHappened: document.getElementById('whatActuallyHappened').value,
                notes: document.getElementById('notes').value,
                graphAdded: document.getElementById('graphAdded').checked,
                id: window.editingExposureId || null,
                referenceNumber: window.editingExposureId ? 
                    window.exposures.find(e => e.id === window.editingExposureId).referenceNumber : 
                    document.getElementById('refNumberDisplay').textContent
            };
            
            if (!exposure.date || !exposure.situation || !exposure.duration || !exposure.time) {
                alert('Please fill in at least the date, time, situation, and duration fields.');
                return;
            }
            
            window.saveExposure(exposure);
            
            if (window.editingExposureId) {
                window.editingExposureId = null;
                document.getElementById('submitBtn').textContent = 'Add Exposure Entry';
                document.getElementById('cancelEditBtn').style.display = 'none';
            }
            
            clearForm();
            updateReferencePreview();
        }
        
        function clearForm() {
            const today = new Date();
            const dateStr = today.getFullYear() + '-' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(today.getDate()).padStart(2, '0');
            document.getElementById('exposureDate').value = dateStr;
            document.getElementById('exposureSituation').value = '';
            document.getElementById('exposureTime').value = '';
            document.getElementById('anticipatedAnxiety').value = 5;
            document.getElementById('anticipatedValue').textContent = '5.0';
            document.getElementById('peakAnxiety').value = 5;
            document.getElementById('peakValue').textContent = '5.0';
            document.getElementById('duration').value = '';
            document.getElementById('fearWillHappen').value = '';
            document.getElementById('whatActuallyHappened').value = '';
            document.getElementById('notes').value = '';
            document.getElementById('graphAdded').checked = false;
        }
        
        function editExposure(id) {
            const exposure = window.exposures.find(e => e.id === id);
            if (!exposure) return;
            
            window.editingExposureId = id;
            
            document.getElementById('exposureDate').value = exposure.date;
            document.getElementById('exposureTime').value = exposure.time;
            document.getElementById('exposureSituation').value = exposure.situation;
            document.getElementById('anticipatedAnxiety').value = exposure.anticipatedAnxiety;
            document.getElementById('anticipatedValue').textContent = exposure.anticipatedAnxiety;
            document.getElementById('peakAnxiety').value = exposure.peakAnxiety;
            document.getElementById('peakValue').textContent = exposure.peakAnxiety;
            document.getElementById('duration').value = exposure.duration;
            document.getElementById('fearWillHappen').value = exposure.fearWillHappen || '';
            document.getElementById('whatActuallyHappened').value = exposure.whatActuallyHappened || '';
            document.getElementById('notes').value = exposure.notes || '';
            document.getElementById('graphAdded').checked = exposure.graphAdded || false;
            
            document.getElementById('refNumberDisplay').textContent = exposure.referenceNumber;
            
            document.getElementById('submitBtn').textContent = 'Update Exposure Entry';
            document.getElementById('cancelEditBtn').style.display = 'inline-block';
            
            document.querySelector('.exposure-form').scrollIntoView({ behavior: 'smooth' });
        }
        
        function cancelEdit() {
            window.editingExposureId = null;
            document.getElementById('submitBtn').textContent = 'Add Exposure Entry';
            document.getElementById('cancelEditBtn').style.display = 'none';
            clearForm();
            updateReferencePreview();
        }
        
        function renderExposures() {
            const searchContainer = document.getElementById('searchFilterContainer');
            
            if (window.exposures.length === 0) {
                searchContainer.style.display = 'none';
                document.getElementById('exposuresContainer').textContent = '<p style="color: #718096;">No exposures logged yet. Start tracking your progress!</p>';
                return;
            }
            
            searchContainer.style.display = 'flex';
            filteredExposures = window.exposures;
            renderFilteredExposures();
        }
        
        function deleteExposure(id) {
            if (confirm('Are you sure you want to delete this exposure?')) {
                window.deleteExposureFromDb(id);
            }
        }
        
        // Weekly Summary functionality
        function addWeeklySummary() {
            const summary = {
                weekOf: document.getElementById('weekOf').value,
                numExposures: document.getElementById('numExposures').value,
                difficultExposure: document.getElementById('difficultExposure').value,
                confidenceRating: document.getElementById('confidenceRating').value,
                learnings: document.getElementById('weeklyLearnings').value
            };
            
            if (!summary.weekOf || !summary.difficultExposure) {
                alert('Please fill in at least the week and most difficult exposure.');
                return;
            }
            
            window.saveSummary(summary);
            
            document.getElementById('weekOf').value = '';
            document.getElementById('numExposures').value = '';
            document.getElementById('difficultExposure').value = '';
            document.getElementById('confidenceRating').value = 5;
            document.getElementById('confidenceValue').textContent = '5.0';
            document.getElementById('weeklyLearnings').value = '';
            
            document.getElementById('weekReminder').style.display = 'none';
        }
        
        function renderSummaries() {
            const summariesList = document.getElementById('summariesList');
            
            if (window.summaries.length === 0) {
                summariesList.textContent = '<p style="color: #718096;">No weekly summaries yet. Complete your first week to add a summary!</p>';
                return;
            }
            
            summariesList.innerHTML = '<h3 style="color: #4a5568; margin-bottom: 20px;">Your Weekly Progress</h3>';
            
            window.summaries.forEach(summary => {
                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                summaryItem.innerHTML = `
                    <div class="summary-header">
                        Week of ${formatDate(summary.weekOf)}
                        <button onclick="deleteSummary('${summary.id}')" style="float: right; background: rgba(255,255,255,0.3); color: white; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer;">Delete</button>
                    </div>
                    <div>
                        <span class="summary-stat">${summary.numExposures} Exposures</span>
                        <span class="summary-stat">Confidence: ${summary.confidenceRating}/10</span>
                    </div>
                    <p style="margin-top: 15px;"><strong>Most Challenging:</strong> ${summary.difficultExposure}</p>
                    ${summary.learnings ? `<p style="margin-top: 10px;"><strong>Key Learnings:</strong> ${summary.learnings}</p>` : ''}
                `;
                summariesList.appendChild(summaryItem);
            });
        }
        
        function deleteSummary(id) {
            if (confirm('Are you sure you want to delete this weekly summary?')) {
                window.deleteSummaryFromDb(id);
            }
        }
        
        // Export functionality
        function showExportOptions() {
            // Create a mobile-friendly modal instead of using prompt
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
            `;
            
            const modalContent = document.createElement('div');
            modalContent.style.cssText = `
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            `;
            
            modalContent.innerHTML = `
                <h3 style="color: #5a67d8; margin-bottom: 20px; text-align: center;">Export Your Data</h3>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button onclick="exportToCSV(); document.body.removeChild(document.body.lastElementChild);" 
                            style="padding: 15px; background: #48bb78; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;">
                        📊 Export to CSV (Excel)
                    </button>
                    <button onclick="exportToJSON(); document.body.removeChild(document.body.lastElementChild);" 
                            style="padding: 15px; background: #5a67d8; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;">
                        💾 Export to JSON (Backup)
                    </button>
                    <button onclick="exportToPDF(); document.body.removeChild(document.body.lastElementChild);" 
                            style="padding: 15px; background: #9f7aea; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;">
                        📄 Export to PDF (Print)
                    </button>
                    <button onclick="document.body.removeChild(document.body.lastElementChild);" 
                            style="padding: 15px; background: #718096; color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;">
                        Cancel
                    </button>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            });
        }
        
        function exportToCSV() {
            let csv = 'Date,Time,Situation,Anticipated Anxiety,Peak Anxiety,Duration,Fear Expected,What Happened,Notes,Reference Number,Graph Added\n';
            
            window.exposures.forEach(exp => {
                const row = [
                    exp.date,
                    exp.time || '',
                    `"${exp.situation.replace(/"/g, '""')}"`,
                    exp.anticipatedAnxiety,
                    exp.peakAnxiety,
                    `"${exp.duration.replace(/"/g, '""')}"`,
                    `"${(exp.fearWillHappen || '').replace(/"/g, '""')}"`,
                    `"${(exp.whatActuallyHappened || '').replace(/"/g, '""')}"`,
                    `"${(exp.notes || '').replace(/"/g, '""')}"`,
                    exp.referenceNumber || '',
                    exp.graphAdded ? 'Yes' : 'No'
                ].join(',');
                csv += row + '\n';
            });
            
            // Add summary data
            csv += '\n\nWeekly Summaries\n';
            csv += 'Week Of,Number of Exposures,Most Difficult,Confidence Rating,Learnings\n';
            
            window.summaries.forEach(sum => {
                const row = [
                    sum.weekOf,
                    sum.numExposures,
                    `"${sum.difficultExposure.replace(/"/g, '""')}"`,
                    sum.confidenceRating,
                    `"${(sum.learnings || '').replace(/"/g, '""')}"`
                ].join(',');
                csv += row + '\n';
            });
            
            downloadFile(csv, 'exposure-therapy-data.csv', 'text/csv');
        }
        
        function exportToJSON() {
            const data = {
                exportDate: new Date().toISOString(),
                user: {
                    name: window.currentUser?.displayName || 'Unknown',
                    email: window.currentUser?.email || 'Unknown'
                },
                goals: window.goals,
                exposures: window.exposures,
                summaries: window.summaries
            };
            
            const json = JSON.stringify(data, null, 2);
            downloadFile(json, 'exposure-therapy-backup.json', 'application/json');
        }
        
        function exportToPDF() {
            // Create a printable HTML version
            let html = `
                <html>
                <head>
                    <title>Exposure Therapy Progress Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1, h2 { color: #5a67d8; }
                        .exposure { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
                        .goal { margin: 10px 0; padding: 10px; background: #f7fafc; }
                        @media print { .exposure { page-break-inside: avoid; } }
                    </style>
                </head>
                <body>
                    <h1>Exposure Therapy Progress Report</h1>
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                    
                    <h2>Life Goals</h2>
            `;
            
            window.goals.forEach((goal, i) => {
                if (goal) {
                    html += `<div class="goal">${i + 1}. ${goal}</div>`;
                }
            });
            
            html += '<h2>Exposure History</h2>';
            
            window.exposures.forEach(exp => {
                html += `
                    <div class="exposure">
                        <strong>Date:</strong> ${formatDate(exp.date)} at ${formatTime12Hour(exp.time)}<br>
                        <strong>Situation:</strong> ${exp.situation}<br>
                        <strong>Peak Anxiety:</strong> ${exp.peakAnxiety}/10<br>
                        <strong>Duration:</strong> ${exp.duration}<br>
                        ${exp.fearWillHappen ? `<strong>Fear:</strong> ${exp.fearWillHappen}<br>` : ''}
                        ${exp.whatActuallyHappened ? `<strong>Reality:</strong> ${exp.whatActuallyHappened}<br>` : ''}
                        ${exp.notes ? `<strong>Notes:</strong> ${exp.notes}<br>` : ''}
                    </div>
                `;
            });
            
            html += '</body></html>';
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
        }
        
        function downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        // Search and filter functionality
        let filteredExposures = [];
        
        function filterExposures() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const anxietyLevel = document.getElementById('anxietyFilter').value;
            const dateRange = document.getElementById('dateFilter').value;
            
            filteredExposures = window.exposures.filter(exposure => {
                // Search filter
                const searchMatch = !searchTerm || 
                    exposure.situation.toLowerCase().includes(searchTerm) ||
                    (exposure.notes && exposure.notes.toLowerCase().includes(searchTerm)) ||
                    (exposure.fearWillHappen && exposure.fearWillHappen.toLowerCase().includes(searchTerm)) ||
                    (exposure.whatActuallyHappened && exposure.whatActuallyHappened.toLowerCase().includes(searchTerm));
                
                // Anxiety level filter
                let anxietyMatch = true;
                if (anxietyLevel) {
                    const peakAnxiety = parseFloat(exposure.peakAnxiety);
                    if (anxietyLevel === 'low') anxietyMatch = peakAnxiety <= 3;
                    else if (anxietyLevel === 'medium') anxietyMatch = peakAnxiety > 3 && peakAnxiety <= 6;
                    else if (anxietyLevel === 'high') anxietyMatch = peakAnxiety > 6;
                }
                
                // Date filter
                let dateMatch = true;
                if (dateRange) {
                    const exposureDate = parseDateString(exposure.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    if (dateRange === 'today') {
                        dateMatch = exposureDate.toDateString() === today.toDateString();
                    } else if (dateRange === 'week') {
                        const weekAgo = new Date(today);
                        weekAgo.setDate(today.getDate() - 7);
                        dateMatch = exposureDate >= weekAgo;
                    } else if (dateRange === 'month') {
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(today.getMonth() - 1);
                        dateMatch = exposureDate >= monthAgo;
                    } else if (dateRange === '3months') {
                        const threeMonthsAgo = new Date(today);
                        threeMonthsAgo.setMonth(today.getMonth() - 3);
                        dateMatch = exposureDate >= threeMonthsAgo;
                    }
                }
                
                return searchMatch && anxietyMatch && dateMatch;
            });
            
            renderFilteredExposures();
        }
        
        function clearFilters() {
            document.getElementById('searchInput').value = '';
            document.getElementById('anxietyFilter').value = '';
            document.getElementById('dateFilter').value = '';
            filteredExposures = window.exposures;
            renderFilteredExposures();
        }
        
        function renderFilteredExposures() {
            const container = document.getElementById('exposuresContainer');
            const resultsCount = document.getElementById('resultsCount');
            
            if (filteredExposures.length === 0) {
                container.textContent = '<p style="color: #718096;">No exposures match your filters.</p>';
                resultsCount.textContent = 'No results found';
                return;
            }
            
            resultsCount.textContent = `Showing ${filteredExposures.length} of ${window.exposures.length} exposures`;
            
            container.textContent = '';
            filteredExposures.forEach(exposure => {
                const anxietyClass = exposure.peakAnxiety <= 3 ? 'anxiety-low' : 
                                   exposure.peakAnxiety <= 6 ? 'anxiety-medium' : 'anxiety-high';
                
                const exposureItem = document.createElement('div');
                exposureItem.className = 'exposure-item';
                exposureItem.innerHTML = `
                    <div class="exposure-header">
                        <span class="exposure-date">${formatDate(exposure.date)} at ${formatTime12Hour(exposure.time)}</span>
                        <div>
                            <span class="anxiety-badge ${anxietyClass}">Peak: ${exposure.peakAnxiety}/10</span>
                            <button onclick="editExposure('${exposure.id}')" class="btn btn-edit" style="margin-left: 10px;">Edit</button>
                            <button onclick="deleteExposure('${exposure.id}')" style="margin-left: 10px; background: #e53e3e; color: white; border: none; padding: 5px 15px; border-radius: 20px; cursor: pointer;">Delete</button>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="color: #2d3748; margin: 0;">${exposure.situation} <span style="background: #edf2f7; color: #4a5568; padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">${exposure.referenceNumber || 'No Ref #'}</span></h4>
                        
                    </div>
                    <p style="margin-bottom: 10px; color: #4a5568;"><strong>Anticipated Anxiety:</strong> ${exposure.anticipatedAnxiety}/10</p>
                    <p style="margin-bottom: 10px; color: #4a5568;"><strong>Duration:</strong> ${exposure.duration}</p>
                    ${exposure.fearWillHappen ? `<p style="margin-bottom: 10px; color: #4a5568;"><strong>What I Feared Would Happen:</strong> ${exposure.fearWillHappen}</p>` : ''}
                    ${exposure.whatActuallyHappened ? `<p style="margin-bottom: 10px; color: #4a5568;"><strong>What Actually Happened:</strong> ${exposure.whatActuallyHappened}</p>` : ''}
                    ${exposure.notes ? `<p style="margin-bottom: 10px; color: #4a5568;"><strong>Notes:</strong> ${exposure.notes}</p>` : ''}
                    ${exposure.graphAdded ? '<p style="color: #48bb78; font-weight: bold;">✓ Graph added to physical workbook</p>' : ''}
                `;
                container.appendChild(exposureItem);
            });
        }