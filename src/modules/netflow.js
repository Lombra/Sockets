const Collector = require('node-netflowv9')

let statistics = {}

Collector(function(flow) {
	console.log(flow)
	flow.flows.forEach(flow => {
		if (!statistics[flow.protocol]) {
			statistics[flow.protocol] = {
				in_bytes: 0,
				out_bytes: 0,
			}
		}
		statistics[flow.protocol].in_bytes += (flow.in_bytes || 0)
		statistics[flow.protocol].out_bytes += (flow.out_bytes || 0)
	})
	let records = document.getElementById("netflow-flows")
	records.innerHTML = ""
	
	Object.keys(statistics).forEach(protocol => {
		let flow = statistics[protocol]
		let row = document.createElement("tr")
		
		let cell = document.createElement("td")
		cell.textContent = protocol
		row.appendChild(cell)
		
		cell = document.createElement("td")
		cell.textContent = flow.in_bytes
		row.appendChild(cell)
		
		cell = document.createElement("td")
		cell.textContent = flow.out_bytes
		row.appendChild(cell)
		
		records.appendChild(row)
	})
}).listen(2055)
