const tephra = require('tephra')

let server
let sockets

module.exports = exports = new EventEmitter()

exports.start = function() {
	server = new tephra()
	
	sockets = Object.values(server.SOCKETS)
	
	for (socket of sockets) {
		socket.done = false
		socket.failed = false
		socket.closed = true
		
		socket.on('listening', (e) => {
			socket.done = true
			socket.closed = false
			if (sockets.every(s => s.done))
				if (sockets.some(s => s.failed))
					closeAll()
				else
					exports.emit("start")
		})
		
		socket.on('error', (e) => {
			socket.done = true
			socket.failed = true
			if (sockets.every(s => s.done))
				closeAll()
		})
		
		socket.on('close', (e) => {
			socket.closed = true
			if (sockets.every(s => s.closed))
				exports.emit("stop")
		})
	}
	
	function closeAll() {
		server.unbind()
	}
	
	server.bind()
}

exports.stop = function() {
	server.unbind()
}