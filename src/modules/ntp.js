const dgram = require("dgram")
const dns = require("dns")
const ip = require("ip")
const EventEmitter = require("events")

var client_pool = []
var time_server_ip = ''
var prev_checktime = 0
var ttl = 10000

let server = dgram.createSocket("udp4")

// Unix epoch is set 70 years after that of NTP, including 17 leap years
const UNIX_OFFSET = (70 * 365 + 17) * 86400

const NTP_MODE_CLIENT = 3
const NTP_MODE_SERVER = 4

function unixToNTP(time) {
	return [Math.floor(time / 1000) + UNIX_OFFSET, time % 1000 * 2 ** 32 / 1000]
}

function ntpToUnix(time) {
}

let options = {
	timeSource: "local",
	server: "pool.ntp.org",
}

server.on("message", (msg, rinfo) => {
	let mode = msg.readUInt8(0)
	if (options.timeSource == "local" && mode & NTP_MODE_CLIENT) {
		msg.writeUInt16BE(0x1c02, 0)
		
		msg.writeUInt32BE(1, 4) // root delay
		msg.writeUInt32BE(0, 8) // root dispersion
		msg.writeUInt32BE(ip.toLong(ip.address()), 12) // reference ID
		
		let time = new Date()
		let [ntpSec, ntpFrac] = unixToNTP(time)
		
		msg.writeUInt32BE(msg.readUInt32BE(16), 16) // reference timestamp
		msg.writeUInt32BE(msg.readUInt32BE(40), 24) // origin timestamp
		msg.writeUInt32BE(msg.readUInt32BE(44), 28)
		msg.writeUInt32BE(ntpSec, 32) // receive timestamp
		msg.writeUInt32BE(ntpFrac, 36)
		msg.writeUInt32BE(ntpSec, 40) // transmit timestamp
		msg.writeUInt32BE(ntpFrac, 44)
		
		server.send(msg, 0, msg.length, rinfo.port, rinfo.address, (err, bytes) => {
			if (err) throw err
		})
	} else if (options.timeSource == "external") {
		let serverMessageHandler = function() {
			// console.log(["  message from ", rinfo.address, ":", rinfo.port].join(''));
			// time sync request from client
			if (mode & NTP_MODE_CLIENT) {
				client_pool.push({
					address: rinfo.address,
					port: rinfo.port
				})
				server.send(msg, 0, msg.length, 123, time_server_ip, (err, bytes) => {
					if (err) throw err
					// console.log('  ask to sent to ' + time_server_domain);
				})
			} else {
				let time_standard = msg.readUInt32BE(32)
				msg.writeUInt32BE(time_standard, msg.length - 16) // receive timestamp
				msg.writeUInt32BE(time_standard, msg.length - 8) // transmit timestamp
				while (client_pool.length != 0) {
					(function(to_ip, to_port) {
						server.send(msg, 0, msg.length, to_port, to_ip, (err, bytes) => {
							if (err) throw err;
							// console.log(new Date());
							// console.log('  response to ' + to_ip + ':' + to_port);
						});
					})(client_pool[0].address, client_pool[0].port)
					
					client_pool.splice(0, 1)
				}
			}
		}
		if (prev_checktime + ttl < (new Date()).getTime()) { // TTL 3 hours
			console.log('\n\nTTL Expired '+prev_checktime+' '+(new Date()).getTime()+'. Relookup ' + options.server)
			dns.lookup(options.server, 4, function(err, ip, ipv) {
				if (err) {
					console.log('Error in DNS Lookup')
					console.log(err)
					return
				}
				time_server_ip = ip
				prev_checktime = (new Date()).getTime()
				console.log('Prev Checktime is '+prev_checktime)
				console.log('Got ip address: '+ ip)
				serverMessageHandler()
			});
		} else {
			serverMessageHandler()
		}
	}
})

document.addEventListener("change", (event) => {
	if (event.target.name != "time-source") return
	let radios = document.getElementsByName("time-source")
	options.timeSource = event.target.value
	radios.forEach(e => {
		if (e.dataset.enables) {
			let enables = document.getElementById(e.dataset.enables)
			enables.disabled = !(e == event.target)
		}
	})
})

document.getElementById("ntp").addEventListener("input", (e) => {
	let setting = e.target.dataset.option
	if (setting) {
		let value = e.target.value
		options[setting] = value
	}
})

function init() {
	document.getElementById("ntp-use-system").checked = true
	document.getElementById("ntp-server").value = options.server
}

init()

module.exports = exports = new EventEmitter()

exports.start = function() {
	server.bind(123)
}

exports.stop = function() {
	server.close()
}

server.on("listening", () => {
	console.log("NTP start")
	exports.emit("start")
})

server.on("close", () => {
	console.log("NTP stop")
	exports.emit("stop")
})

server.on("error", (err) => {
	console.dir(err)
	if (err.code == "EADDRINUSE") {
		exports.emit("portused", err.port)
	}
})
