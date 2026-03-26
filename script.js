document.addEventListener("DOMContentLoaded", () => {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector(".hamburger");
    const navLinks = document.querySelector(".nav-links");

    hamburger.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });

    // Close mobile nav when clicking a link
    document.querySelectorAll(".nav-links li a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
        });
    });

    // --- SOS Button Logic ---
    const sosBtn = document.getElementById("sos-btn");
    const alertSound = document.getElementById("alert-sound");
    const modalOverlay = document.getElementById("custom-modal");
    const closeModalBtn = document.getElementById("close-modal");
    
    // Trigger SOS actions on click
    sosBtn.addEventListener("click", () => {
        // 1. Play Alert Sound
        // Note: Browsers may block audio if not interacted with properly. 
        // We reset the current time to allow rapid triggering.
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.warn("Audio playback issue:", e));
        
        // 2. Send emergency alert message (Simulated using JavaScript alert as required)
        // Set a slight timeout to ensure the main thread can trigger the sound before blocking alert happens.
        setTimeout(() => {
            alert("EMERGENCY! SMS Alert Sent to your saved contacts.");
            
            // 3. Fetch Location and Show Popup
            fetchLocation();
        }, 100);
    });

    // Close Custom Modal
    closeModalBtn.addEventListener("click", () => {
        modalOverlay.classList.remove("active");
    });

    // Function to render the custom modal
    function showModal(title, desc, isError = false) {
        document.getElementById("modal-title").innerText = title;
        document.getElementById("modal-desc").innerText = desc;
        
        const iconDiv = document.getElementById("modal-icon-container");
        if (isError) {
            iconDiv.innerHTML = '<i class="fa-solid fa-circle-xmark error-icon"></i>';
        } else {
            iconDiv.innerHTML = '<i class="fa-solid fa-circle-check success-icon"></i>';
        }
        
        modalOverlay.classList.add("active");
    }

    // --- Geolocation API Logic ---
    function fetchLocation() {
        const locationDetails = document.getElementById("location-details");
        locationDetails.innerHTML = "<p>Fetching your live location...</p>";

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Display coordinates and Google Maps link
                    const mapLink = `https://www.google.com/maps?q=${lat},${lng}`;
                    locationDetails.innerHTML = `
                        <p style="font-size: 1.1rem; margin-bottom: 0.5rem;"><strong>Latitude:</strong> ${lat.toFixed(6)}</p>
                        <p style="font-size: 1.1rem; margin-bottom: 1rem;"><strong>Longitude:</strong> ${lng.toFixed(6)}</p>
                        <a href="${mapLink}" target="_blank" class="maps-link">
                            <i class="fa-solid fa-map"></i> View on Google Maps
                        </a>
                    `;

                    const smsBody = `EMERGENCY! Please help me. My live location: ${mapLink}`;
                    const smsRecipients = contacts.map(c => c.phone).join(',');

                    if (smsRecipients.length > 0) {
                        const smsUrl = `sms:${smsRecipients}?body=${encodeURIComponent(smsBody)}`;
                        window.location.href = smsUrl;
                    }

                    // Show confirmation popup modal
                    showModal("Emergency Alert Sent!", "Your emergency alert and live location have been recorded and sent.");
                },
                (error) => {
                    let msg = "An unknown error occurred.";
                    if(error.code === 1) msg = "User denied Geolocation access.";
                    else if(error.code === 2) msg = "Position unavailable. Network or GPS is down.";
                    else if(error.code === 3) msg = "Location request timed out.";
                    
                    locationDetails.innerHTML = `<p style="color:var(--primary); font-weight: 600;">Error fetching location: ${msg}</p>`;
                    showModal("Location Error", msg, true);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            const errorMsg = "Geolocation is not supported by your browser.";
            locationDetails.innerHTML = `<p style="color:var(--primary); font-weight: 600;">${errorMsg}</p>`;
            showModal("Not Supported", errorMsg, true);
        }
    }

    // --- Emergency Contacts Management ---
    const contactForm = document.getElementById("contact-form");
    const contactsList = document.getElementById("contacts-list");

    // Load contacts from local storage or initialize empty array
    let contacts = JSON.parse(localStorage.getItem("safeHerContacts")) || [];

    // Function to display contacts in the DOM list
    function renderContacts() {
        contactsList.innerHTML = "";
        
        if (contacts.length === 0) {
            contactsList.innerHTML = "<p style='color: var(--gray); text-align: center; padding: 2rem 1rem;'>No saved contacts yet. Add your trusted contacts above.</p>";
            return;
        }

        contacts.forEach((contact, index) => {
            const li = document.createElement("li");
            li.className = "contact-item";
            li.innerHTML = `
                <div class="contact-info">
                    <strong>${contact.name}</strong>
                    <span>${contact.phone}</span>
                </div>
                <button class="delete-btn" onclick="deleteContact(${index})" title="Delete Contact">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
            contactsList.appendChild(li);
        });
    }

    // Handle Add Contact form submission
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const nameInput = document.getElementById("contact-name").value.trim();
        const phoneInput = document.getElementById("contact-phone").value.trim();

        // Form Validation logic
        if (nameInput.length > 0 && phoneInput.length >= 10) {
            // Add to array
            contacts.push({ name: nameInput, phone: phoneInput });
            
            // Save to LocalStorage
            localStorage.setItem("safeHerContacts", JSON.stringify(contacts));
            
            // Clear form and re-render
            contactForm.reset();
            renderContacts();
        } else {
            alert("Please provide a valid name and phone number (min 10 digits).");
        }
    });

    // Expose deleteContact globally for inline onclick
    window.deleteContact = function(index) {
        if(confirm("Are you sure you want to delete this contact?")) {
            contacts.splice(index, 1);
            localStorage.setItem("safeHerContacts", JSON.stringify(contacts));
            renderContacts();
        }
    };

    // Initial render of saved contacts on page load
    renderContacts();
});
