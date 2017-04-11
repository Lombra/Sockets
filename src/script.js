const fs = require("fs")

const modules = require("./modules")

function loadModule(module) {
	window.location.assign("#" + module)
}

window.onload = function() {
	let menu = document.getElementById("main-menu")
	modules.forEach(module => {
		let item = document.createElement("li")
		let link = document.createElement("a")
		let status2 = document.createElement("i")
		status2.classList.add("fa")
		status2.classList.add("fa-square")
		link.appendChild(status2)
		let label = document.createElement("span")
		label.textContent = module.label
		link.appendChild(label)
		link.href = "#" + module.module
		item.appendChild(link)
		menu.appendChild(item)
		
		let content = document.getElementById("main-content")
		
		let modulePanel = document.createElement("div")
		modulePanel.id = module.module
		content.appendChild(modulePanel)
		
		let header = document.createElement("header")
		modulePanel.appendChild(header)
		
		let title = document.createElement("h1")
		title.textContent = module.label
		header.appendChild(title)
		
		let start = document.createElement("button")
		start.innerHTML = "<i class='fa fa-play'></i>"
		header.appendChild(start)
		
		// let stop = document.createElement("button")
		// stop.innerHTML = "<i class='fa fa-stop'></i>"
		// header.appendChild(stop)
		
		let status = document.createElement("span")
		status.textContent = "Service is stopped"
		header.appendChild(status)
		
		let moduleContent = document.createElement("div")
		moduleContent.innerHTML = fs.readFileSync(__dirname + "/modules/" + module.module+ ".html")
		modulePanel.appendChild(moduleContent)
		
		if (fs.existsSync(__dirname + "/modules/" + module.module+ ".js")) {
			let m = require("./modules/" + module.module)
			start.onclick = m.start
			stop.onclick = m.stop
			m.on("start", () => {
				start.disabled = true
				// stop.disabled = false
				status.textContent = "Service is running"
				status2.classList.add("started")
			})
			// m.on("stop", () => {
				// start.disabled = false
				// stop.disabled = true
				// status.textContent = "Service is stopped"
			// })
			m.on("portused", (port) => {
				start.disabled = false
				status.textContent = `Service is stopped. Unable to bind port ${port}.`
			})
		}
	})
	loadModule(modules[0].module)
}

window.onhashchange = function(event) {
	document.querySelectorAll("nav a").forEach(e => {
		// console.log(e.href, window.location.hash)
		if (e.getAttribute("href") == window.location.hash) {
			e.parentElement.classList.add("active")
		} else {
			e.parentElement.classList.remove("active")
		}
	})
}