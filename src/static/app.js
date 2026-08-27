document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function clearActivitySelect() {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.detail || `Failed to load activities (${response.status})`);
      }

      const activities = payload;

      // Clear loading message
      activitiesList.innerHTML = "";
      clearActivitySelect();

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const escapeHtml = (value) =>
          String(value).replace(/[&<>"']/g, (ch) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])
          );
        const participantsMarkup = details.participants.length
          ? details.participants
              .map(
                (participant) => {
                  const safeParticipant = escapeHtml(participant);
                  const safeName = escapeHtml(name);
                  return `
                  <li class="participant-item">
                    <span class="participant-email">${safeParticipant}</span>
                    <button
                      type="button"
                      class="participant-remove"
                      aria-label="Unregister ${safeParticipant} from ${safeName}"
                      title="Unregister participant"
                      data-activity="${safeName}"
                      data-email="${safeParticipant}"
                    >&times;</button>
                  </li>
                `;
                }
              )
              .join("")
          : '<li class="empty-state">No participants yet</li>';

        activityCard.innerHTML = `
          <div class="activity-card__header">
            <h4>${name}</h4>
            <span class="availability-badge ${spotsLeft > 0 ? "open" : "full"}">${spotsLeft} spots left</span>
          </div>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-title">Participants</p>
            <ul class="participants-list">
              ${participantsMarkup}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      activitiesList.querySelectorAll(".participant-remove").forEach((button) => {
        button.addEventListener("click", async () => {
          const activity = button.dataset.activity;
          const email = button.dataset.email;

          try {
            const response = await fetch(
              `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
              {
                method: "DELETE",
              }
            );

            const result = await response.json();

            if (response.ok) {
              showMessage(result.message, "success");
              await fetchActivities();
            } else {
              showMessage(result.detail || "An error occurred", "error");
            }
          } catch (error) {
            showMessage("Failed to unregister participant. Please try again.", "error");
            console.error("Error unregistering participant:", error);
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
