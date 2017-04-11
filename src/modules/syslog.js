const dgram = require('dgram')
const EventEmitter = require("events")

const SEVERITY = [
	'emerg',
	'alert',
	'crit',
	'err',
	'warning',
	'notice',
	'info',
	'debug',
]

const FACILITY = [
	'kern',
	'user',
	'mail',
	'daemon',
	'auth',
	'syslog',
	'lpr',
	'news',
	'uucp',
	'cron',
	'authpriv',
	'ftp',
	'ntp',
	'logaudit',
	'logalert',
	'clock',
	'local0',
	'local1',
	'local2',
	'local3',
	'local4',
	'local5',
	'local6',
	'local7',
]

let log = []

let socket = dgram.createSocket('udp4')
socket.on('message', function(msg, rinfo) {
	console.log(msg.toString())
	
	msg = msg.toString()
	
	let prioBegin = msg.indexOf("<") + 1,
		prioEnd = msg.indexOf(">")
	
	let prio = msg.slice(prioBegin, prioEnd)
	console.log(prio)
	prio = parseInt(prio)
	console.log(prio)
	
	addMessage(rinfo.address, FACILITY[prio >> 3], SEVERITY[prio & 7], msg.slice(prioEnd + 1))
})

function addMessage(source, facility, severity, message) {
	let leases = document.querySelector("#syslog-log tbody")

	let row = document.createElement("tr")

	let cell = document.createElement("td")
	cell.textContent = source
	row.appendChild(cell)

	cell = document.createElement("td")
	cell.textContent = facility
	row.appendChild(cell)

	cell = document.createElement("td")
	cell.textContent = severity
	row.appendChild(cell)

	cell = document.createElement("td")
	cell.textContent = message
	row.appendChild(cell)

	leases.appendChild(row)
}

// addMessage("172.16.0.102", FACILITY[189 >> 3], SEVERITY[189 & 7], "30: Router: *Mar 6 2017 15:50:26.471: %LINEPROTO-5-UPDOWN: Line protocol on Interface Loopback0, changed state to up")

module.exports = exports = new EventEmitter()

exports.start = function() {
	socket.bind(514)
}

exports.stop = function() {
	socket.close()
}

socket.on("listening", () => {
	console.log("Syslog start")
	exports.emit("start")
})

socket.on("close", () => {
	console.log("Syslog stop")
})

socket.on("error", (e) => {
	console.dir(e)
	if (e.code == "EADDRINUSE") {
		exports.emit("portused", e.port)
	}
})
