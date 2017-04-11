const ip = require("ip")
const EventEmitter = require("events")

let {Server, BOOTMessageType, DHCPOptions} = require("dhcp-mon")

let options = {
	rangeStart: "192.168.0.101",
	rangeEnd: "192.168.0.199",
	mask: "255.255.255.0",
	defaultGateway: "192.168.0.1",
	dnsServer: "192.168.0.1",
	leaseTime: 1440,
}


let ips = {}

function getAvailableAddress() {
	for (let i = ip.toLong(options.rangeStart); i < ip.toLong(options.rangeEnd); i++) {
		if (!(i in ips)) {
			return ip.fromLong(i)
		}
	}
}
 
function onDiscover(e) {
	console.log("DISCOVER", e.packet)
	console.log(e.packet.find(DHCPOptions["AddressRequest"]).value)
	
	let pkt = e.packet
	
	// TODO: offer suggested address if within range
	
	// Get IP by MAC 
	let ip = "0.0.0.0"
	if (pkt.op === BOOTMessageType.request) {
		if (!(pkt.chaddr in ips))
			ip = ips[pkt.chaddr] = getAvailableAddress()
		else
			ip = ips[pkt.chaddr]
	}
	
	let offer = server.createOffer(pkt)
	
	offer.yiaddr = ip
	
	server.send(offer)
}

function onRequest(e) {
	console.log("REQUEST", e.packet)
	console.log(e.packet.find(DHCPOptions["AddressRequest"]).value)
	
	// TODO: offer requested address if within range
	
	// TODO: ignore requests not targeting our server ID, release reserved address
	
	// TODO: decline request if requested address allocated
	
	let ack = server.createAck(e.packet)

	ack.yiaddr = ips[e.packet.chaddr]
	
	console.log(ack)

	server.send(ack)
}

function onDecline(e) {
	// TODO: release lease
}

function onRelease(e) {
	console.log("RELEASE")
	delete ips[e.packet.chaddr]
}

function onListening() {
	console.log("DHCP start")
	exports.emit("start")
}

function onClose() {
	console.log("DHCP stop")
	exports.emit("stop")
}

function onError(e) {
	console.dir(e)
	if (e.code == "EADDRINUSE") {
		exports.emit("portused", e.port)
	}
}

let leases = []

function addLease(ipAddr, macAddr, hostname) {
	let leases2 = document.querySelector("#dhcp-leases tbody")

	let row = leases2.insertRow()

	let cell = row.insertCell()
	cell.textContent = macAddr

	cell = row.insertCell()
	cell.textContent = ipAddr

	cell = row.insertCell()
	cell.textContent = hostname

	cell = row.insertCell()
	let remove = document.createElement("button")
	cell.appendChild(remove)
	
	let icon = document.createElement("i")
	icon.classList.add("fa")
	icon.classList.add("fa-times")
	remove.appendChild(icon)
	
	// remove.onclick = (e) => {
	remove.addEventListener("click", (e) => {
		console.log(row.rowIndex)
		// console.log(leases2.rows)
		leases2.deleteRow(row.rowIndex - 1)
	})
	
	leases.push({
		ip: ipAddr,
		mac: macAddr,
		host: hostname,
	})
}

let server = new Server({})

document.getElementById("dhcp").addEventListener("input", (e) => {
	if (e.target.classList.contains("ip-addr")) {
		if (ip.isV4Format(e.target.value)) {
			e.target.classList.remove("invalid")
		} else {
			e.target.classList.add("invalid")
		}
	}
	let setting = e.target.dataset.option
	if (setting) {
		let value = e.target.value
		options[setting] = value
	}
	
	server.netmask = options.mask
	server.gateways = [options.defaultGateway]
	server.domainServer = [options.dnsServer]
	server.addressTime = options.leaseTime * 60
})

module.exports = exports = new EventEmitter()

exports.start = function() {
	// server = new Server({})
	
	server.on("discover", onDiscover)
	server.on("request", onRequest)
	server.on("release", onRelease)
	server.on("listening", onListening)
	server.on("close", onClose)
	server.on("error", onError)
	
	server.bind()
	
	server.serverId = ip.address()
	server.netmask = options.mask
	server.gateways = [options.defaultGateway]
	server.domainServer = [options.dnsServer]
	server.addressTime = options.leaseTime * 60
}

// exports.stop = function() {
	// s.close()
// }

function init() {
	document.getElementById("dhcp-address-start").value = options.rangeStart
	document.getElementById("dhcp-address-end").value = options.rangeEnd
	document.getElementById("dhcp-netmask").value = options.mask
	document.getElementById("dhcp-default-gateway").value = options.defaultGateway
	document.getElementById("dhcp-dns-server").value = options.dnsServer
	document.getElementById("dhcp-lease-time").value = options.leaseTime
	
	// addLease("192.168.0.25", "8c:89:a5:c1:33:89", "PC-A")
	// addLease("10.0.0.1", "8c:89:a5:c1:33:89", "PC-A")
	// addLease("8.8.8.8", "8c:89:a5:c1:33:89", "PC-A")
}

init()
