function notify(str) {
    document.querySelector("notification").textContent = str;
}


async function updateBadExpressionValue(target) {
    if (!confirm("Update value?")) {
        return;
    }
    const expressionIdx = target.getAttribute('data-expression-idx');
    await fetch(`/bad_strings/${expressionIdx}?value=${target.value}`.replaceAll('+', '%2B'));
}

function updateBadExpressionTestResult(target) {
    const test = target.value;
    const expressionIdx = target.getAttribute('data-expression-idx');
    const badExpressionInput = document.querySelector(`.bad-expression-value[data-expression-idx="${expressionIdx}"]`);
    const badExpression = new RegExp(badExpressionInput.value, 'i');
    const result = badExpression.test(test);
    target.classList.remove("fail");
    target.classList.remove("pass");
    target.classList.add(result ? "pass" : "fail");
}

function toggleIterationLog(idx) {
    const iterationLog = document.querySelector(`#iteration-log-"${idx}"`);
    if (iterationLog.classList.contains("hide")) {
        iterationLog.classList.add("hide");
    } else {
        iterationLog.classList.remove("hide");
    }
}

document.addEventListener("input", async (event) => {
    if (event.target.classList.contains('bad-expression-test')) {
        updateBadExpressionTestResult(event.target);
    }
});

document.addEventListener("change", async (event) => {
    if (event.target.classList.contains('bad-expression-test')) {
        return;
    }
    if (event.target.classList.contains('bad-expression-value')) {
        updateBadExpressionValue(event.target);
        return;
    }
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
}

async function unwantedUser(userLogin) {
    await fetch(`/users/${userLogin}/unwanted`);
    document.querySelector(`tr[data-user-login="${userLogin}"]`).remove();
}

async function unwantedBadString(idx) {
    await fetch(`/bad_strings/${idx}/unwanted`);
    document.querySelector(`tr[data-expression-idx="${idx}"]`).remove();
}

function deleteDiscarded(id) {
    // TODO
}