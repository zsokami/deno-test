async function loadApp(el) {
  el.innerHTML = await (await fetch(el.dataset.src)).text()
}

loadApp(document.querySelector('#app'))
