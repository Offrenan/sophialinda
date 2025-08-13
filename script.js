/* Frontend logic: save to localStorage, update progress, call backend to save transcript and trigger download */
const BACKEND_ENDPOINT = "http://localhost:5000/api/complete_week"; // ajuste se necessário

document.addEventListener("DOMContentLoaded", () => {
  const itemNodes = Array.from(document.querySelectorAll("[data-task-id]"));
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const statusMsg = document.getElementById("status-msg");
  const downloadBtn = document.getElementById("download-transcript");
  const modal = document.getElementById("modal");
  const modalDownload = document.getElementById("modal-download");
  const modalClose = document.getElementById("modal-close");

  // restore saved
  itemNodes.forEach(li => {
    const id = li.dataset.taskId;
    const cb = li.querySelector("input[type='checkbox']");
    const saved = localStorage.getItem(`task-${id}`);
    if (saved === "true") {
      cb.checked = true; li.classList.add("completed");
    }
    cb.addEventListener("change", () => onToggle(li, id, cb));
  });

  function onToggle(li, id, cb) {
    if (cb.checked) {
      localStorage.setItem(`task-${id}`, "true");
      li.classList.add("completed");
      localStorage.setItem(`task-${id}-ts`, new Date().toISOString());
    } else {
      localStorage.setItem(`task-${id}`, "false");
      li.classList.remove("completed");
      localStorage.removeItem(`task-${id}-ts`);
    }
    updateProgress();
    if (isWeekComplete()) {
      showModal();
    }
  }

  function updateProgress() {
    const total = itemNodes.length;
    const done = itemNodes.filter(li => li.querySelector("input[type='checkbox']").checked).length;
    const pct = Math.round((done/total)*100);
    progressBar.style.width = pct + "%";
    progressText.textContent = pct + "%";
    document.getElementById("progress-wrap").setAttribute("aria-valuenow", pct);
  }

  function isWeekComplete() {
    return itemNodes.every(li => li.querySelector("input[type='checkbox']").checked);
  }

  function buildTranscript() {
    const tasks = itemNodes.map(li => {
      const id = li.dataset.taskId;
      const label = li.textContent.trim().replace(/\s+/g," ");
      const checked = li.querySelector("input[type='checkbox']").checked;
      const completedAt = localStorage.getItem(`task-${id}-ts`) || null;
      return { id, label, checked, completedAt };
    });
    const now = new Date().toISOString();
    return { generatedAt: now, totalTasks: tasks.length, tasks };
  }

  async function onWeekComplete() {
    statusMsg.textContent = "Salvando resumo semanal...";
    const transcript = buildTranscript();
    try {
      const res = await fetch(BACKEND_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ transcript })
      });
      if (!res.ok) throw new Error("backend error");
      const json = await res.json();
      if (json.download_url) {
        // automatic download: create full url based on backend host
        const base = (new URL(BACKEND_ENDPOINT)).origin;
        const dl = base + json.download_url;
        window.location.href = dl; // inicia download
        statusMsg.textContent = "Resumo salvo. O download deve iniciar em breve.";
      } else {
        statusMsg.textContent = "Resumo salvo, mas download não disponível.";
      }
    } catch (err) {
      console.error(err);
      // fallback: download client-side
      downloadJSON(buildTranscript());
      statusMsg.textContent = "Offline: resumo baixado localmente.";
    }
  }

  function downloadJSON(obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-week-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Modal controls
  function showModal() {
    modal.setAttribute("aria-hidden","false");
    modal.style.display = "flex";
  }
  function hideModal() {
    modal.setAttribute("aria-hidden","true");
    modal.style.display = "none";
  }
  modalDownload.addEventListener("click", () => {
    hideModal();
    onWeekComplete();
  });
  modalClose.addEventListener("click", () => { hideModal(); });

  // manual download button
  downloadBtn.addEventListener("click", () => {
    downloadJSON(buildTranscript());
    statusMsg.textContent = "Resumo gerado e baixado (manual).";
  });

  // init
  updateProgress();
});
