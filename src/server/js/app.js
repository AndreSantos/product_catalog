function notify(str) {
    document.querySelector("notification").textContent = str;
}

document.addEventListener("change", async (event) => {
    const target = event.target;
    const set = target.getAttribute('data-set');
    const newPrice = target.value;
    await fetch(`/item/${set}/price/${newPrice ?? '_'}`);
});

async function startJob() {
    await fetch(`/run_job_now`);   
    document.querySelector(".job-status-placeholder").innerHTML = "Job running...";
}

async function deleteItem(setId, itemId) {
    await fetch(`/item/${itemId}/unwanted`);
    document.querySelector(`li[data-item-id="${itemId}"]`).remove();
}

async function unwantedSet(setId) {
    await fetch(`/set/${setId}/unwanted`);
    document.querySelector(`tr[data-set-id="${setId}"]`).remove();
    // location.reload();
}

function deleteDiscarded(id) {
    // TODO
}