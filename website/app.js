const examples = {
  customers: {
    prompt: "I’m building a healthcare startup. Help me find doctors who might need a better way to manage appointments.",
    response: "I’ve set your audience to healthcare customers. I can search public web pages for potential matches—then you can review each source before deciding what to do next.",
    firstResult: "Public search results",
    firstDescription: "Linked sources to explore and verify",
    secondResult: "People in your industry",
    secondDescription: "Only what’s publicly available"
  },
  talent: {
    prompt: "We’re ready to grow. Help me find a marketing person who knows the healthcare industry.",
    response: "I’ve switched your audience to healthcare marketing talent. I can search public web pages for people with relevant experience—then you can review their work and background yourself.",
    firstResult: "Public search results",
    firstDescription: "Profiles and work to explore",
    secondResult: "Healthcare marketing talent",
    secondDescription: "A starting point for your search"
  }
};

const selectors = {
  prompt: document.querySelector("#example-prompt"),
  response: document.querySelector("#example-response"),
  firstResult: document.querySelector("#example-result .result-line:nth-child(2) strong"),
  firstDescription: document.querySelector("#example-result .result-line:nth-child(2) small"),
  secondResult: document.querySelector("#example-result .result-line:last-child strong"),
  secondDescription: document.querySelector("#example-result .result-line:last-child small")
};

for (const button of document.querySelectorAll(".switch-option")) {
  button.addEventListener("click", () => {
    const example = examples[button.dataset.goal];
    if (!example) return;

    for (const option of document.querySelectorAll(".switch-option")) {
      const selected = option === button;
      option.classList.toggle("is-active", selected);
      option.setAttribute("aria-pressed", String(selected));
    }

    for (const [key, selector] of Object.entries(selectors)) {
      selector.textContent = example[key];
    }
  });
}
