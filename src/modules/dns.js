const EventEmitter = require("events")
const dns = require("native-dns")

const server = dns.createServer()

const types = dns.consts.NAME_TO_QTYPE

// var definedTypes = [
  // 'A',
  // 'AAAA',
  // 'NS',
  // 'CNAME',
  // 'PTR',
  // 'NAPTR',
  // 'TXT',
  // 'MX',
  // 'SRV',
  // 'SOA',
  // 'TLSA',
// ]

let options = {
	fallback: "none",
	server: "8.8.8.8",
}

let records1 = []

function resolveCName(domain, type) {
	let matches = records1.filter(record => record.domain == domain && (record.type == type || record.type == types['CNAME']))
	if (matches.length > 0 && matches[0].type == types['CNAME']) {
		return resolveCName(matches[0].target, type)
	}
	return [matches, matches.length > 0 && matches[0].target || domain]
}

server.on('request', (request, response) => {
	// requests never include more than one question in practice, so just use first one
	let question = request.question[0]
	
	let [matches, newDomain] = resolveCName(question.name, question.type)
	
	if (matches.length > 0) {
		matches.forEach(record => {
			let packet = dns[dns.consts.QTYPE_TO_NAME[record.type]]
			if (packet) {
				response.answer.push(packet({
					name: record.domain,
					address: record.target,
					ttl: 600,
				}))
			}
		})
	}
	
	if (matches.length > 0 || options.fallback == "none") {
		response.send()
	} else {
		lookup(newDomain, question.type, response)
	}
})

server.on('error', (err, buff, req, res) => {
	console.log(err.stack)
})



function addRecord(domain, type, target) {
	let records = document.querySelector("#dns-records tbody")
	let row = records.insertRow()
	
	let cell = row.insertCell()
	cell.textContent = domain
	
	cell = row.insertCell()
	cell.textContent = dns.consts.QTYPE_TO_NAME[type]
	
	cell = row.insertCell()
	cell.textContent = target
	
	cell = row.insertCell()
	let remove = document.createElement("button")
	cell.appendChild(remove)
	
	let icon = document.createElement("i")
	icon.classList.add("fa")
	icon.classList.add("fa-times")
	remove.appendChild(icon)
	
	remove.addEventListener("click", (e) => {
		console.log(row.rowIndex)
		records.deleteRow(row.rowIndex - 1)
		records1.splice(records1.findIndex((e) => e.domain == domain && e.type == type && e.target == target), 1)
	})
	
	records1.push({'domain': domain, 'type': type, 'target': target})
}

function editRecord(domain, type, target) {
	// records1.push({'domain': domain, 'type': type, 'target': target})
	let records = document.getElementById("dns-records-body")
	let row = document.createElement("tr")
	
	let cell = document.createElement("td")
	let box = document.createElement("input")
	box.type = "text"
	cell.appendChild(box)
	row.appendChild(cell)
	
	cell = document.createElement("td")
	box = document.createElement("input")
	box.type = "text"
	cell.appendChild(box)
	row.appendChild(cell)
	
	cell = document.createElement("td")
	box = document.createElement("input")
	box.type = "text"
	cell.appendChild(box)
	row.appendChild(cell)
	
	records.appendChild(row)
}

function lookup(domain, type, res) {
	let question = dns.Question({
		name: domain,
		type: type,
	})
	
	let req = dns.Request({
		question: question,
		server: options.server,
		timeout: 1000,
	})
	
	req.on('timeout', () => {
		console.log("Request timed out")
	})
	
	req.on('message', (err, answer) => {
		res.answer = answer.answer
		res.send()
	})
	
	req.send()
}

document.addEventListener("change", (event) => {
	if (event.target.name != "dns-fallback") return
	let radios = document.getElementsByName("dns-fallback")
	options.fallback = event.target.value
	radios.forEach(e => {
		if (e.dataset.enables) {
			let enables = document.getElementById(e.dataset.enables)
			enables.disabled = !(e == event.target)
		}
	})
})

document.getElementById("dns").addEventListener("input", (e) => {
	let setting = e.target.dataset.option
	if (setting) {
		let value = e.target.value
		options[setting] = value
	}
})

let btn = document.getElementById("add-dns-record")

btn.onclick = function() {
	let domain = document.getElementById("dns-add-record-domain")
	let type = document.getElementById("dns-add-record-type")
	let target = document.getElementById("dns-add-record-target")
	if (!(domain.value && type.value && target.value)) return
	addRecord(domain.value, types[type.value], target.value)
	domain.value = ""
	type.value = ""
	target.value = ""
}

function init() {
	document.getElementById("dns-fallback-none").checked = true
	document.getElementById("dns-external").value = options.server
	
	// addRecord("google.com", types["A"], "10.0.0.1")
}

init()

module.exports = exports = new EventEmitter()

exports.start = function() {
	server.serve(53)
}

// exports.stop = function() {
	// s.close()
// }

server.on("listening", () => {
	console.log("DNS start")
	exports.emit("start")
})

server.on("close", () => {
	console.log("DNS stop")
	exports.emit("stop")
})

server.on("socketError", (e) => {
	console.dir(e)
	if (e.code == "EADDRINUSE") {
		exports.emit("portused", e.port)
	}
})
