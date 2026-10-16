export function confirmAction(message, title = "Konfirmasi") {
  return new Promise(resolve => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("section");
    modal.className = "modal";
    const heading = document.createElement("h2");
    heading.textContent = title;
    const body = document.createElement("p");
    body.textContent = message;
    const actions = document.createElement("div");
    actions.className = "modal-actions";
    const cancel = document.createElement("button");
    cancel.className = "btn btn-outline";
    cancel.textContent = "Batal";
    const accept = document.createElement("button");
    accept.className = "btn btn-danger";
    accept.textContent = "Ya, lanjutkan";
    actions.append(cancel, accept);
    modal.append(heading, body, actions);
    backdrop.append(modal);
    document.body.append(backdrop);
    const finish = result => { backdrop.remove(); resolve(result); };
    cancel.addEventListener("click", () => finish(false));
    accept.addEventListener("click", () => finish(true));
    backdrop.addEventListener("click", event => { if (event.target === backdrop) finish(false); });
    accept.focus();
  });
}
