import '../definition'

const app = document.querySelector('#app')
if (app) {
  window.onload = () => osc().out()
  app.innerHTML = `<hydra-element></hydra-element>`
}