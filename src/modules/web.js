const ipc = require('electron').ipcRenderer
const os = require('os')
const connect = require('connect')
const serveStatic = require('serve-static')
const EventEmitter = require("events")
const http = require('http')

let options = {
	root: os.homedir(),
}

let viewModel = {
	webRoot: ko.observable(options.root),
}

let root

ipc.on('selected-directory', (event, [path]) => {
	viewModel.webRoot(path)
	root = serveStatic(path)
})

let app = connect()

app.use((req, res, next) => {
	return root(req, res, next)
})

let btn = document.getElementById("select-root")

btn.onclick = function() {
	ipc.send('open-file-dialog')
}

function init() {
	ko.applyBindings(viewModel)
	root = serveStatic(options.root)
}

init()

module.exports = exports = new EventEmitter()

function onListening() {
	exports.emit("start")
}

function onClose() {
	exports.emit("stop")
}

function onError(e) {
	console.dir(e)
	if (e.code == "EADDRINUSE") {
		exports.emit("portused", e.port)
	}
}

let server

exports.start = function() {
	server = http.createServer(app)
	
	server.on("listening", onListening)
	server.on("close", onClose)
	server.on("error", onError)
	
	server.listen(80)
}

exports.stop = function() {
	server.close()
}
